<script setup lang="ts">
    import { useChat } from '@ai-sdk/vue'
    import { useLocalStorage } from '@vueuse/core'
    import { DefaultChatTransport, isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from 'ai'
    import type { Component } from 'vue'
    import { ASSISTANT_SEND_WINDOW, ASSISTANT_STORE_LIMIT, useAssistantStore, type AssistantTool } from '~/stores/assistant'

    const { t, locale } = useI18n()
    const assistantStore = useAssistantStore()

    const blocks: Record<AssistantTool, Component> = {
        show_experience: resolveComponent('AssistantExperience') as Component,
        show_projects: resolveComponent('AssistantProjects') as Component,
        show_project: resolveComponent('AssistantProject') as Component,
        show_repos: resolveComponent('AssistantRepos') as Component,
        show_skills: resolveComponent('AssistantSkills') as Component,
        show_contacts: resolveComponent('AssistantContacts') as Component,
        show_downloads: resolveComponent('AssistantDownloads') as Component,
        match_vacancy: resolveComponent('AssistantMatch') as Component,
        web_search: resolveComponent('AssistantSources') as Component,
        submit_request: resolveComponent('AssistantRequest') as Component,
        update_request: resolveComponent('AssistantRequest') as Component,
    }

    const session = useLocalStorage<string>('assistant:session', crypto.randomUUID())
    const stored = useLocalStorage<UIMessage[]>('assistant:messages', [])

    const { messages: history, status, error, sendMessage, regenerate, stop } = useChat<UIMessage>({
        messages: stored.value,
        transport: new DefaultChatTransport({
            api: '/api/chat',
            prepareSendMessagesRequest: ({ messages }) => ({
                body: { sessionId: session.value, locale: locale.value, messages: messages.slice(-ASSISTANT_SEND_WINDOW) },
            }),
        }),
        onError: (cause) => console.error(cause),
    })

    const chips = [
        { label: 'ai.chips.about', icon: 'mingcute:user-3-line' },
        { label: 'ai.chips.experience', icon: 'mingcute:briefcase-line' },
        { label: 'ai.chips.projects', icon: 'mingcute:code-line' },
        { label: 'ai.chips.contact', icon: 'mingcute:send-line' },
    ]

    const state = ref<{ input?: string }>({})

    const methods = {
        reset(): void {
            stop()
            history.value = []
            stored.value = []
            session.value = crypto.randomUUID()
        },
        send(text: string): void {
            const value = text.trim()
            if (!value || status.value === 'streaming' || status.value === 'submitted') return
            sendMessage({ text: value.slice(0, 1000) })
        },
        submit(): void {
            methods.send(state.value.input ?? '')
            state.value.input = undefined
        },
        feed(): UIMessage[] {
            const greeting: UIMessage = { id: 'greeting', role: 'assistant', parts: [{ type: 'text', text: t('ai.greeting') }] }
            if (!error.value || status.value !== 'error') return [greeting, ...history.value]
            const message = error.value.message
            const text = /unavailable|503/i.test(message) ? t('ai.errors.unavailable') : /too many|429/i.test(message) ? t('ai.errors.rate_limit') : t('ai.errors.generic')
            return [greeting, ...history.value, { id: 'error', role: 'assistant', parts: [{ type: 'text', text }] }]
        },
        visible(message: UIMessage): boolean {
            return message.parts.some((part) => (isTextUIPart(part) && !!part.text) || (isToolUIPart(part) && !!assistantStore.tool(part)))
        },
    }


    watch(() => [status.value, history.value.length] as const, ([value]) => {
        if (value === 'streaming' || value === 'submitted') return
        stored.value = history.value.slice(-ASSISTANT_STORE_LIMIT)
    }, { flush: 'post' })

    onMounted(() => {
        const text = assistantStore.pending
        assistantStore.pending = undefined
        if (!text) return
        const last = [...history.value].reverse().find((message) => message.role === 'user')?.parts.find(isTextUIPart)?.text
        if (last !== text || history.value.at(-1)?.role === 'user') methods.send(text)
    })
</script>

<template>
    <CommonModal
        v-model:open="assistantStore.open"
        :title="t('ai.title')"
        :description="t('ai.title')"
        :heading="t('ai.title')"
        :command="`\0d~/xlsft/assistant \0p$ \0ochat \0s${session.slice(0, 8)}.log`"
    >
        <template #actions="{ button }">
            <button v-if="history.length" type="button" :class="button" :aria-label="t('ai.reset')" :title="t('ai.reset')" @click="methods.reset">
                <svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"/></svg>
            </button>
        </template>
        <NuxtChatPalette class="grow min-h-0 p-0" :ui="{ prompt: 'border-t-0' }">
            <NuxtChatMessages
                :messages="methods.feed()" :status="status" class="p-4"
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
                            <component
                                :is="blocks[assistantStore.tool(part)!]"
                                v-if="assistantStore.tool(part) && part.state !== 'output-error'"
                                class="animate-fade motion-reduce:animate-none my-3 first:mt-0"
                                :input="part.input"
                                :output="part.state === 'output-available' ? part.output : undefined"
                                :loading="part.state !== 'output-available'"
                                :status="t(`ai.tools.${assistantStore.tool(part)}`)"
                            />
                        </template>
                        <div
                            v-else-if="isTextUIPart(part) && part.text"
                            class="text-sm/6"
                            :class="[message.role === 'user' ? 'bg-primary px-2 py-0.5' : '', message.id === 'error' && 'text-error']"
                        >
                            <MDC :value="part.text" :cache-key="`${message.id}-${index}`" class="*:first:mt-0 *:last:mb-0 md-chat"/>
                        </div>
                    </template>
                    <div v-if="status === 'streaming' && message.id === history.at(-1)?.id && !methods.visible(message)" class="flex min-h-6 items-center text-sm"><NuxtChatShimmer :text="t('ai.working')"/></div>
                    <div v-if="message.id === 'error'" class="mt-3 flex flex-col gap-3">
                        <NuxtButton class="w-fit rounded-none text-sm! text-default/50! underline" size="sm" variant="outline" color="neutral" icon="mingcute:refresh-2-line" @click="regenerate()">{{ t('ai.errors.retry') }}</NuxtButton>
                        <AssistantContacts :output="{ block: 'contacts', shown: true, locale }" :status="t('ai.tools.show_contacts')"/>
                    </div>
                    <div v-if="message.id === 'greeting' && !history.length" class="mt-3 flex flex-wrap gap-2">
                        <NuxtButton v-for="chip in chips" :key="chip.label" size="sm" variant="outline" color="neutral" class="rounded-none" :icon="chip.icon" @click="methods.send(t(chip.label))">{{ t(chip.label) }}</NuxtButton>
                    </div>
                </template>
            </NuxtChatMessages>
            <template #prompt>
                <p v-if="!history.length" class="px-4 pb-2 text-2xs text-dimmed">
                    {{ t('ai.legal.leading') }}
                    <NuxtLink target="_blank" :to="`/${locale}/legal/privacy`" class="text-2xs!">{{ t('ai.legal.privacy') }}</NuxtLink>
                    {{ t('ai.legal.and') }}
                    <NuxtLink target="_blank" :to="`/${locale}/legal/processing`" class="text-2xs!">{{ t('ai.legal.processing') }}</NuxtLink>
                </p>
                <NuxtChatPrompt
                    :ui="{ root: 'px-0 border-none! rounded-none', body: 'items-end! pe-2', base: 'text-sm! leading-6' }"
                    :placeholder="t('ai.placeholder')"
                    :maxlength="1000"
                    :maxrows="5"
                    v-model="state.input"
                    @submit="methods.submit"
                >
                    <NuxtChatPromptSubmit :status="status" @stop="stop()" @reload="regenerate()"/>
                </NuxtChatPrompt>
            </template>
        </NuxtChatPalette>
    </CommonModal>
</template>
