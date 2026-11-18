import { gzipSync } from 'node:zlib'

// селфхост tag.js: забираем у Яндекса раз в сутки, отдаём со своего origin.
// Set-Cookie апстрима не прокидываем — так уходят сторонние куки метрики
const fetchTag = defineCachedFunction(async () => {
    return await $fetch<string>('https://mc.yandex.ru/metrika/tag.js', { responseType: 'text' })
}, { name: 'vendor', getKey: () => 'metrika-tag', maxAge: 86400 })

export default defineEventHandler(async (event) => {
    const body = await fetchTag()

    setHeader(event, 'Content-Type', 'application/javascript; charset=utf-8')
    setHeader(event, 'Cache-Control', 'public, max-age=86400')
    setHeader(event, 'Vary', 'Accept-Encoding')

    if (getRequestHeader(event, 'accept-encoding')?.includes('gzip')) {
        setHeader(event, 'Content-Encoding', 'gzip')
        return gzipSync(body)
    }

    return body
})
