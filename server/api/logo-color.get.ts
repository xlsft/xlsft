// доминантный цвет логотипа проекта: берём явные цвета из SVG (fill / stroke / stop-color)
// и выбираем самый насыщенный с учётом частоты. Бакет S3 не отдаёт CORS, поэтому считаем на сервере.

// разрешаем только ассеты нашего бакета, чтобы эндпоинт не стал открытым прокси
const ALLOWED_PREFIX = 'https://s3.ru1.storage.beget.cloud/3f3deb6e7eb1-cv-xlsft-ru/assets/'

const toRgb = (hex: string) => {
    const value = hex.length === 4 ? hex.slice(1).split('').map(c => c + c).join('') : hex.slice(1)
    return [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number]
}

const toHsl = ([r, g, b]: [number, number, number]) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const l = (max + min) / 2
    const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
    return { s, l }
}

export const pickDominantColor = (svg: string): string | null => {
    const counts = new Map<string, number>()
    for (const [, hex] of svg.matchAll(/(?:fill|stroke|stop-color)\s*[=:]\s*["']?(#[0-9a-f]{6}|#[0-9a-f]{3})\b/gi)) {
        const key = hex!.toLowerCase()
        counts.set(key, (counts.get(key) || 0) + 1)
    }

    let best: { hex: string, score: number } | null = null
    for (const [hex, count] of counts) {
        const { s, l } = toHsl(toRgb(hex))
        // серые, почти чёрные и почти белые цвета не считаются «цветом логотипа»
        if (s < 0.3 || l < 0.15 || l > 0.9) continue
        const score = s * Math.sqrt(count)
        if (!best || score > best.score) best = { hex, score }
    }
    return best?.hex ?? null
}

export default defineCachedEventHandler(async (event) => {
    const src = getQuery(event).src
    if (typeof src !== 'string' || !src.startsWith(ALLOWED_PREFIX) || !src.endsWith('.svg'))
        throw createError({ statusCode: 400, statusMessage: 'Unsupported logo source' })

    const svg = await $fetch<string>(src, { responseType: 'text', timeout: 5000 })
    return { color: pickDominantColor(svg) }
}, {
    maxAge: 60 * 60 * 24 * 7,
    getKey: (event) => String(getQuery(event).src)
})
