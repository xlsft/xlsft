import { getToolName } from 'ai'
import { ASSISTANT_TOOLS } from './const'
import type { AssistantBlockType, AssistantImage, AssistantList, AssistantQuery, AssistantTool } from './types'

export const useAssistantStore = defineStore('assistant', () => {
    const { t, locale } = useI18n()
    const theme = useColorMode()

    const open = ref<boolean>()
    const pending = ref<string | undefined>()

    const methods = {
        ask(text?: string): void {
            pending.value = text?.length ? text : undefined
            open.value = true
        },
        tool(part: Parameters<typeof getToolName>[0]): AssistantTool | undefined {
            const named = ASSISTANT_TOOLS.find((name) => getToolName(part).endsWith(name))
            if (named) return named
            const code = (part as { input?: { code?: unknown } }).input?.code
            return typeof code === 'string' ? new RegExp(`tools\\.cv\\.(${ASSISTANT_TOOLS.join('|')})\\b`).exec(code)?.[1] as AssistantTool | undefined : undefined
        },
        parse<T>(value: unknown): T | undefined {
            if (typeof value === 'string') {
                try { return methods.parse<T>(JSON.parse(value)) } catch { return undefined }
            }
            if (Array.isArray(value)) return methods.parse<T>((value as { type?: string, text?: string }[]).find((part) => part.type === 'text')?.text)
            const record = value as { structuredContent?: T, content?: { type?: string, text?: string }[] } | undefined
            if (record?.structuredContent) return record.structuredContent
            if (Array.isArray(record?.content)) return methods.parse<T>(record.content.find((part) => part.type === 'text')?.text)
            return (value ?? undefined) as T | undefined
        },
        async block<T>(type: AssistantBlockType, query?: AssistantQuery & AssistantList<T>): Promise<AssistantList<T> | undefined> {
            if (!query || query.error) return undefined
            if (query.items ?? query.groups) return query
            return await $fetch<AssistantList<T>>('/api/assistant/block', {
                query: { type, locale: query.locale ?? locale.value, ids: (query.id ? [query.id] : query.ids)?.join(','), tag: query.tag, company: query.company },
            })
        },
        image(value?: AssistantImage): string | undefined {
            return typeof value === 'string' ? value : value?.[theme.value as 'dark' | 'light'] ?? value?.dark
        },
        date(value?: string): string {
            return value ? new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(new Date(value)) : t('ai.blocks.now')
        },
        host(url: string): string {
            return url.replace(/^(mailto:|tel:|https?:\/\/(www\.)?)/, '').replace(/\/$/, '')
        },
        domain(url: string): string {
            try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
        },
        icon(to: string): string {
            if (to.startsWith('mailto:')) return 'mingcute:mail-line'
            if (to.startsWith('tel:')) return 'mingcute:phone-line'
            if (/t\.me|telegram/.test(to)) return 'mingcute:telegram-line'
            if (to.includes('github')) return 'mingcute:github-line'
            if (to.includes('linkedin')) return 'mingcute:linkedin-line'
            return 'mingcute:link-line'
        },
        project(id: string): void {
            window.open(`/${locale.value}/projects/${id}`, '_blank')
        },
    }

    return { open, pending, ...methods }
})
