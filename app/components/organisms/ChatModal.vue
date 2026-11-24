<script setup lang="ts">
    import { useLocalStorage } from '@vueuse/core'
    import { DefaultChatTransport, getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from 'ai'
    import { Chat } from '@ai-sdk/vue'
    import { isToolStreaming } from '@nuxt/ui/utils/ai'

    const open = defineModel<boolean>('open', { default: false })

    const { t, locale } = useI18n()
    const assistant = useAssistant()

    // сколько последних сообщений уходит на сервер и сколько хранится в браузере
    const SEND_WINDOW = 12
    const STORE_LIMIT = 60

    // состояние чата переживает перезагрузку страницы
    const sessionId = useLocalStorage('assistant:session', '')
    const stored = useLocalStorage<UIMessage[]>('assistant:messages', [])
    if (!sessionId.value) sessionId.value = crypto.randomUUID()

    const chat = new Chat<UIMessage>({
        messages: stored.value,
        transport: new DefaultChatTransport({
            api: '/api/chat',
            prepareSendMessagesRequest: ({ messages }) => ({
                body: { sessionId: sessionId.value, locale: locale.value, messages: messages.slice(-SEND_WINDOW) }
            })
        }),
        onError: (error) => console.error(error)
    })
    const input = ref('')

    watch(() => [chat.status, chat.messages.length] as const, ([status]) => {
        if (status === 'streaming' || status === 'submitted') return
        stored.value = chat.messages.slice(-STORE_LIMIT)
    }, { flush: 'post' })

    const reset = () => {
        chat.stop()
        chat.messages = []
        stored.value = []
        sessionId.value = crypto.randomUUID()
    }

    const send = (text: string) => {
        const value = text.trim()
        if (!value || chat.status === 'streaming' || chat.status === 'submitted') return
        chat.sendMessage({ text: value.slice(0, 1000) })
    }

    // отбивка показывается всегда первой и не уходит в модель
    const greeting = computed<UIMessage>(() => ({ id: 'greeting', role: 'assistant', parts: [{ type: 'text', text: t('ai.greeting') }] }))
    // ошибка запроса показывается в ленте как реплика ассистента: причина, повтор и прямые контакты
    const errorText = computed(() => {
        const message = String(chat.error?.message || '')
        if (/unavailable|503/i.test(message)) return t('ai.errors.unavailable')
        if (/too many|429/i.test(message)) return t('ai.errors.rate_limit')
        return t('ai.errors.generic')
    })
    const errorMessage = computed<UIMessage>(() => ({ id: 'error', role: 'assistant', parts: [{ type: 'text', text: errorText.value }] }))
    const messages = computed(() => [greeting.value, ...chat.messages, ...(chat.error && chat.status === 'error' ? [errorMessage.value] : [])])

    const chips = computed(() => [
        { label: t('ai.chips.about'), icon: 'mingcute:user-3-line' },
        { label: t('ai.chips.experience'), icon: 'mingcute:briefcase-line' },
        { label: t('ai.chips.projects'), icon: 'mingcute:code-line' },
        { label: t('ai.chips.contact'), icon: 'mingcute:send-line' },
    ])

    // реплика, с которой чат открыли снаружи (например, кнопкой «Связаться»)
    onMounted(() => {
        const text = assistant.pending.value
        assistant.pending.value = null
        if (!text) return
        const last = [...chat.messages].reverse().find(message => message.role === 'user')
        const lastText = last?.parts.find(isTextUIPart)?.text
        if (lastText !== text || chat.messages.at(-1)?.role === 'user') send(text)
    })

    // OpenCode исполняет MCP-инструменты через общий инструмент execute: действие видно только в коде вызова
    // (tools.cv.show_projects(...)), поэтому определяем его и по имени инструмента, и по коду
    const blockTools = ['show_experience', 'show_projects', 'show_project', 'show_repos', 'show_skills', 'show_contacts', 'show_downloads', 'match_vacancy', 'web_search', 'submit_request', 'update_request']
    // есть ли в сообщении то, что видит посетитель (текст или блок), а не только скрытые рассуждения и служебные вызовы
    const hasVisible = (message: UIMessage) => message.parts.some(part =>
        (isTextUIPart(part) && !!part.text) || (isToolUIPart(part) && !!blockTool(part)))
    const blockTool = (part: Parameters<typeof getToolName>[0]) => {
        const named = blockTools.find(name => getToolName(part).endsWith(name))
        if (named) return named
        const code = (part as { input?: { code?: unknown } }).input?.code
        return typeof code === 'string' ? code.match(new RegExp(`tools\\.cv\\.(${blockTools.join('|')})\\b`))?.[1] : undefined
    }
</script>

<template>
    <!-- размер и подложка как у просмотра галереи: окно max-w-7xl на размытом фоне, на мобильных — на весь экран -->
    <NuxtModal
        v-model:open="open"
        fullscreen
        :title="t('ai.title')"
        :description="t('ai.title')"
        :ui="{ overlay: 'bg-default/80 backdrop-blur-md', content: 'bg-transparent! divide-y-0 ring-0! shadow-none!' }"
    >
        <template #content>
          <div class="flex h-full min-h-0 items-center justify-center sm:p-6 lg:p-10" @click.self="open = false">
            <div class="flex size-full max-w-7xl flex-col border-default bg-default sm:border">
            <!-- заголовок как в окне галереи: «терминальная» строка команды и квадратные кнопки с border-l -->
            <header class="flex h-12 shrink-0 items-stretch border-b border-default">
                <p class="flex min-w-0 flex-1 items-center gap-3 px-4 text-sm sm:px-5">
                    <span class="truncate text-dimmed max-sm:hidden">~/xlsft/assistant</span>
                    <span class="shrink-0 text-primary max-sm:hidden" aria-hidden="true">$</span>
                    <span class="shrink-0 max-sm:hidden" aria-hidden="true">chat</span>
                    <span class="shrink-0 text-success max-sm:hidden" aria-hidden="true">{{ sessionId.slice(0, 8) }}.log</span>
                    <span class="truncate font-bold sm:hidden">{{ t('ai.title') }}</span>
                </p>
                <button
                    v-if="chat.messages.length"
                    type="button"
                    class="flex aspect-square shrink-0 cursor-pointer items-center justify-center border-l border-default transition-colors hover:bg-inverted hover:text-inverted focus-visible:-outline-offset-2"
                    :aria-label="t('ai.reset')"
                    :title="t('ai.reset')"
                    @click="reset"
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"/></svg>
                </button>
                <button
                    type="button"
                    class="flex aspect-square shrink-0 cursor-pointer items-center justify-center border-l border-default transition-colors hover:bg-inverted hover:text-inverted focus-visible:-outline-offset-2"
                    :aria-label="t('labels.close')"
                    @click="open = false"
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
            </header>
            <NuxtChatPalette class="grow min-h-0 p-0" :ui="{ prompt: 'border-t-0' }">
                <NuxtChatMessages
                    :messages :status="chat.status" class="p-4"
                    :auto-scroll="{ color: 'neutral', variant: 'outline', class: 'rounded-none' }"
                    :ui="{ autoScroll: 'rounded-none', indicator: '*:rounded-none' }"
                    :assistant="{ ui: { container: 'gap-4' }, avatar: { icon: 'mage:stars-c-fill', size: 'xs', ui: { root: 'bg-primary rounded-none *:text-white!' } } }"
                    :user="{ ui: { container: 'flex-row-reverse justify-start! gap-4' }, avatar: { icon: 'mingcute:user-2-fill', size: 'xs', ui: { root: 'bg-border/50 rounded-none' } } }"
                >
                    <template #indicator>
                        <div class="flex min-h-6 items-center text-sm"><NuxtChatShimmer :text="t('ai.working')"/></div>
                    </template>
                    <template #content="{ message }">
                        <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
                            <template v-if="isReasoningUIPart(part)"/>
                            <template v-else-if="isToolUIPart(part)">
                                <template v-if="blockTool(part) && part.state !== 'output-error'">
                                    <!-- статус действия — в строку с аватаром, под ним скелетон, затем блок -->
                                    <div v-if="part.state !== 'output-available'" class="flex min-h-6 items-center">
                                        <NuxtChatTool :text="t(`ai.tools.${blockTool(part)}`)" :streaming="isToolStreaming(part)"/>
                                    </div>
                                    <OrganismsChatBlock
                                        class="my-2 first:mt-0"
                                        :name="blockTool(part)!"
                                        :output="part.state === 'output-available' ? part.output : undefined"
                                        :loading="part.state !== 'output-available'"
                                    />
                                </template>
                            </template>
                            <div
                                v-else-if="isTextUIPart(part) && part.text"
                                class="text-sm leading-6"
                                :class="[message.role === 'user' ? 'bg-primary px-2 py-0.5' : '', message.id === 'error' && 'text-error']"
                            >
                                <MDC :value="part.text" :cache-key="`${message.id}-${index}`" class="*:first:mt-0 *:last:mb-0 [&_p]:my-0 [&_p]:leading-6 [&_p+p]:mt-2"/>
                            </div>
                        </template>
                        <div v-if="chat.status === 'streaming' && message.id === chat.messages.at(-1)?.id && !hasVisible(message)" class="flex min-h-6 items-center text-sm"><NuxtChatShimmer :text="t('ai.working')"/></div>
                        <div v-if="message.id === 'error'" class="mt-3 flex flex-col gap-3">
                            <NuxtButton class="w-fit rounded-none text-sm! text-default/50! underline" size="sm" variant="outline" color="neutral" icon="mingcute:refresh-2-line" @click="chat.regenerate()">{{ t('ai.errors.retry') }}</NuxtButton>
                            <OrganismsChatBlock name="show_contacts" :output="{ block: 'contacts', shown: true, locale }"/>
                        </div>
                        <div v-if="message.id === 'greeting' && !chat.messages.length" class="mt-3 flex flex-wrap gap-2">
                            <NuxtButton v-for="chip in chips" :key="chip.label" size="sm" variant="outline" color="neutral" class="rounded-none" :icon="chip.icon" @click="send(chip.label)">{{ chip.label }}</NuxtButton>
                        </div>
                    </template>
                </NuxtChatMessages>
                <template #prompt>
                    <p v-if="!chat.messages.length" class="px-4 pb-2 text-[11px] text-dimmed">
                        {{ t('ai.legal.leading') }}
                        <NuxtLink target="_blank" :to="`/${locale}/legal/privacy`" class="text-[11px]!">{{ t('ai.legal.privacy') }}</NuxtLink>
                        {{ t('ai.legal.and') }}
                        <NuxtLink target="_blank" :to="`/${locale}/legal/processing`" class="text-[11px]!">{{ t('ai.legal.processing') }}</NuxtLink>
                    </p>
                    <NuxtChatPrompt
                        :ui="{ root: 'px-0 border-none! rounded-none', body: 'items-end! pe-2', base: 'text-sm! leading-6' }"
                        :placeholder="t('ai.placeholder')"
                        :maxlength="1000"
                        :maxrows="5"
                        v-model="input"
                        @submit="() => { send(input); input = '' }"
                    >
                        <NuxtChatPromptSubmit :status="chat.status" @stop="chat.stop()" @reload="chat.regenerate()"/>
                    </NuxtChatPrompt>
                </template>
            </NuxtChatPalette>
            </div>
          </div>
        </template>
    </NuxtModal>
</template>
