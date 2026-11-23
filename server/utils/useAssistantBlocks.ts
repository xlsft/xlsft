import type { AssistantData } from './useAssistantData'

export type BlockType = 'experience' | 'projects' | 'skills' | 'contacts'
export type BlockQuery = { company?: string, tag?: string, ids?: string[], limit?: number }

const clip = (value: string, length: number) => value.length > length ? `${value.slice(0, length)}…` : value

/**
 * Данные интерактивных блоков чата. Модель получает только id показанных элементов
 * (см. MCP-инструменты), а полный контент UI забирает отдельным запросом — так блоки не стоят токенов.
 */
export const buildAssistantBlock = (data: AssistantData, type: BlockType, query: BlockQuery = {}) => {
    if (type === 'experience') return {
        items: data.experience.filter(c => !query.company || c.id === query.company).map(c => ({
            id: c.id, name: c.name, logo: c.logo, link: c.link, about: c.about ? clip(c.about, 240) : undefined,
            positions: c.positions.map(p => ({ name: p.name, from: p.from, to: p.to, skills: p.skills?.slice(0, 8) }))
        }))
    }
    if (type === 'projects') return {
        items: data.projects
            .filter(p => (!query.tag || p.tags?.some(t => t.toLowerCase() === query.tag!.toLowerCase())) && (!query.ids?.length || query.ids.includes(p.id)))
            .slice(0, query.limit ?? 4)
            .map(p => ({ id: p.id, name: p.name, logo: p.logo, images: p.images, bg: p.bg, description: p.description, tags: p.tags }))
    }
    if (type === 'skills') return { groups: data.skills.map(g => ({ type: g.type, items: g.items.slice(0, 14).map(i => i.name) })) }
    return { items: data.links.map(l => ({ id: l.id, label: l.label, to: l.to })) }
}
