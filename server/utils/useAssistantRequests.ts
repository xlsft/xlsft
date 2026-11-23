import { z } from 'zod'

/**
 * Заявки из чата: одна на сессию (sessionId живёт в браузере посетителя).
 * Создать и дополнить можно, удалить — нет.
 * Заявка = одно сообщение в Telegram, которое редактируется по мере уточнения данных.
 */

export const requestFieldsSchema = z.object({
    name: z.string().trim().max(100).optional().describe('How to address the visitor: person or company name'),
    email: z.string().trim().max(120).optional().describe('E-mail of the visitor'),
    phone: z.string().trim().max(32).optional().describe('Phone number of the visitor'),
    telegram: z.string().trim().max(64).optional().describe('Telegram nickname of the visitor'),
    message: z.string().trim().max(1000).optional().describe('Short summary of what the visitor wants (task, vacancy, question)')
})

export type RequestFields = z.infer<typeof requestFieldsSchema>
export type RequestRecord = { messageId?: number, fields: RequestFields, updates: number, notified?: RequestFields }

const FIELDS = ['name', 'email', 'phone', 'telegram', 'message'] as const
const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[a-zA-Z]{2,}$/
const MAX_UPDATES = 10

const esc = (value?: string) => (value || '-').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

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

const render = (fields: RequestFields, url: string, title: string) => `<strong>${title} (${esc(url)})</strong>

<strong>Name</strong>: <code>${esc(fields.name)}</code>
<strong>Email</strong>: <code>${esc(fields.email)}</code>
<strong>Phone</strong>: <code>${esc(fields.phone)}</code>
<strong>Telegram</strong>: <code>${esc(fields.telegram)}</code>
<strong>Message</strong>: <blockquote>${esc(fields.message)}</blockquote>`

const summarize = (fields: RequestFields) => ({
    fields,
    hasContact: !!(fields.email || fields.phone || fields.telegram),
    missing: FIELDS.filter(key => !fields[key])
})

// доставка в Telegram идёт в фоне и по очереди на сессию: сеть может тормозить или лежать,
// заявка при этом уже сохранена и посетителю отвечаем сразу
const TELEGRAM_TIMEOUT_MS = 15_000
const queues = ((globalThis as any).__assistantRequestQueues ??= new Map<string, Promise<void>>()) as Map<string, Promise<void>>

const withTimeout = <T>(promise: Promise<T>) => Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('telegram timeout')), TELEGRAM_TIMEOUT_MS))
])

export const useAssistantRequests = (sessionId: string) => {
    const storage = useStorage<RequestRecord>('chat:requests')
    const config = useRuntimeConfig().public.config
    const key = sessionId

    /** Привести сообщение в Telegram к актуальному состоянию заявки: создать его или отредактировать. */
    const deliver = async () => {
        const bot = useTelegramBot()
        if (!bot || !config.requests.telegram) return
        const record = await storage.getItem(key)
        if (!record || JSON.stringify(record.notified) === JSON.stringify(record.fields)) return
        const chat = config.requests.telegram
        try {
            if (!record.messageId) {
                const message = await withTimeout(bot.api.sendMessage(chat, render(record.fields, config.head.url, 'New AI request!'), { parse_mode: 'HTML' }))
                await storage.setItem(key, { ...record, messageId: message.message_id, notified: record.fields })
                return
            }
            const changed = FIELDS.filter(field => record.fields[field] !== record.notified?.[field])
            await withTimeout(bot.api.editMessageText(chat, record.messageId, render(record.fields, config.head.url, 'AI request'), { parse_mode: 'HTML' })).catch(() => {})
            // правка сообщения не присылает уведомление — дублируем коротким ответом
            await withTimeout(bot.api.sendMessage(chat, `Request updated: ${changed.join(', ')}`, { reply_parameters: { message_id: record.messageId } })).catch(() => {})
            await storage.setItem(key, { ...record, notified: record.fields })
        } catch (error) {
            // заявка остаётся в хранилище и уйдёт со следующей доставкой
            console.error('[assistant] telegram delivery failed:', (error as Error)?.message)
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
