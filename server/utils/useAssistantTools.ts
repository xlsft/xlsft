import { tool, type ToolSet } from 'ai'
import * as z from 'zod'

export interface AssistantToolContext { locale: 'ru' | 'en', session: string }

interface ToolSpec {
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

export const tools: ToolSpec[] = [
    {
        name: 'show_experience',
        usage: 'Renders the work experience timeline (optionally one company). Use when asked where he worked; still answer in your own words: current role first, then a sentence about the path.',
        description: 'Show the candidate\'s work experience block to the visitor. Optionally only one company by its id.',
        input: { company: z.string().max(64).optional().describe('Company id from the data') },
        needsLocale: true,
        run: async ({ locale }: AssistantToolContext, { company }: { company?: string }): Promise<unknown> => {
            const data = await useAssistantData(locale).load()
            return { block: 'experience', shown: true, locale, company, count: data.experience.filter(c => !company || c.id === company).length }
        }
    },
    {
        name: 'show_projects',
        usage: 'Renders a grid of projects (filter by tag or ids). Use for general questions about projects; still name one or two standout ones and say why.',
        description: 'Show a block with the candidate\'s projects to the visitor. Optionally filter by tag or ids.',
        input: {
            tag: z.string().max(64).optional().describe('Project tag from the data'),
            ids: z.array(z.string().max(64)).max(8).optional(),
            limit: z.number().int().min(1).max(8).optional()
        },
        needsLocale: true,
        run: async ({ locale }: AssistantToolContext, { tag, ids, limit }: { tag?: string, ids?: string[], limit?: number }): Promise<unknown> => {
            const data = await useAssistantData(locale).load()
            const shown = (await useBlocks(data).build('projects', { tag, ids, limit }) as { items: { id: string }[] }).items.map(item => item.id)
            return { block: 'projects', shown: true, locale, ids: shown }
        }
    },
    {
        name: 'show_skills',
        usage: 'Renders his technology stack. Use when asked about the stack in general; still mention the core of it in a sentence.',
        description: 'Show the candidate\'s technology stack block to the visitor.',
        input: {},
        needsLocale: true,
        run: async ({ locale }) => ({ block: 'skills', shown: true, locale })
    },
    {
        name: 'show_contacts',
        usage: 'Renders buttons to contact him directly. Use when the visitor wants to write or call him.',
        description: 'Show buttons to contact the candidate directly (Telegram, e-mail, phone, social links).',
        input: {},
        needsLocale: true,
        run: async ({ locale }) => ({ block: 'contacts', shown: true, locale })
    },
    {
        name: 'show_downloads',
        usage: 'Renders download buttons for the CV (PDF, DOCX, Markdown). Use whenever the visitor wants the CV as a file or a printable version.',
        description: 'Show buttons to download the candidate\'s CV (resume) in printable formats: PDF, DOCX and Markdown. Use when the visitor asks for the CV/resume as a file, a printable version or to download it.',
        input: {},
        needsLocale: true,
        run: async ({ locale }) => ({ block: 'downloads', shown: true, locale, formats: ['pdf', 'docx', 'md'] })
    },
    {
        name: 'show_project',
        usage: 'Renders details of ONE project (description, stack, links, GitHub stars). Use when the visitor asks about a specific project; still tell what it is and what was interesting about it.',
        description: 'Show a detailed card of a single project of the candidate by its id.',
        input: { id: z.string().max(64).describe('Project id from the data') },
        needsLocale: true,
        run: async ({ locale }: AssistantToolContext, { id }: { id: string }): Promise<unknown> => {
            const project = (await useAssistantData(locale).load()).projects.find(p => p.id === id)
            if (!project) return { error: 'not_found', id }
            return { block: 'project', shown: true, locale, id, name: project.name, stack: project.stack?.slice(0, 8), status: project.status, repo: project.repo }
        }
    },
    {
        name: 'show_repos',
        usage: 'Renders his open-source GitHub repositories (stars, topics). Use for questions about open source, GitHub or code samples.',
        description: 'Show the candidate\'s public GitHub repositories with stars. Optionally only for given project ids.',
        input: { ids: z.array(z.string().max(64)).max(6).optional().describe('Project ids from the data') },
        needsLocale: true,
        run: async ({ locale }: AssistantToolContext, { ids }: { ids?: string[] }): Promise<unknown> => {
            const block = await useBlocks(await useAssistantData(locale).load()).build('repos', { ids }) as { items: { id: string, repo: string, github: { stars: number } | null }[] }
            return { block: 'repos', shown: true, locale, ids, repos: block.items.map(item => ({ id: item.id, repo: item.repo, stars: item.github?.stars })) }
        }
    },
    {
        name: 'search_cv',
        usage: 'Full-text search over the CV (about, every position\'s duties, project descriptions). Returns snippets for YOU, shows nothing to the visitor. Call it BEFORE answering any detailed question not covered by DATA (a domain, a task, a library, "has he done X") instead of guessing.',
        description: 'Search the candidate\'s CV texts: summary, job descriptions and project descriptions. Returns short snippets with refs. Not visible to the visitor.',
        input: { query: z.string().min(2).max(200).describe('Keywords in the visitor\'s language and/or English') },
        needsLocale: true,
        run: async ({ locale }: AssistantToolContext, { query }: { query: string }): Promise<unknown> => {
            const hits = useKnowledge(await useAssistantData(locale).load()).search(query)
            return hits.length ? { hits } : { hits: [], note: 'Nothing found in the CV. Say so honestly and offer to pass the question to the candidate.' }
        }
    },
    {
        name: 'tech_experience',
        usage: 'Exact years of commercial experience with one technology, computed from position dates, plus projects using it. Shows nothing to the visitor. ALWAYS use it for "how many years / how long with X" instead of estimating.',
        description: 'How long the candidate has worked with a technology: years from positions where it is listed, those positions and project ids that use it. Not visible to the visitor.',
        input: { tech: z.string().min(1).max(64).describe('Technology name, e.g. "Vue", "PostgreSQL"') },
        needsLocale: true,
        run: async ({ locale }, { tech }) => useKnowledge(await useAssistantData(locale).load()).tech(tech)
    },
    {
        name: 'match_vacancy',
        usage: 'When the visitor pastes a job description or lists requirements: extract up to 20 short atomic requirements (one technology or skill each) and pass them. Renders a fit table; then give your honest take on the fit in a few sentences (strong points, gaps) and offer to pass the vacancy on to him via submit_request with its summary in "message".',
        description: 'Compare a vacancy\'s requirements with the candidate\'s CV and show a match table to the visitor.',
        input: {
            title: z.string().max(120).optional().describe('Vacancy title, if known'),
            requirements: z.array(z.string().min(1).max(80)).min(1).max(20).describe('Short atomic requirements, one technology or skill each')
        },
        needsLocale: true,
        run: async ({ locale }, { title, requirements }) => ({ block: 'match', shown: true, locale, title, ...useKnowledge(await useAssistantData(locale).load()).match(requirements) })
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
        run: async ({ locale, session }, { query, params }) => await useLookup(locale, session).groq(query, params)
    },
    {
        name: 'web_search',
        usage: 'Web search (self-hosted SearXNG). Use ONLY for public context around the CV: what a company the candidate worked at does, a technology or product from his projects. Shows the sources to the visitor; answer from the snippets in 2-4 sentences and tie it back to the candidate\'s role there using DATA. Never use it to look up the candidate personally or for off-topic questions; if snippets are thin, say so.',
        description: 'Search the web for public information about a company, product or technology mentioned in the CV. Returns top results with snippets and shows the sources to the visitor.',
        input: { query: z.string().min(2).max(200).describe('Search query, e.g. "Beget hosting company"') },
        needsLocale: true,
        needsSession: true,
        run: async ({ locale, session }, { query }) => await useLookup(locale, session).web(query)
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

export const useTools = (context: AssistantToolContext): { describe: (mode: 'native' | 'mcp') => string, build: () => ToolSet } => {
    function describe(mode: 'native' | 'mcp'): string {
        return tools.map((spec) => {
            const args = [
                ...mode === 'mcp' && spec.needsLocale ? ['locale'] : [],
                ...mode === 'mcp' && spec.needsSession ? ['session'] : [],
                ...Object.entries(spec.input).map(([key, schema]) => (schema as z.ZodType).safeParse(undefined).success ? `${key}?` : key),
            ]
            const call = mode === 'mcp' ? `tools.cv.${spec.name}` : spec.name
            return `- ${call}(${args.length ? `{ ${args.join(', ')} }` : ''}): ${spec.usage}`
        }).join('\n') + (mode === 'mcp' ? `\n- Always pass locale: "${context.locale}" and, to request tools, session: "${context.session}".` : '')
    }

    function build(): ToolSet {
        return Object.fromEntries(tools.map((spec) => [
            spec.name,
            tool({ description: spec.description, inputSchema: z.object(spec.input), execute: async (args) => await spec.run(context, args) }),
        ]))
    }

    return { describe, build }
}
