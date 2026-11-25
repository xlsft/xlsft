import type { AssistantData } from './useAssistantData'

export type BlockType = 'experience' | 'projects' | 'skills' | 'contacts' | 'project' | 'repos'
export interface BlockQuery { company?: string, tag?: string, ids?: string[], limit?: number }

const clip = (value: string, length: number) => value.length > length ? `${value.slice(0, length)}…` : value

export interface AssistantBlock { items?: object[], groups?: object[] }

export const useBlocks = (data: AssistantData): { build: (type: BlockType, query?: BlockQuery) => Promise<AssistantBlock> } => {
    const github = useGithub()

    async function build(type: BlockType, query: BlockQuery = {}): Promise<AssistantBlock> {
        if (type === 'project') {
            const project = data.projects.find(p => p.id === query.ids?.[0])
            if (!project) return { items: [] }
            return { items: [{
                id: project.id, name: project.name, logo: project.logo, images: project.images?.slice(0, 3), bg: project.bg,
                description: project.description ? clip(project.description, 700) : undefined, status: project.status,
                tags: project.tags, stack: project.stack?.slice(0, 16), links: project.links?.slice(0, 4),
                repo: project.repo, github: project.repo ? await github.stats(project.repo) : undefined
            }] }
        }
        if (type === 'repos') {
            const projects = data.projects.filter(p => p.repo && (!query.ids?.length || query.ids.includes(p.id))).slice(0, query.limit ?? 6)
            const items = await Promise.all(projects.map(async p => ({ id: p.id, name: p.name, repo: p.repo!, github: await github.stats(p.repo!) })))
            return { items: items.sort((a, b) => (b.github?.stars ?? 0) - (a.github?.stars ?? 0)) }
        }
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

    return { build }
}
