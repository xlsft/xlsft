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
        description: 'Show a block with the candidate\'s projects to the visitor. Optionally filter by tag or ids.',
        input: {
            tag: z.string().max(64).optional().describe('Project tag from the data'),
            ids: z.array(z.string().max(64)).max(8).optional(),
            limit: z.number().int().min(1).max(8).optional()
        },
        needsLocale: true,
        run: async ({ locale }, { tag, ids, limit }) => {
            const data = await useAssistantData(locale)
            const shown = (buildAssistantBlock(data, 'projects', { tag, ids, limit }) as { items: { id: string }[] }).items.map(item => item.id)
            return { block: 'projects', shown: true, locale, ids: shown }
        }
    },
    {
        name: 'show_skills',
        description: 'Show the candidate\'s technology stack block to the visitor.',
        input: {},
        needsLocale: true,
        run: async ({ locale }) => ({ block: 'skills', shown: true, locale })
    },
    {
        name: 'show_contacts',
        description: 'Show buttons to contact the candidate directly (Telegram, e-mail, phone, social links).',
        input: {},
        needsLocale: true,
        run: async ({ locale }) => ({ block: 'contacts', shown: true, locale })
    },
    {
        name: 'submit_request',
        description: 'Create a request (lead) for the candidate. Allowed with partial data. Only once per visitor session: afterwards use update_request.',
        input: requestFieldsSchema.shape,
        needsSession: true,
        run: async ({ session }, input) => allowNewRequest(session) ? await useAssistantRequests(session).create(input) : { error: 'rate_limited' }
    },
    {
        name: 'update_request',
        description: 'Add or change details of the already created request. Pass only changed fields.',
        input: requestFieldsSchema.shape,
        needsSession: true,
        run: async ({ session }, input) => await useAssistantRequests(session).update(input)
    },
]

/** Нативные AI SDK tools: контекст (локаль, сессия) зафиксирован на запрос. */
export const buildAssistantTools = (context: AssistantToolContext) => Object.fromEntries(assistantToolSpecs.map(spec => [
    spec.name,
    tool({ description: spec.description, inputSchema: z.object(spec.input), execute: async (args) => await spec.run(context, args) })
]))
