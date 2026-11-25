import { gzipSync } from 'node:zlib'

const fetchTag = defineCachedFunction(async (id: string) => {
    return await $fetch<string>(`https://www.googletagmanager.com/gtag/js?id=${id}`, { responseType: 'text' })
}, { name: 'vendor', getKey: (id: string) => `gtag-${id}`, maxAge: 86400 })

export default defineEventHandler(async (event) => {
    const metrics = useRuntimeConfig(event).public.metrics
    const query = String(getQuery(event).id ?? '')
    const id = query.length ? query : metrics.gtag
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
