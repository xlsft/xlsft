import type { AsyncDataOptions } from "#app"

export const useSanityDynamicQuery = async <T = any>(
    query: string,
    params?: Ref<Record<string, any>>,
    options: AsyncDataOptions<T> = {}
) => {
    const theme = useColorMode()
    const route = useRoute()
    const { locale } = useI18n()
    const sanity = useSanity()

    const constructParams = () => ({ ...params?.value || {}, locale: locale.value || 'ru', theme: theme.value || 'dark' })

    const data = useAsyncData<T>(query + route.fullPath, () => {
        const params = constructParams()
        return sanity.fetch(query, params)
    }, options)
    
    watch(
        () => params?.value,
        console.info,
        { deep: true }
    )

    watch(() => [locale.value, theme.value, params?.value], () => {
        console.log(params?.value)
        const keys = Object.keys(constructParams())
        if (keys.some(key => query.includes(`$${key}`))) data.refresh()
    }, { deep: true })
    
    return data
}