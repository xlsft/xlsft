import type { H3Event } from 'h3'

type CachedPayload = { body: unknown, contentType: string }
type Entry = CachedPayload & { expiresAt: number }
type Serialized = { base64: string, contentType: string, expiresAt: number }

// горячий кэш воркера + дедупликация параллельных промахов
const memory = ((globalThis as any).__binaryCache ??= new Map<string, Entry>()) as Map<string, Entry>
const inflight = ((globalThis as any).__binaryInflight ??= new Map<string, Promise<CachedPayload>>()) as Map<string, Promise<CachedPayload>>

const toBase64 = async (body: any): Promise<string> => {
    if (typeof body === 'string') return Buffer.from(body, 'utf8').toString('base64')
    if (body instanceof Blob) return Buffer.from(await body.arrayBuffer()).toString('base64')
    return Buffer.from(body).toString('base64')
}

/**
 * Кэш для бинарных ответов (docx, png) с SWR-семантикой по maxAge.
 * nitro defineCachedEventHandler JSON-сериализует тело и ломает Blob/Buffer,
 * поэтому тела храним в base64 через useStorage: при настроенном REDIS_URL
 * кэш общий для всех воркеров и переживает рестарты, иначе — in-memory на воркер.
 * Поверх — быстрый Map на воркер и дедупликация параллельных рендеров.
 */
export const defineCachedBinaryHandler = (
    handler: (event: H3Event) => Promise<unknown>,
    options: {
        maxAge: number,
        getKey: (event: H3Event) => string
    }
) => defineEventHandler(async (event) => {
    const key = options.getKey(event)
    const now = Date.now()

    const hit = memory.get(key)
    if (hit && hit.expiresAt > now) {
        setHeader(event, 'Content-Type', hit.contentType)
        return hit.body
    }

    const pending = inflight.get(key)
    if (pending) {
        // параллельный промах: ждём уже идущий рендер вместо запуска нового
        const cached = await pending
        setHeader(event, 'Content-Type', cached.contentType)
        return cached.body
    }

    const storage = useStorage('cache:binary')
    const stored = await storage.getItem<Serialized>(key).catch(() => null)
    if (stored && stored.expiresAt > now) {
        const body = Buffer.from(stored.base64, 'base64')
        memory.set(key, { body, contentType: stored.contentType, expiresAt: stored.expiresAt })
        setHeader(event, 'Content-Type', stored.contentType)
        return body
    }

    const promise = handler(event).then((body) => ({
        body,
        contentType: String(getResponseHeader(event, 'content-type') || 'application/octet-stream')
    }))
    inflight.set(key, promise)

    try {
        const cached = await promise
        const expiresAt = Date.now() + options.maxAge * 1000

        if (memory.size > 500) {
            for (const [k, v] of memory) if (v.expiresAt <= now) memory.delete(k)
        }

        memory.set(key, { ...cached, expiresAt })
        await storage.setItem(key, {
            base64: await toBase64(cached.body),
            contentType: cached.contentType,
            expiresAt
        } satisfies Serialized, { ttl: options.maxAge }).catch(() => {})

        setHeader(event, 'Content-Type', cached.contentType)
        return cached.body
    } catch (error) {
        memory.delete(key)
        throw error
    } finally {
        inflight.delete(key)
    }
})
