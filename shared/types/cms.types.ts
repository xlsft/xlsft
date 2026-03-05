// Типы по схемам

export type I18nString = string

export type Education = {
    id: string
    level: I18nString
    name: I18nString
    link: string
    faculty: I18nString
    specialization: I18nString
    year: number
}

export type Skill = {
    name: string
    type: string
    color: string
    priority: number
}

export type Link = {
    id: string
    label: I18nString
    short: I18nString
    to: string
}

export type Position = {
    name: I18nString
    skills: Skill[]
    description: I18nString
    duration: {
        from: string
        to?: string
    }
}

export type Experience = {
    id: string
    name: I18nString
    logo: string // theme -> image url
    about: I18nString
    link: string
    positions: Position[]
    footer: I18nString
}

export type Project = {
    id: string
    name: I18nString
    thumbnail: string // theme -> image url
    logo: string // theme -> image url
    description: I18nString
    images: string[] // image urls
    bg: string // color
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

export type Summary = {
    content: I18nString
    image: string // image url
    status: I18nString
    title: I18nString
    description: I18nString
    legal: I18nString
}

export type IndexQuery = {
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
        logo: string
        about: string
        positions: (Omit<Position, 'name' | 'description' | 'skills'> & {
        name: string
        description: string
        skills: Pick<Skill, 'name' | 'type' | 'color' | 'priority'>[]
        })[]
        footer: string
    })[]
    education: (Omit<Education, 'level' | 'specialization' | 'name' | 'faculty'> & {
        level: string
        specialization: string
        name: string
        faculty: string
    })[]
    projectTags: string[]
    allLinks: {
        label: I18nString,
        to: string
    }[]
}

export type ProjectsQuery = (
    Pick<Project, 'id' | 'tags' | 'repo' | 'priority'> & {
        name: string
        thumbnail: string
        description: string
    }
)[]

export type SeoQuery = {
    seo: Pick<Summary, 'title' | 'description'> & {
        title: string
        description: string
    }
}