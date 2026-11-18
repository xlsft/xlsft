import { gzipSync } from 'node:zlib'

// селфхост gtag/js: забираем у Google раз в сутки, отдаём со своего origin.
// id контейнера пробрасываем из query запроса — скрипт читает его из своего src
const fetchTag = defineCachedFunction(async (id: string) => {
    return await $fetch<string>(`https://www.googletagmanager.com/gtag/js?id=${id}`, { responseType: 'text' })
}, { name: 'vendor', getKey: (id: string) => `gtag-${id}`, maxAge: 86400 })

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event).public.config
    const id = String(getQuery(event).id || config.metrics.gtag)
    const body = await fetchTag(id)

    setHeader(event, 'Content-Type', 'application/javascript; charset=utf-8')
    setHeader(event, 'Cache-Control', 'public, max-age=86400')
    setHeader(event, 'Vary', 'Accept-Encoding')

    if (getRequestHeader(event, 'accept-encoding')?.includes('gzip')) {
        setHeader(event, 'Content-Encoding', 'gzip')
        return gzipSync(body)
    }

    return body
})
