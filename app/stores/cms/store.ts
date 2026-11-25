import { invalidate, key as cmsKey, normalize, request } from './cache'
import { CMS_AUTO_PARAMS } from './const'
import type { CmsAbout, CmsCompany, CmsFooter, CmsLegal, CmsParams, CmsPerson, CmsProfile, CmsProject, CmsQueryOptions, CmsQueryResult, CmsReadme, CmsScreenshots, CmsSummary } from './types'

export const useCmsStore = defineStore('cms', () => {
    const clarity = useClarity()
    const theme = useColorMode()
    const { t, locale } = useI18n()

    function query<T>(groq: string, params?: MaybeRefOrGetter<CmsParams | undefined>, options?: CmsQueryOptions<T>): CmsQueryResult<T> {
        const query = normalize(groq)
        const auto = CMS_AUTO_PARAMS.filter((name) => new RegExp(`\\$${name}\\b`).test(query))
        const variables = computed<CmsParams>(() => ({
            ...(auto.includes('locale') ? { locale: locale.value } : {}),
            ...(auto.includes('theme') ? { theme: theme.value } : {}),
            ...toValue(params),
        }))
        const id = computed<string>(() => cmsKey(query, variables.value))
        return useAsyncData<T | undefined>(id, () => request<T>((query, params) => clarity.fetch(query, params), query, variables.value, options), options as CmsQueryOptions<T | undefined>) as CmsQueryResult<T>
    }

    const methods = {
        summary: (): CmsQueryResult<CmsSummary> => query<CmsSummary>(groq`*[_type == "summary"][0]{
            "title": title[$locale],
            "description": description[$locale],
        }`),
        profile: (): CmsQueryResult<CmsProfile> => query<CmsProfile>(groq`{
            "summary": *[_type == "summary"][0]{
                "title": title[$locale],
                "description": description[$locale],
                "content": content[$locale],
                "image": image.asset->url,
                "status": status[$locale],
            },
            "skills": *[_type == "skill"] | order(type asc, name asc) { type, name, color, priority },
            "links": {
                "hh": *[_type == "link" && id == "hh"][0] { "label": label[$locale], to },
                "github": *[_type == "link" && id == "github"][0] { "label": label[$locale], to },
                "linkedin": *[_type == "link" && id == "linkedin"][0] { "label": label[$locale], to },
            },
            "experience": *[_type == "experience"]{
                "name": name[$locale],
                "positions": positions[]{ duration } | order(duration.from desc),
            } | order(positions[0].duration.from desc),
        }`),
        experience: (): CmsQueryResult<CmsCompany[]> => query<CmsCompany[]>(groq`*[_type == "experience"]{
            id, link,
            "name": name[$locale],
            "logo": { "dark": logo.dark.asset->url, "light": logo.light.asset->url },
            "about": about[$locale],
            "positions": positions[]{
                "name": name[$locale],
                "description": description[$locale],
                "skills": skills[]->{ name, type, color, priority } | order(priority desc),
                duration,
            } | order(duration.from desc),
            "footer": footer[$locale],
        } | order(positions[0].duration.from desc)`),
        projects: (): CmsQueryResult<ProjectsQuery> => query<ProjectsQuery>(groq`*[_type == "project"] {
            id, tags, repo, priority,
            "name": name[$locale],
            "logo": { "dark": logo.dark.asset->url, "light": logo.light.asset->url },
            "description": description[$locale],
            "images": images[].asset->url,
            "bg": bg.hex,
        } | order(priority desc)`),
        project: (id: MaybeRefOrGetter<string>): CmsQueryResult<CmsProject> => query<CmsProject>(groq`*[_type == "project" && id == $id][0] {
            id, tags, repo,
            "status": status[$locale],
            "author": *[_type == "summary"][0].title[$locale],
            "name": name[$locale],
            "description": description[$locale],
            "thumbnail": { "dark": thumbnail.dark.asset->url, "light": thumbnail.light.asset->url },
        }`, () => ({ id: toValue(id) })),
        readme: (id: MaybeRefOrGetter<string>): CmsQueryResult<CmsReadme> => query<CmsReadme>(groq`*[_type == "project" && id == $id][0] {
            id, links, tags, repo,
            "name": name[$locale],
            "description": description[$locale],
            "status": status[$locale],
            "thumbnail": { "dark": thumbnail.dark.asset->url, "light": thumbnail.light.asset->url },
            "stack": count(stack),
        }`, () => ({ id: toValue(id) })),
        about: (id: MaybeRefOrGetter<string>): CmsQueryResult<CmsAbout> => query<CmsAbout>(groq`*[_type == "project" && id == $id][0] {
            "about": about[$locale],
            "copyright": copyright[$locale],
            "stack": stack[]->{ name, type, priority } | order(priority desc),
        }`, () => ({ id: toValue(id) })),
        screenshots: (id: MaybeRefOrGetter<string>): CmsQueryResult<CmsScreenshots> => query<CmsScreenshots>(groq`*[_type == "project" && id == $id][0] {
            "name": name[$locale],
            "images": images[].asset->url,
        }`, () => ({ id: toValue(id) })),
        legal: (id: MaybeRefOrGetter<string>): CmsQueryResult<CmsLegal> => query<CmsLegal>(groq`*[_type == "legal" && id == $id][0] {
            "author": *[_type == "summary"][0].title[$locale],
            "title": title[$locale],
            "description": description[$locale],
            "content": content[$locale],
        }`, () => ({ id: toValue(id) })),
        footer: (): CmsQueryResult<CmsFooter> => query<CmsFooter>(groq`{
            "legal": *[_type == "summary"][0].legal[$locale],
            "links": *[_type == "link"] { "label": short[$locale], to },
        }`),
        person: (): CmsQueryResult<CmsPerson> => query<CmsPerson>(groq`{
            "title": *[_type == "summary"][0].title[$locale],
            "description": *[_type == "summary"][0].description[$locale],
            "image": *[_type == "summary"][0].image.asset->url,
            "email": *[_type == "link" && id == "email"][0].label[$locale],
            "phone": *[_type == "link" && id == "phone"][0].label[$locale],
            "links": *[_type == "link"].to,
            "workplace": (*[_type == "experience"] | order(positions[0].duration.from desc) {
                link,
                "logo": logo[$theme].asset->url,
                "name": name[$locale],
            })[0],
            "skills": *[_type == "skill"]{ name },
            "experience": *[_type == "experience"] {
                link,
                "name": name[$locale],
                "logo": logo[$theme].asset->url,
                "about": about[$locale],
                "positions": positions[]{
                    "name": name[$locale],
                    "description": description[$locale],
                    "skills": skills[]->{ name } | order(priority desc),
                    duration,
                } | order(duration.from desc),
            } | order(positions[0].duration.from desc),
            "projects": *[_type == "project"] {
                id, priority, repo,
                "name": name[$locale],
                "thumbnail": thumbnail[$theme].asset->url,
                "description": description[$locale],
            } | order(priority desc),
        }`),
        colors: (logos: MaybeRefOrGetter<(ThemedImage | string | undefined)[]>): CmsQueryResult<Record<string, string | undefined>> => useAsyncData<Record<string, string | undefined> | undefined>(
            () => `cms:colors:${toValue(logos).map((logo) => typeof logo === 'string' ? logo : `${logo?.dark}|${logo?.light}`).join(',')}`,
            async () => {
                const sources = [...new Set(toValue(logos).flatMap((logo) => typeof logo === 'string' ? [logo] : [logo?.dark, logo?.light]).filter((src): src is string => !!src?.endsWith('.svg')))]
                const entries = await Promise.all(sources.map(async (src) => {
                    const svg = await fetch(src).then((response) => response.ok ? response.text() : '').catch(() => '')
                    return [src, methods.dominant(svg)] as const
                }))
                return Object.fromEntries(entries)
            },
            { server: false },
        ) as CmsQueryResult<Record<string, string | undefined>>,
        invalidate,

        dominant(svg: string): string | undefined {
            const counts = new Map<string, number>()
            for (const [, hex] of svg.matchAll(/(?:fill|stroke|stop-color)\s*[=:]\s*["']?(#[0-9a-f]{6}|#[0-9a-f]{3})\b/gi)) {
                const key = hex!.toLowerCase()
                counts.set(key, (counts.get(key) ?? 0) + 1)
            }
            let best: { hex: string, score: number } | undefined
            for (const [hex, count] of counts) {
                const value = hex.length === 4 ? hex.slice(1).split('').map((char) => char + char).join('') : hex.slice(1)
                const [r, g, b] = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255) as [number, number, number]
                const max = Math.max(r, g, b)
                const min = Math.min(r, g, b)
                const lightness = (max + min) / 2
                const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1))
                if (saturation < 0.3 || lightness < 0.15 || lightness > 0.9) continue
                const score = saturation * Math.sqrt(count)
                if (!best || score > best.score) best = { hex, score }
            }
            return best?.hex
        },

        span(from: string | Date, to?: string | Date): { duration: () => string, range: () => string, period: () => string } {
            const start = new Date(from)
            const end = to ? new Date(to) : new Date()
            const total = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
            const years = Math.floor(total / 12)
            const months = total % 12
            const duration = (): string => `${years > 0 ? `${plural(years, t('years.one'), t('years.two'), t('years.more'))} ` : ''}${plural(months, t('months.one'), t('months.two'), t('months.more'))}`
            const range = (): string => {
                const formatter = new Intl.DateTimeFormat(locale.value, { month: 'long' })
                return `${formatter.format(start)} ${start.getFullYear()} — ${to ? `${formatter.format(end)} ${end.getFullYear()}` : t('present')}`
            }
            return { duration, range, period: () => `${range()} / ${duration()}` }
        },
        fetch(profile?: CmsProfile): { user?: string, role?: string, host?: string, uptime?: string } {
            const title = profile?.summary.title ?? ''
            const identity = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(title)
            const experience = profile?.experience
            const from = experience?.at(-1)?.positions.at(-1)?.duration.from
            const host = (experience ?? []).filter((company) => company.positions.some((position) => !position.duration.to)).map((company) => company.name).join(', ')
            return {
                user: identity?.[2],
                role: identity ? identity[1] : title || undefined,
                host: host || undefined,
                uptime: from ? methods.span(from, experience?.at(0)?.positions.at(0)?.duration.to).duration() : undefined,
            }
        },
        group<T extends { type: string }>(skills?: T[]): { type: string, items: T[] }[] {
            const categories = new Map<string, T[]>()
            for (const skill of skills ?? []) categories.set(skill.type, [...categories.get(skill.type) ?? [], skill])
            return Array.from(categories, ([type, items]) => ({ type, items }))
        },
        notes(text?: string): string[] {
            return (text ?? '').split('\n').map((line) => line.trim()).filter((line) => /[\p{L}\p{N}]/u.test(line.replace(/<[^>]*>/g, '')))
        },
    }

    return { ...methods }
})
