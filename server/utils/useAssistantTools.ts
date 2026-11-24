import * as z from 'zod'
import { tool } from 'ai'

/**
 * Инструменты ассистента — одно описание на двух транспортах:
 * · нативные AI SDK tools (DeepSeek и любые провайдеры с function calling), локаль и сессию подставляет сервер;
 * · MCP-сервер /api/mcp (opencode исполняет инструменты сам), там локаль и сессию передаёт модель аргументами.
 * Результаты намеренно крошечные: полный контент блоков UI забирает отдельным запросом (/api/assistant/block).
 */

export type AssistantToolContext = { locale: 'ru' | 'en', session: string }

type ToolSpec = {
    name: string
    description: string
    input: z.ZodRawShape
    /** Для MCP: модель сама передаёт locale / session. */
    needsLocale?: boolean
    needsSession?: boolean
    /** Как и когда вызывать — строка для системного промпта (сигнатура собирается из input). */
    usage: string
    run: (context: AssistantToolContext, args: any) => Promise<unknown>
}

// не больше 3 новых заявок в час на сессию и 10 в час на весь процесс — защита от зацикливания модели
const requestBuckets = ((globalThis as any).__assistantRequestBuckets ??= new Map<string, { count: number, resetAt: number }>()) as Map<string, { count: number, resetAt: number }>
const allowNewRequest = (session: string) => {
    const now = Date.now()
    for (const key of ['*', session]) {
        const bucket = requestBuckets.get(key)
        if (!bucket || bucket.resetAt <= now) requestBuckets.set(key, { count: 1, resetAt: now + 3_600_000 })
        else if (++bucket.count > (key === '*' ? 10 : 3)) return false
    }
    return true
}

