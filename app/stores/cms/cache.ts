import { CMS_BATCH_MAX_URL, CMS_BATCH_WINDOW_MS, CMS_CACHE_FRESH_MS, CMS_CACHE_MAX_ENTRIES, CMS_CACHE_STALE_MS } from './const'
import type { CmsCacheEntry, CmsFetcher, CmsParams } from './types'

// Pure Fabrication: every block asks the CMS for its own data, and this layer makes that cheap. Four levels, outermost first:
//   1. useAsyncData with a key from the query and its params: the SSR payload hydrates the client, equal keys share one ref
//   2. the instance cache: answers live in the process (or the tab) with a fresh and a stale window, served stale while revalidating
//   3. in-flight dedupe: the same query asked twice before the answer comes is one request
//   4. the batcher: different queries asked in the same tick go out as one GROQ object, { "q0": (...), "q1": (...) }

interface Pending {
    query: string
    params: CmsParams
    resolve: (value: unknown) => void
    reject: (reason: unknown) => void
}

interface State {
    entries: Map<string, CmsCacheEntry>
    inflight: Map<string, Promise<unknown>>
    queue: Pending[]
    timer?: ReturnType<typeof setTimeout>
    fetcher?: CmsFetcher
}

const state: State = ((globalThis as { __cmsCache?: State }).__cmsCache ??= { entries: new Map(), inflight: new Map(), queue: [] })

function rewrite(query: string, rename?: (name: string) => string): string {
    let result = ''
    let quote: string | undefined
    for (let index = 0; index < query.length; index++) {
        const char = query[index]!
        if (quote) {
            result += char
            if (char === '\\') result += query[++index] ?? ''
            else if (char === quote) quote = undefined
            continue
        }
        if (char === '"' || char === '\'') {
            quote = char
            result += char
        } else if (/\s/.test(char)) {
            if (!result.endsWith(' ')) result += ' '
        } else if (char === '$' && rename) {
            const name = /^[A-Za-z_]\w*/.exec(query.slice(index + 1))?.[0]
            if (!name) { result += char; continue }
            result += `$${rename(name)}`
            index += name.length
        } else result += char
    }
    return result.trim()
}

function stable(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
    if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable((value as CmsParams)[key])}`).join(',')}}`
    return JSON.stringify(value) ?? 'null'
}

function hash(text: string): string {
    let a = 0xdeadbeef
    let b = 0x41c6ce57
    for (let index = 0; index < text.length; index++) {
        const code = text.charCodeAt(index)
        a = Math.imul(a ^ code, 2654435761)
        b = Math.imul(b ^ code, 1597334677)
    }
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909)
    b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909)
    return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36)
}

export function normalize(query: string): string {
    return rewrite(query)
}

export function key(query: string, params: CmsParams): string {
    return `cms:${hash(`${query}\0${stable(params)}`)}`
}

function combine(items: Pending[]): { query: string, params: CmsParams } {
    const params: CmsParams = {}
    const shared = new Map<string, string>()
    for (const item of items) for (const [name, value] of Object.entries(item.params)) {
        const known = shared.get(name)
        shared.set(name, known === undefined || known === stable(value) ? stable(value) : '\0conflict')
    }
    const fields = items.map((item, index) => {
        const query = rewrite(item.query, (name) => {
            if (!(name in item.params)) return name
            const value = item.params[name]
            const alias = shared.get(name) === stable(value) ? name : `q${index}_${name}`
            params[alias] = value
            return alias
        })
        return `"q${index}": (${query})`
    })
    return { query: `{ ${fields.join(', ')} }`, params }
}

function size(items: Pending[]): number {
    const { query, params } = combine(items)
    return encodeURIComponent(query).length + encodeURIComponent(JSON.stringify(params)).length
}

async function send(fetcher: CmsFetcher, items: Pending[]): Promise<void> {
    if (items.length === 1) {
        const [item] = items as [Pending]
        return fetcher(item.query, item.params).then(item.resolve, item.reject)
    }
    try {
        const { query, params } = combine(items)
        const result = await fetcher<Record<string, unknown>>(query, params)
        items.forEach((item, index) => item.resolve(result?.[`q${index}`]))
    } catch {
        await Promise.all(items.map((item) => fetcher(item.query, item.params).then(item.resolve, item.reject)))
    }
}

function flush(): void {
    const queue = state.queue.splice(0)
    const fetcher = state.fetcher
    state.timer = undefined
    if (!fetcher || !queue.length) return
    const chunks: Pending[][] = [[]]
    for (const item of queue) {
        const chunk = chunks.at(-1)!
        if (chunk.length && size([...chunk, item]) > CMS_BATCH_MAX_URL) chunks.push([item])
        else chunk.push(item)
    }
    for (const chunk of chunks) send(fetcher, chunk)
}

function enqueue<T>(fetcher: CmsFetcher, query: string, params: CmsParams): Promise<T> {
    state.fetcher = fetcher
    state.timer ??= setTimeout(flush, CMS_BATCH_WINDOW_MS)
    return new Promise<T>((resolve, reject) => state.queue.push({ query, params, resolve: resolve as (value: unknown) => void, reject }))
}

function clean(value: unknown): unknown {
    if (value === null) return undefined
    if (Array.isArray(value)) return value.map(clean)
    if (typeof value === 'object') return Object.fromEntries(Object.entries(value as CmsParams).filter(([, item]) => item !== null).map(([key, item]) => [key, clean(item)]))
    return value
}

function remember(id: string, value: unknown): void {
    const now = Date.now()
    state.entries.delete(id)
    state.entries.set(id, { value, fresh: now + CMS_CACHE_FRESH_MS, stale: now + CMS_CACHE_FRESH_MS + CMS_CACHE_STALE_MS })
    if (state.entries.size <= CMS_CACHE_MAX_ENTRIES) return
    for (const [entry, { stale }] of state.entries) if (stale <= now) state.entries.delete(entry)
    for (const entry of state.entries.keys()) {
        if (state.entries.size <= CMS_CACHE_MAX_ENTRIES) break
        state.entries.delete(entry)
    }
}

function load<T>(fetcher: CmsFetcher, id: string, query: string, params: CmsParams): Promise<T> {
    const running = state.inflight.get(id)
    if (running) return running as Promise<T>
    const request = enqueue<T>(fetcher, query, params)
        .then((value) => { const result = clean(value) as T; remember(id, result); return result })
        .finally(() => state.inflight.delete(id))
    state.inflight.set(id, request)
    return request
}

export function request<T>(fetcher: CmsFetcher, query: string, params: CmsParams, options?: { cache?: boolean }): Promise<T> {
    const id = key(query, params)
    const entry = options?.cache === false ? undefined : state.entries.get(id)
    const now = Date.now()
    if (entry && entry.fresh > now) {
        state.entries.delete(id)
        state.entries.set(id, entry)
        return Promise.resolve(entry.value as T)
    }
    if (entry && entry.stale > now) {
        load(fetcher, id, query, params).catch(() => undefined)
        return Promise.resolve(entry.value as T)
    }
    return load<T>(fetcher, id, query, params)
}

export function invalidate(filter?: (id: string) => boolean): void {
    for (const id of state.entries.keys()) if (!filter || filter(id)) state.entries.delete(id)
}
