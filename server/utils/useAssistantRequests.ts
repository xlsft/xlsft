import { z } from 'zod'

/**
 * Заявки из чата: одна на сессию (sessionId живёт в браузере посетителя).
 * Создать и дополнить можно, удалить — нет.
 * Заявка = сделка в Twenty CRM (контакт, сделка на канбане и заметка с деталями), которая обновляется по мере уточнения данных.
 */

export const requestFieldsSchema = z.object({
    name: z.string().trim().max(100).optional().describe('How to address the visitor: person or company name'),
    email: z.string().trim().max(120).optional().describe('E-mail of the visitor'),
    phone: z.string().trim().max(32).optional().describe('Phone number of the visitor'),
    telegram: z.string().trim().max(64).optional().describe('Telegram nickname of the visitor'),
    message: z.string().trim().max(1000).optional().describe('Short summary of what the visitor wants (task, vacancy, question)')
})

export type RequestFields = z.infer<typeof requestFieldsSchema>
export interface RequestCrm { person?: string, opportunity?: string, note?: string, linked?: boolean }
export interface RequestRecord { crm?: RequestCrm, fields: RequestFields, updates: number, notified?: RequestFields }

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

const person = (fields: RequestFields) => {
    const [firstName = 'Website visitor', ...rest] = (fields.name ?? '').split(/\s+/).filter(Boolean)
    return { name: { firstName, lastName: rest.join(' ') }, emails: { primaryEmail: fields.email ?? '' } }
}

const title = (fields: RequestFields) => `${fields.name ?? 'Website visitor'}: ${fields.message?.slice(0, 80) ?? 'request from the chat'}`

const note = (fields: RequestFields, url: string) => [
    `**Name**: ${fields.name ?? '-'}`,
    `**Email**: ${fields.email ?? '-'}`,
    `**Phone**: ${fields.phone ?? '-'}`,
    `**Telegram**: ${fields.telegram ? `[@${fields.telegram}](https://t.me/${fields.telegram})` : '-'}`,
    '',
    fields.message ? `> ${fields.message.replace(/\n/g, '\n> ')}` : '',
    '',
    `Source: AI chat on ${url}`,
].join('\n')

const summarize = (fields: RequestFields) => ({
    fields,
    hasContact: [fields.email, fields.phone, fields.telegram].some(Boolean),
    missing: FIELDS.filter(key => !fields[key])
})

// доставка в CRM идёт в фоне и по очереди на сессию: сеть может тормозить или лежать,
// заявка при этом уже сохранена и посетителю отвечаем сразу
const queues = ((globalThis as any).__assistantRequestQueues ??= new Map<string, Promise<void>>()) as Map<string, Promise<void>>

export interface RequestState { fields: RequestFields, hasContact: boolean, missing: (keyof RequestFields)[] }
export interface AssistantRequests {
    get: () => Promise<(RequestState & { exists: true }) | { exists: false }>
    create: (input: RequestFields) => Promise<{ error: 'already_exists' | 'empty' } | (RequestState & { created: true, error?: undefined })>
    update: (input: RequestFields) => Promise<{ error: 'not_found' | 'too_many_updates' } | (RequestState & { updated: boolean, error?: undefined })>
}

export const useAssistantRequests = (sessionId: string): AssistantRequests => {
    const storage = useStorage<RequestRecord>('chat:requests')
    const site = useRuntimeConfig().public.site
    const twenty = useTwenty()
    const key = sessionId

    /** Привести записи в CRM к актуальному состоянию заявки: создать их или обновить. */
    const deliver = async () => {
        if (!twenty.enabled) return
        const record = await storage.getItem(key)
        if (!record || JSON.stringify(record.notified) === JSON.stringify(record.fields)) return
        const crm: RequestCrm = { ...record.crm }
        // id сохраняются сразу, чтобы повторная доставка после сбоя не плодила дубли
        const save = (notified?: RequestFields) => storage.setItem(key, { ...record, crm, notified: notified ?? record.notified })
        const upsert = async (object: string, id: keyof Omit<RequestCrm, 'linked'>, body: object) => {
            const current = crm[id]
            if (current) return twenty.update(object, current, body)
            crm[id] = await twenty.create(object, body)
            await save()
        }
        try {
            await upsert('people', 'person', person(record.fields))
            await upsert('opportunities', 'opportunity', { name: title(record.fields), pointOfContactId: crm.person })
            await upsert('notes', 'note', { title: 'Request details', bodyV2: { markdown: note(record.fields, site.url) } })
            if (!crm.linked) {
                await twenty.create('noteTargets', { noteId: crm.note, targetOpportunityId: crm.opportunity })
                crm.linked = true
            }
            await save(record.fields)
        } catch (error) {
            // заявка остаётся в хранилище и уйдёт со следующей доставкой
            await save()
            console.error('[assistant] crm delivery failed:', (error as Error)?.message)
        }
    }

    const enqueue = () => {
        const next = (queues.get(key) ?? Promise.resolve()).then(deliver).finally(() => { if (queues.get(key) === next) queues.delete(key) })
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
            enqueue()
            return { created: true as const, ...summarize(fields) }
        },
        update: async (input: RequestFields) => {
            const record = await storage.getItem(key)
            if (!record) return { error: 'not_found' as const }
            if (record.updates >= MAX_UPDATES) return { error: 'too_many_updates' as const }
            const patch = clean(input)
            const fields = { ...record.fields, ...patch }
            const changed = FIELDS.some(field => fields[field] !== record.fields[field])
            if (!changed) return { updated: false as const, ...summarize(fields) }
            await storage.setItem(key, { ...record, fields, updates: record.updates + 1 })
            enqueue()
            return { updated: true as const, ...summarize(fields) }
        }
    }
}
