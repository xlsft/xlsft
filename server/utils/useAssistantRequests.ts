import { z } from 'zod'
import type { RequestFields } from '../requests/types'

/**
 * Заявки из чата: одна на сессию (sessionId живёт в браузере посетителя).
 * Создать и дополнить можно, удалить — нет.
 * Новая заявка и каждое её уточнение уходят наружу через useRequests (по умолчанию во все провайдеры).
 */

export const requestFieldsSchema = z.object({
    name: z.string().trim().max(100).optional().describe('How to address the visitor: person or company name'),
    email: z.string().trim().max(120).optional().describe('E-mail of the visitor'),
    phone: z.string().trim().max(32).optional().describe('Phone number of the visitor'),
    telegram: z.string().trim().max(64).optional().describe('Telegram nickname of the visitor'),
    message: z.string().trim().max(1000).optional().describe('Short summary of what the visitor wants (task, vacancy, question)')
}) satisfies z.ZodType<RequestFields>

export interface RequestRecord { fields: RequestFields, updates: number }

const FIELDS = ['name', 'email', 'phone', 'telegram', 'message'] as const
const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[a-zA-Z]{2,}$/
const MAX_UPDATES = 10

const clean = (fields: RequestFields): RequestFields => {
    const out: RequestFields = {}
    for (const key of FIELDS) {
        let value = fields[key]?.trim()
        if (!value) continue
        if (key === 'telegram') value = value.replace(/^(https?:\/\/)?(t\.me\/|telegram\.me\/)?@?/i, '')
        if (key === 'email' && !EMAIL.test(value)) continue
        if (key === 'phone' && value.replace(/\D/g, '').length < 7) continue
        if (value) out[key] = value
    }
    return out
}

const summarize = (fields: RequestFields) => ({
    fields,
    hasContact: [fields.email, fields.phone, fields.telegram].some(Boolean),
    missing: FIELDS.filter(key => !fields[key])
})

// доставка идёт в фоне и по очереди на сессию: сеть может тормозить или лежать,
// заявка при этом уже сохранена и посетителю отвечаем сразу, а уточнение не обгонит создание
const queues = ((globalThis as any).__assistantRequestQueues ??= new Map<string, Promise<void>>()) as Map<string, Promise<void>>

export interface RequestState { fields: RequestFields, hasContact: boolean, missing: (keyof RequestFields)[] }
export interface AssistantRequests {
    get: () => Promise<(RequestState & { exists: true }) | { exists: false }>
    create: (input: RequestFields) => Promise<{ error: 'already_exists' | 'empty' } | (RequestState & { created: true, error?: undefined })>
    update: (input: RequestFields) => Promise<{ error: 'not_found' | 'too_many_updates' } | (RequestState & { updated: boolean, error?: undefined })>
}

export const useAssistantRequests = (sessionId: string): AssistantRequests => {
    const storage = useStorage<RequestRecord>('chat:requests')
    const requests = useRequests()
    const key = sessionId

    const enqueue = (deliver: () => Promise<unknown>) => {
        const next = (queues.get(key) ?? Promise.resolve()).then(deliver).then(() => undefined).finally(() => { if (queues.get(key) === next) queues.delete(key) })
        queues.set(key, next)
    }

    return {
        get: async () => {
            const record = await storage.getItem(key)
            return record ? { exists: true as const, ...summarize(record.fields) } : { exists: false as const }
        },
        create: async (input: RequestFields) => {
            if (await storage.hasItem(key)) return { error: 'already_exists' as const }
            const fields = clean(input)
            if (!Object.keys(fields).length) return { error: 'empty' as const }
            await storage.setItem(key, { fields, updates: 0 })
            enqueue(() => requests.create({ id: key, fields }))
            return { created: true as const, ...summarize(fields) }
        },
        update: async (input: RequestFields) => {
            const record = await storage.getItem(key)
            if (!record) return { error: 'not_found' as const }
            if (record.updates >= MAX_UPDATES) return { error: 'too_many_updates' as const }
            const patch = clean(input)
            const fields = { ...record.fields, ...patch }
            const changed = FIELDS.filter(field => fields[field] !== record.fields[field])
            if (!changed.length) return { updated: false as const, ...summarize(fields) }
            await storage.setItem(key, { ...record, fields, updates: record.updates + 1 })
            enqueue(() => requests.patch({ id: key, fields, changed }))
            return { updated: true as const, ...summarize(fields) }
        }
    }
}
