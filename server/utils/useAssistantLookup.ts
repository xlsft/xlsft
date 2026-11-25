const RESULT_LIMIT = 6_000

/** Обрезает JSON-ответ до лимита символов, сохраняя признак обрезки для модели. */
const capped = (value: unknown) => {
    const json = JSON.stringify(value) ?? 'null'
    return json.length <= RESULT_LIMIT ? { result: value } : { result: json.slice(0, RESULT_LIMIT), truncated: true, note: 'Result truncated: project fewer fields or add a slice like [0...5].' }
}

/** Схема CMS для подсказки модели: типы, поля и локализованные поля (field[$locale]). */
export const CMS_SCHEMA = [
    'summary { title*, description*, status*, content* (markdown "about") }',
    'experience { id, name*, about* (markdown), aboutShort*, link, logo, positions[] { name*, description* (markdown, full duties), descriptionShort*, duration { from, to }, skills[]->name, footer* } }',
    'project { id, name*, description* (markdown), about* (markdown, full story), status*, repo, tags[], links[], stack[]->name, related[]->id, priority, copyright }',
    'skill { name, type (frontend/backend/devops/database/state/testing), priority }',
    'education { id, level*, name*, faculty*, specialization*, year, link }',
    'link { id, label*, short, to }',
].join('; ')

const runGroqQuery = async (locale: string, query: string, params: Record<string, string | number | boolean> = {}): Promise<{ result: unknown, truncated?: boolean, note?: string } | { error: string, message: string }> => {
    try {
        const result = await useClarity().fetch<unknown>(query, { ...params, locale }, { signal: AbortSignal.timeout(8_000) })
        return capped(result)
    } catch (error: any) {
        // текст ошибки парсера GROQ помогает модели исправить запрос со второй попытки
        return { error: 'query_failed', message: String([error?.data?.message, error?.message].find(Boolean) ?? error).slice(0, 400) }
    }
}

// ─── веб-поиск ─────────────────────────────────────────────────────────────────


// не больше 8 поисков в час на сессию и 120 на процесс — поиск дорогой и не должен зацикливаться
const searchBuckets = ((globalThis as any).__assistantSearchBuckets ??= new Map<string, { count: number, resetAt: number }>()) as Map<string, { count: number, resetAt: number }>
const allowSearch = (session: string) => {
    const now = Date.now()
    for (const key of ['*', session]) {
        const bucket = searchBuckets.get(key)
        if (!bucket || bucket.resetAt <= now) searchBuckets.set(key, { count: 1, resetAt: now + 3_600_000 })
        else if (++bucket.count > (key === '*' ? 120 : 8)) return false
    }
    return true
}

const clip = (value: string, length: number) => value.length > length ? `${value.slice(0, length).trimEnd()}…` : value

const fetchSearch = defineCachedFunction(async (query: string, locale: string) => {
    const base = useRuntimeConfig().searxng.url
    const response = await $fetch<{ results?: { title?: string, url?: string, content?: string, engine?: string }[] }>(`${base.replace(/\/$/, '')}/search`, {
        query: { q: query, format: 'json', language: locale, safesearch: 1 },
        timeout: 10_000
    })
    const seen = new Set<string>()
    const results = (response.results ?? [])
        .filter(item => item.url && item.title && !seen.has(item.url) && seen.add(item.url))
        .slice(0, 6)
        .map(item => ({ title: clip(item.title!, 120), url: item.url!, snippet: clip((item.content ?? '').replace(/\s+/g, ' ').trim(), 320) }))
    // пустую выдачу (поисковики упали по таймауту) не кэшируем: undefined Nitro не сохраняет
    return results.length ? results : undefined
}, { maxAge: 3600, group: 'chat', name: 'web-search', getKey: (query: string, locale: string) => `${locale}:${query.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 120)}` })

export type WebSearchResult = { error: string } | {
    block: string
    shown: boolean
    query: string
    results: { title: string, url: string, snippet: string }[]
    note?: string
}

const runWebSearch = async (session: string, locale: string, query: string): Promise<WebSearchResult> => {
    if (!useRuntimeConfig().searxng.url.length) return { error: 'unavailable' }
    if (!allowSearch(session)) return { error: 'rate_limited' }
    try {
        const results = await fetchSearch(query, locale)
        if (!results?.length) return { block: 'sources', shown: false, query, results: [], note: 'No web results. Say the search found nothing and answer only from DATA.' }
        return { block: 'sources', shown: true, query, results }
    } catch {
        return { error: 'unavailable' }
    }
}

export interface Lookup {
    groq: (query: string, params?: Record<string, string | number | boolean>) => ReturnType<typeof runGroqQuery>
    web: (query: string) => Promise<WebSearchResult>
}

export const useLookup = (locale: string, session: string): Lookup => ({
    groq: (query, params) => runGroqQuery(locale, query, params),
    web: (query) => runWebSearch(session, locale, query),
})