export const assistantToolSpecs: ToolSpec[] = [
    {
        name: 'show_experience',
        usage: 'Interactive block with work experience. Prefer it over long text when asked about experience.',
        description: 'Show the candidate\'s work experience block to the visitor. Optionally only one company by its id.',
        input: { company: z.string().max(64).optional().describe('Company id from the data') },
        needsLocale: true,
        run: async ({ locale }, { company }) => {
            const data = await useAssistantData(locale)
            return { block: 'experience', shown: true, locale, company, count: data.experience.filter(c => !company || c.id === company).length }
        }
    },
    {
        name: 'show_projects',
        usage: 'Bento grid of projects. Prefer it over long text when asked about projects in general.',
        description: 'Show a block with the candidate\'s projects to the visitor. Optionally filter by tag or ids.',
        input: {
            tag: z.string().max(64).optional().describe('Project tag from the data'),
            ids: z.array(z.string().max(64)).max(8).optional(),
            limit: z.number().int().min(1).max(8).optional()
        },
        needsLocale: true,
        run: async ({ locale }, { tag, ids, limit }) => {
            const data = await useAssistantData(locale)
            const shown = (await buildAssistantBlock(data, 'projects', { tag, ids, limit }) as { items: { id: string }[] }).items.map(item => item.id)
            return { block: 'projects', shown: true, locale, ids: shown }
        }
    },
    {
        name: 'show_skills',
        usage: 'Block with the technology stack.',
        description: 'Show the candidate\'s technology stack block to the visitor.',
        input: {},
        needsLocale: true,
        run: async ({ locale }) => ({ block: 'skills', shown: true, locale })
    },
    {
        name: 'show_contacts',
        usage: 'Buttons to contact the candidate directly.',
        description: 'Show buttons to contact the candidate directly (Telegram, e-mail, phone, social links).',
        input: {},
        needsLocale: true,
        run: async ({ locale }) => ({ block: 'contacts', shown: true, locale })
    },
    {
        name: 'show_downloads',
        usage: 'CV/resume files (PDF, DOCX, Markdown). Use whenever the visitor wants the CV as a file or a printable version.',
        description: 'Show buttons to download the candidate\'s CV (resume) in printable formats: PDF, DOCX and Markdown. Use when the visitor asks for the CV/resume as a file, a printable version or to download it.',
        input: {},
        needsLocale: true,
        run: async ({ locale }) => ({ block: 'downloads', shown: true, locale, formats: ['pdf', 'docx', 'md'] })
    },
    {
        name: 'show_project',
        usage: 'Detailed card of ONE project (description, stack, links, GitHub stars). Use when the visitor asks about a specific project.',
        description: 'Show a detailed card of a single project of the candidate by its id.',
        input: { id: z.string().max(64).describe('Project id from the data') },
        needsLocale: true,
        run: async ({ locale }, { id }) => {
            const project = (await useAssistantData(locale)).projects.find(p => p.id === id)
            if (!project) return { error: 'not_found', id }
            return { block: 'project', shown: true, locale, id, name: project.name, stack: project.stack?.slice(0, 8), status: project.status, repo: project.repo }
        }
    },
    {
        name: 'show_repos',
        usage: 'Block with the candidate\'s open-source GitHub repositories (stars, topics). Use for questions about open source, GitHub or code samples.',
        description: 'Show the candidate\'s public GitHub repositories with stars. Optionally only for given project ids.',
        input: { ids: z.array(z.string().max(64)).max(6).optional().describe('Project ids from the data') },
        needsLocale: true,
        run: async ({ locale }, { ids }) => {
            const block = await buildAssistantBlock(await useAssistantData(locale), 'repos', { ids }) as { items: { id: string, repo: string, github: { stars: number } | null }[] }
            return { block: 'repos', shown: true, locale, ids, repos: block.items.map(item => ({ id: item.id, repo: item.repo, stars: item.github?.stars })) }
        }
    },
    {
        name: 'search_cv',
        usage: 'Full-text search over the CV (about, every position\'s duties, project descriptions). Returns snippets for YOU, shows nothing to the visitor. Call it BEFORE answering any detailed question not covered by DATA (a domain, a task, a library, "has he done X") instead of guessing.',
        description: 'Search the candidate\'s CV texts: summary, job descriptions and project descriptions. Returns short snippets with refs. Not visible to the visitor.',
        input: { query: z.string().min(2).max(200).describe('Keywords in the visitor\'s language and/or English') },
        needsLocale: true,
        run: async ({ locale }, { query }) => {
            const hits = searchCv(await useAssistantData(locale), query)
            return hits.length ? { hits } : { hits: [], note: 'Nothing found in the CV. Say so honestly and offer to pass the question to the candidate.' }
        }
    },
    {
        name: 'tech_experience',
        usage: 'Exact years of commercial experience with one technology, computed from position dates, plus projects using it. Shows nothing to the visitor. ALWAYS use it for "how many years / how long with X" instead of estimating.',
        description: 'How long the candidate has worked with a technology: years from positions where it is listed, those positions and project ids that use it. Not visible to the visitor.',
        input: { tech: z.string().min(1).max(64).describe('Technology name, e.g. "Vue", "PostgreSQL"') },
        needsLocale: true,
        run: async ({ locale }, { tech }) => techExperience(await useAssistantData(locale), tech)
    },
    {
        name: 'match_vacancy',
        usage: 'When the visitor pastes a job description or lists requirements: extract up to 20 short atomic requirements (one technology or skill each) and pass them. Renders a fit table for the visitor; then summarize the score and gaps in one or two sentences and offer submit_request with the vacancy summary in "message".',
        description: 'Compare a vacancy\'s requirements with the candidate\'s CV and show a match table to the visitor.',
        input: {
            title: z.string().max(120).optional().describe('Vacancy title, if known'),
            requirements: z.array(z.string().min(1).max(80)).min(1).max(20).describe('Short atomic requirements, one technology or skill each')
        },
        needsLocale: true,
        run: async ({ locale }, { title, requirements }) => ({ block: 'match', shown: true, locale, title, ...matchVacancy(await useAssistantData(locale), requirements) })
    },
    {
        name: 'groq_query',
        usage: `Raw read-only GROQ query to the CV CMS when DATA, search_cv and the other tools lack a detail (full project story in "about", full duties in positions[].description, education, related projects…). Shows nothing to the visitor. Fields marked * are localized objects — read them as field[$locale] ($locale is always bound). Keep projections small. Schema: ${CMS_SCHEMA}. Example: *[_type == "project" && id == "x"][0]{ "about": about[$locale], "stack": stack[]->name }`,
        description: 'Run a read-only GROQ query against the CV CMS (Clarity, Sanity-compatible). $locale param is always bound. Result is truncated to ~6k chars. Not visible to the visitor.',
        input: {
            query: z.string().min(3).max(2000).describe('GROQ query'),
            params: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).optional().describe('Extra GROQ params, referenced as $name')
        },
        needsLocale: true,
        run: async ({ locale }, { query, params }) => await runGroqQuery(locale, query, params)
    },
    {
        name: 'web_search',
        usage: 'Web search (self-hosted SearXNG). Use ONLY for public context around the CV: what a company the candidate worked at does, a technology or product from his projects. Shows the sources to the visitor; answer from the snippets in 2-4 sentences and tie it back to the candidate\'s role there using DATA. Never use it to look up the candidate personally or for off-topic questions; if snippets are thin, say so.',
        description: 'Search the web for public information about a company, product or technology mentioned in the CV. Returns top results with snippets and shows the sources to the visitor.',
        input: { query: z.string().min(2).max(200).describe('Search query, e.g. "Beget hosting company"') },
        needsLocale: true,
        needsSession: true,
        run: async ({ locale, session }, { query }) => await runWebSearch(session, locale, query)
    },
    {
        name: 'submit_request',
        usage: 'Create a request for the candidate as soon as the visitor expresses intent to contact, hire, order work or leave a message — even with incomplete data (use whatever is known; put a one-line summary of the visitor\'s goal in "message").',
        description: 'Create a request (lead) for the candidate. Allowed with partial data. Only once per visitor session: afterwards use update_request.',
        input: requestFieldsSchema.shape,
        needsSession: true,
        run: async ({ session }, input) => allowNewRequest(session) ? await useAssistantRequests(session).create(input) : { error: 'rate_limited' }
    },
    {
        name: 'update_request',
        usage: 'Add or correct details later whenever the visitor gives or changes them.',
        description: 'Add or change details of the already created request. Pass only changed fields.',
        input: requestFieldsSchema.shape,
        needsSession: true,
        run: async ({ session }, input) => await useAssistantRequests(session).update(input)
    },
]

