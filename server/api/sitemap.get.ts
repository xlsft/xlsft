import type { SitemapUrlInput } from '#sitemap/types'

export default defineSitemapEventHandler(async () => {
    
    const client = useSanity()
    const pages = await client.fetch<string[]>(groq`*[_type == "project"].id`)
    if (!pages.length) return []

    const locales = {
        en: 'en-US',
        ru: 'ru-RU'
    }

    return Object.entries({
        'en-US': 'en',
        'ru-RU': 'ru'
    }).map(([sitemap, locale]) => pages.map((id) => ({
        loc: `/${locale}/projects/${id}`,
        _sitemap: sitemap,
    } as SitemapUrlInput))).flat()
})
