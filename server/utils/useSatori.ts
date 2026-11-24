import satori from "satori"
import { renderAsync } from "@resvg/resvg-js"
import { html } from "satori-html"
import { useSatoriFont } from './useSatoriFont'
import type { H3Event } from "h3"

const sniffImageType = (buffer: Buffer) => {
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg'
    if (buffer.subarray(0, 4).toString('hex') === '89504e47') return 'image/png'
    if (buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif'
    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
    if (/^\s*(<\?xml|<svg)/.test(buffer.subarray(0, 100).toString('utf8'))) return 'image/svg+xml'
    return null
}

export type FetchedImage = { buffer: Buffer, type: string }

// ассеты CMS адресуются по хэшу содержимого, поэтому картинки можно держать в памяти воркера сколько угодно
const images = ((globalThis as any).__serverImages ??= new Map<string, Promise<FetchedImage>>()) as Map<string, Promise<FetchedImage>>

/** Загрузка картинки для серверного рендера (satori, docx) с кэшем на воркер и типом по сигнатуре файла */
export const fetchImage = (src: string) => {
    const cached = images.get(src)
    if (cached) return cached
    const promise = (async () => {
        const response = await fetch(src, { signal: AbortSignal.timeout(10_000) })
        if (!response.ok) throw createError({ status: 502, message: `Image fetch failed (${response.status}): ${src}` })
        const buffer = Buffer.from(await response.arrayBuffer())
        // S3 отдаёт content-type по расширению, а под .webp лежат и JPEG — тип берём по сигнатуре
        const type = sniffImageType(buffer) || response.headers.get('content-type') || 'application/octet-stream'
        return { buffer, type }
    })()
    // неудачную загрузку не кэшируем, чтобы следующий рендер попробовал снова
    promise.catch(() => images.delete(src))
    if (images.size >= 100) images.delete(images.keys().next().value!)
    images.set(src, promise)
    return promise
}

const loadImage = async (src: string) => {
    const { buffer, type } = await fetchImage(src)
    return `data:${type};base64,${buffer.toString('base64')}`
}

/**
 * Внешние картинки встраиваем как data URL заранее: satori перед загрузкой сам резолвит хост
 * и режет приватные/зарезервированные адреса (SSRF-защита), а за VPN с fake-ip DNS
 * под неё попадает даже публичный S3. Заодно картинки кэшируются между рендерами.
 */
const inlineImages = async (markup: string) => {
    const sources = [...new Set([...markup.matchAll(/<img[^>]*?\ssrc="(https?:\/\/[^"]+)"/g)].map(match => match[1]!))]
    const inlined = await Promise.all(sources.map(async src => [src, await loadImage(src)] as const))
    return inlined.reduce((acc, [src, data]) => acc.replaceAll(`src="${src}"`, `src="${data}"`), markup)
}

/** Server-Timing по этапам рендера — видно в DevTools и в curl -I */
export const useServerTiming = (event: H3Event) => {
    const marks: string[] = []
    return async <T>(name: string, run: () => Promise<T> | T): Promise<T> => {
        const start = performance.now()
        try { return await run() }
        finally {
            marks.push(`${name};dur=${(performance.now() - start).toFixed(1)}`)
            setHeader(event, 'Server-Timing', marks.join(', '))
        }
    }
}

export const useSatori = async (event: H3Event, string: string, timing = useServerTiming(event)) => {
    const query = getQuery(event)
    const width = Math.min(parseInt(String(query.width ?? '')) || 2000, 2400)
    const url = getRequestURL(event)

    const format = (url.pathname.split('.')?.[1] || 'png') as 'svg' | 'png'
    if (!['png', 'svg'].includes(format)) throw createError({ status: 404 })

    const [fonts, markup] = await Promise.all([
        timing('fonts', () => Promise.all([
            useSatoriFont('Cascadia Code', 400),
            useSatoriFont('Cascadia Code', 700)
        ])),
        timing('images', () => inlineImages(string.trim().replace(/<\/?strong>/g, '')))
    ])
    const svg = await timing('satori', () => satori(html(markup) as any, { width: 1200, fonts }))
    if (format == 'svg') {
        setHeader(event, 'Content-Type', 'image/svg+xml')
        return svg
    }
    // renderAsync растеризует в пуле потоков libuv и не блокирует воркер на время рендера
    const png = await timing('resvg', async () => (await renderAsync(svg, {
        background: 'rgba(0, 0, 0, 0)',
        fitTo: { mode: 'width', value: width },
        font: { fontFiles: fonts.map(v => v.file), loadSystemFonts: false }
    })).asPng())
    setHeader(event, 'Content-Type', 'image/png')
    return png
}
