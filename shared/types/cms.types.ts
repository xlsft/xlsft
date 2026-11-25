export type I18nString = string

export interface ThemedImage { dark?: string, light?: string }

export interface Education {
    id: string
    level: I18nString
    name: I18nString
    link: string
    faculty: I18nString
    specialization: I18nString
    year: number
}

export interface Skill {
    name: string
    type: string
    color: string
    priority: number
}

export interface Link {
    id: string
    label: I18nString
    short: I18nString
    to: string
}

export interface Position {
    name: I18nString
    skills: Skill[]
    description: I18nString
    duration: {
        from: string
        to?: string
    }
}

export interface Experience {
    id: string
    name: I18nString
    logo: string
    about: I18nString
    link: string
    positions: Position[]
    footer: I18nString
}

export interface Project {
    id: string
    name: I18nString
    thumbnail: string
    logo: string
    description: I18nString
    images: string[]
    bg: string
    about: I18nString
    related: { _ref: string }[]
    status: I18nString
    links: string[]
    repo: string
    tags: string[]
    stack: Skill[]
    priority: number
    copyright: I18nString
}

export interface Summary {
    content: I18nString
    image: string
    status: I18nString
    title: I18nString
    description: I18nString
    legal: I18nString
}

export interface IndexQuery {
    summary: Pick<Summary, 'title' | 'description' | 'content' | 'status'> & { image: string }
    skills: {
        type: string
        items: Pick<Skill, 'name' | 'color' | 'priority'>[]
    }[]
    links: {
        hh?: Pick<Link, 'label' | 'to'>
        github?: Pick<Link, 'label' | 'to'>
        linkedin?: Pick<Link, 'label' | 'to'>
    }
    experience: (Omit<Experience, 'positions' | 'name' | 'about' | 'logo' | 'footer'> & {
        name: string
        logo: ThemedImage
        about: string
        positions: (Omit<Position, 'name' | 'description' | 'skills'> & {
        name: string
        description: string
        skills: Pick<Skill, 'name' | 'type' | 'color' | 'priority'>[]
        })[]
        footer: string
    })[]
    allLinks: {
        label: I18nString
        to: string
    }[]
}

export type ProjectsQuery = (
    Pick<Project, 'id' | 'tags' | 'repo' | 'priority'> & {
        name: string
        logo: ThemedImage
        description: string
        images?: string[]
        bg?: string
    }
)[]

export interface Tile {
    id: string
    name: string
    description?: string
    tags?: string[]
    bg?: string
    logo?: ThemedImage
    images?: string[]
}

export type Company = IndexQuery['experience'][number]
