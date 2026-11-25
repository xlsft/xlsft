import type { ASSISTANT_TOOLS } from './const'

export type AssistantTool = typeof ASSISTANT_TOOLS[number]
export type AssistantBlockType = 'experience' | 'projects' | 'skills' | 'contacts' | 'project' | 'repos'
export type AssistantImage = string | ThemedImage

export interface AssistantQuery {
    id?: string
    ids?: string[]
    tag?: string
    company?: string
    locale?: string
    error?: string
}

export interface AssistantList<T> { items?: T[], groups?: T[] }

export interface AssistantCompany {
    id: string
    name: string
    link?: string
    logo?: AssistantImage
    positions: { name: string, from?: string, to?: string, skills?: string[] }[]
}

export interface AssistantContact { label: string, to: string }

export interface AssistantProject {
    id: string
    name: string
    logo?: AssistantImage
    status?: string
    images?: string[]
    description?: string
    stack?: string[]
    repo?: string
    links?: string[]
    github?: { stars?: number }
}

export interface AssistantRepo {
    repo: string
    name: string
    github?: { language?: string, stars?: number, forks?: number, topics?: string[] }
}

export interface AssistantSkills { type: string, items: string[] }

export interface AssistantMatch {
    title?: string
    score: number
    items?: { requirement: string, status: 'match' | 'partial' | 'missing', years?: number }[]
    projects?: { id: string, name: string }[]
    error?: string
}

export interface AssistantSources { query: string, results?: { title: string, url: string }[], error?: string }

export interface AssistantRequest {
    created?: boolean
    error?: string
    fields?: { name?: string, email?: string, phone?: string, telegram?: string, message?: string }
}
