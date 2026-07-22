import type { AsyncDataOptions } from "#app"

type CacheEntry = { data: any, expiresAt: number }

const TTL = 300_000
const cache = ((globalThis as any).__clarityQueryCache ??= new Map<string, CacheEntry>())

export const useClarityDynamicQuery = async <T = any>(
    query: string,
    params?: Ref<Record<string, any>>,
    options: AsyncDataOptions<T> = {}
) => {
    const theme = useColorMode()
    const route = useRoute()
    const { locale } = useI18n()
    const clarity = useClarity()

    const constructParams = () => ({ ...params?.value || {}, locale: locale.value || 'ru', theme: theme.value || 'dark' })

    const data = useAsyncData<T>(query + route.fullPath, async () => {
        const params = constructParams()

        // серверный кросс-запросный кэш GROQ-запросов: дедуплицирует
        // одинаковые запросы между layout/page и между ревалидациями SWR
        if (import.meta.server) {
            const key = query + JSON.stringify(params)
            const hit = cache.get(key)
            if (hit && hit.expiresAt > Date.now()) return hit.data

            if (cache.size > 1000) {
                const now = Date.now()
                for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k)
            }

            const result = await clarity.fetch(query, params)
            cache.set(key, { data: result, expiresAt: Date.now() + TTL })
            return result
        }

        return clarity.fetch(query, params)
    }, options)

    watch(() => [locale.value, theme.value, params?.value], () => {
        const keys = Object.keys(constructParams())
        if (keys.some(key => query.includes(`$${key}`))) data.refresh()
    }, { deep: true })

    return data
}
