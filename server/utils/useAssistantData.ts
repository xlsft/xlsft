import { groq } from '@crumbleerp/clarity'

type Themed = { dark?: string, light?: string }

export type AssistantData = Awaited<ReturnType<typeof fetchAssistantData>>

const fetchAssistantData = async (locale: string) => dedupeSkills(await useClarity().fetch<{
    summary: { title: string, description: string, status: string, content: string }
    skills: { type: string, items: { name: string, priority: number }[] }[]
    experience: {
        id: string, link?: string, name: string, logo?: Themed, about?: string
        positions: { name: string, description?: string, from: string, to?: string, skills: string[] }[]
    }[]
    projects: {
        id: string, name: string, description?: string, logo?: Themed, images?: string[], bg?: string, repo?: string,
        tags?: string[], status?: string, links?: string[], priority: number, stack: string[]
    }[]
    links: { id: string, label: string, to: string }[]
}>(groq`{
    "summary": *[_type == "summary"][0]{
        "title": title[$locale], "description": description[$locale],
        "status": status[$locale], "content": content[$locale]
    },
    "skills": array::unique(*[_type == "skill"] | order(type asc) { "type": type })[]{
        "type": type,
        "items": *[_type == "skill" && type == ^.type] | order(priority desc){ name, priority }
    },
    "experience": *[_type == "experience"]{
        id, link,
        "name": name[$locale],
        "logo": { "dark": logo.dark.asset->url, "light": logo.light.asset->url },
        "about": about[$locale],
        "positions": positions[]{
            "name": name[$locale],
            "description": descriptionShort[$locale],
            "from": duration.from,
            "to": duration.to,
            "skills": skills[]->name
        } | order(from desc)
    } | order(positions[0].duration.from desc),
    "projects": *[_type == "project"]{
        id, repo, tags, priority, links,
        "name": name[$locale],
        "description": description[$locale],
        "status": status[$locale],
        "logo": { "dark": logo.dark.asset->url, "light": logo.light.asset->url },
        "images": images[].asset->url,
        "bg": bg.hex,
        "stack": stack[]->name
    } | order(priority desc),
    "links": *[_type == "link"]{ id, "label": label[$locale], "to": to }
}`, { locale }, { signal: AbortSignal.timeout(10_000) }))

/**
 * array::unique в Clarity не схлопывает объекты: запрос возвращает группу на каждый навык.
 * Оставляем по одной группе на категорию и сортируем по числу навыков, как на главной.
 */
function dedupeSkills<T extends { skills: { type: string, items: unknown[] }[] }>(data: T): T {
    const groups = new Map(data.skills.map(group => [group.type, group]))
    return { ...data, skills: [...groups.values()].sort((a, b) => b.items.length - a.items.length) }
}

/** Данные резюме для ассистента: кэшируются по локали, чтобы не ходить в CMS на каждое сообщение. */
export const useAssistantData = defineCachedFunction(fetchAssistantData, {
    maxAge: 600, swr: true, staleMaxAge: 86400,
    group: 'chat', name: 'assistant-v3',
    getKey: (locale: string) => locale
})