/**
 * Раздел TOOLS системного промпта, собранный из спецификаций — чтобы список не расходился с реальными инструментами.
 * В MCP-режиме модель сама передаёт locale / session, поэтому они попадают в сигнатуру.
 */
export const describeAssistantTools = (mode: 'native' | 'mcp', context: AssistantToolContext) => assistantToolSpecs.map(spec => {
    const args = [
        ...(mode === 'mcp' && spec.needsLocale ? ['locale'] : []),
        ...(mode === 'mcp' && spec.needsSession ? ['session'] : []),
        ...Object.entries(spec.input).map(([key, schema]) => (schema as z.ZodType).safeParse(undefined).success ? `${key}?` : key)
    ]
    const call = mode === 'mcp' ? `tools.cv.${spec.name}` : spec.name
    return `- ${call}(${args.length ? `{ ${args.join(', ')} }` : ''}): ${spec.usage}`
}).join('\n') + (mode === 'mcp' ? `\n- Always pass locale: "${context.locale}" and, to request tools, session: "${context.session}".` : '')

/** Нативные AI SDK tools: контекст (локаль, сессия) зафиксирован на запрос. */
export const buildAssistantTools = (context: AssistantToolContext) => Object.fromEntries(assistantToolSpecs.map(spec => [
    spec.name,
    tool({ description: spec.description, inputSchema: z.object(spec.input), execute: async (args) => await spec.run(context, args) })
]))
