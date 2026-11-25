import type { H3Event } from 'h3'

interface Bucket { count: number, resetAt: number }

const stores = (globalThis as any).__rateLimit ??= new Map<string, Bucket>()

export const useRateLimit = (namespace: string, limit: number, windowMs: number): { check: (event: H3Event) => void } => {
    function check(event: H3Event): void {
        const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
        const key = `${namespace}:${ip}`
        const now = Date.now()

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

    return { check }
}
