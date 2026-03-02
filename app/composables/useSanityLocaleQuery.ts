import type { AsyncDataOptions } from "#app"

export const useSanityLocaleQuery = async <T = any>(
    query: string,
    params: Record<string, any> = {},
    options: AsyncDataOptions<T> = {}
) => {

    const { locale } = useI18n()
    const sanity = useSanity()

    const key = computed(() => {
        const p = { ...params, locale: locale.value }
        return `sanity:${locale.value}:${query}:${JSON.stringify(p)}`
    })

    const data = useAsyncData<T>(key, () => sanity.fetch(query, { ...params, locale: locale.value }), options)

    watch(() => locale.value, () => data.refresh())

    return data
}