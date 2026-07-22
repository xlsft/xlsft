import type { H3Event } from 'h3'

type Bucket = { count: number, resetAt: number }

const stores = (globalThis as any).__rateLimit ??= new Map<string, Bucket>()

/**
 * Простой in-memory rate limiter (token bucket по IP, на воркер).
 * Бросает 429 при превышении лимита.
 */
export const useRateLimit = (namespace: string, limit: number, windowMs: number) => {
    return (event: H3Event) => {
        const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
        const key = `${namespace}:${ip}`
        const now = Date.now()

        // ленивая очистка протухших бакетов, чтобы мапа не росла бесконечно
        if (stores.size > 10000) {
            for (const [k, v] of stores) if (v.resetAt <= now) stores.delete(k)
        }

        let bucket = stores.get(key)
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs }
            stores.set(key, bucket)
        }
        bucket.count += 1

        if (bucket.count > limit) throw createError({ status: 429, message: 'Too many requests' })
    }
}
