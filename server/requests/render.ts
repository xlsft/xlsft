import type { RequestFields } from './types'

const LABELS: Record<keyof RequestFields, string> = { name: 'Name', email: 'Email', phone: 'Phone', telegram: 'Telegram', message: 'Message' }

/** Recipients from config: an array, or a comma-separated string when it comes from a plain env value. */
export const recipients = (value: unknown): string[] => (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map(item => String(item).trim()).filter(Boolean)

export const who =(fields: RequestFields): string => fields.name ?? fields.email ?? fields.telegram ?? fields.phone ?? 'website visitor'

/** Plain-text body of a request: contacts first, the message last, changed fields marked with `*`. */
export const render = (fields: RequestFields, source: string, changed: (keyof RequestFields)[] = []): string => {
    const mark = (key: keyof RequestFields) => changed.includes(key) ? '* ' : ''
    const telegram = fields.telegram ? `@${fields.telegram} (https://t.me/${fields.telegram})` : undefined
    const contacts = (['name', 'email', 'phone', 'telegram'] as const)
        .map(key => `${mark(key)}${LABELS[key]}: ${(key === 'telegram' ? telegram : fields[key]) ?? '-'}`)
    return [
        ...contacts,
        '',
        `${mark('message')}${LABELS.message}:`,
        fields.message ?? '-',
        '',
        ...(changed.length ? ['* changed in this update', ''] : []),
        `Source: AI chat on ${source}`,
    ].join('\n')
}
