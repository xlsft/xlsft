import type { SitemapUrlInput } from '#sitemap/types'
import { groq } from '@crumbleerp/clarity'

export default defineSitemapEventHandler(async () => {

    const client = useClarity()
    const pages = await client.fetch<string[]>(groq`*[_type == "project"].id`)
    if (!pages.length) return []

    return Object.entries({
        'en-US': 'en',
        'ru-RU': 'ru'
    }).map(([sitemap, locale]) => pages.map((id) => ({
        loc: `/${locale}/projects/${id}`,
        _sitemap: sitemap,
    } as SitemapUrlInput))).flat()
})
