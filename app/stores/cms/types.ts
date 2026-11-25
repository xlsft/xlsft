import type { AsyncData, AsyncDataOptions, NuxtError } from '#app'

export type CmsParams = Record<string, unknown>

export type CmsFetcher = <T>(query: string, params: CmsParams) => Promise<T>

export interface CmsCacheEntry {
    value: unknown
    fresh: number
    stale: number
}

export type CmsQueryOptions<T> = Omit<AsyncDataOptions<T>, 'watch'> & {
    cache?: boolean
}

export type CmsQueryResult<T> = AsyncData<T | undefined, NuxtError | undefined> & Promise<AsyncData<T | undefined, NuxtError | undefined>>

export interface CmsSummary { title?: string, description?: string }

export type CmsProfile = Pick<IndexQuery, 'summary' | 'links'> & {
    skills: Skill[]
    experience: { name: string, positions: { duration: { from: string, to?: string } }[] }[]
}

export type CmsCompany = IndexQuery['experience'][number]

export interface CmsFooter { legal?: string, links: { label: string, to: string }[] }

export interface CmsPerson {
    title?: string
    description?: string
    image?: string
    email?: string
    phone?: string
    links: string[]
    workplace?: { link?: string, logo?: string, name: string }
    skills: { name: string }[]
    experience: {
        link?: string
        name: string
        logo?: string
        about?: string
        positions: { name: string, description?: string, skills?: { name: string }[], duration: { from: string, to?: string } }[]
    }[]
    projects: { id: string, priority: number, repo?: string, name: string, thumbnail?: string, description?: string }[]
}

export type CmsProject = Pick<Project, 'id' | 'tags' | 'repo'> & {
    status?: string
    author?: string
    name: string
    description?: string
    thumbnail?: ThemedImage
}

export type CmsReadme = Pick<Project, 'id' | 'links' | 'tags' | 'repo'> & {
    name: string
    description?: string
    status?: string
    thumbnail?: ThemedImage
    stack?: number
}

export interface CmsAbout { about?: string, copyright?: string, stack?: Pick<Skill, 'name' | 'type'>[] }

export interface CmsScreenshots { name: string, images?: string[] }

export interface CmsLegal { author?: string, title: string, description?: string, content?: string }
