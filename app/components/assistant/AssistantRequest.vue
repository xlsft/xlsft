<script setup lang="ts">
    import { useAssistantStore, type AssistantRequest } from '~/stores/assistant'

    const props = defineProps<{
        input?: unknown
        output?: unknown
        loading?: boolean
        status?: string
    }>()

    const { t } = useI18n()
    const assistantStore = useAssistantStore()

    const pair = 'grid grid-cols-pair'

    const result = computed<AssistantRequest | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantRequest>(props.output))
    const contacts = computed<{ key: string, value: string, to?: string }[]>(() => {
        const fields = result.value?.fields ?? {}
        const phone = fields.phone ?? ''
        const telegram = (fields.telegram ?? '').replace(/^@/, '')
        return [
            fields.name && { key: 'name', value: fields.name, to: undefined },
            fields.email && { key: 'email', value: fields.email, to: `mailto:${fields.email}` },
            phone && { key: 'phone', value: phone, to: `tel:${/^\d+$/.test(phone) ? `+${phone}` : phone.replace(/[^\d+]/g, '')}` },
            telegram && { key: 'telegram', value: `@${telegram}`, to: `https://t.me/${telegram}` },
        ].filter(Boolean) as { key: string, value: string, to?: string }[]
    })
</script>

<template>
    <AssistantShell
        :command="`\0ocurl \0i-X \0w${result && !result.created ? 'PATCH' : 'POST'} \0s/api/request`"
        :loading="props.loading"
        :status="props.status"
    >
        <div v-if="result?.fields" class="flex flex-col gap-2">
            <p class="animate-rise motion-reduce:animate-none m-0 flex items-center gap-ch text-success">
                <NuxtIcon name="mingcute:check-circle-line" class="size-3.5 shrink-0"/>
                <span>{{ result.created ? '201 Created' : '200 OK' }}</span>
                <span class="text-comment"># {{ result.created ? t('ai.blocks.request_saved') : t('ai.blocks.request_updated') }}</span>
            </p>
            <dl class="m-0 flex flex-col">
                <div v-for="(contact, index) in contacts" :key="contact.key" class="animate-rise stagger motion-reduce:animate-none" :class="pair" :style="{ '--i': index + 1 }">
                    <dt class="text-dimmed">{{ contact.key }}</dt><span aria-hidden="true" class="text-line">=</span>
                    <dd class="m-0 min-w-0 truncate">
                        <a v-if="contact.to" :href="contact.to" :target="contact.to.startsWith('http') ? '_blank' : undefined" class="terminal-link terminal-link-bright">{{ contact.value }}</a>
                        <span v-else class="text-default">{{ contact.value }}</span>
                    </dd>
                </div>
                <div v-if="result.fields.message" class="animate-rise stagger motion-reduce:animate-none" :class="pair" :style="{ '--i': contacts.length + 1 }">
                    <dt class="text-dimmed">message</dt><span aria-hidden="true" class="text-line">=</span>
                    <dd class="m-0 wrap-break-word text-default/78">"{{ result.fields.message }}"</dd>
                </div>
            </dl>
            <span v-if="!contacts.length" class="text-comment"># {{ t('ai.blocks.request_no_contacts') }}</span>
            <span class="text-comment"># {{ t('ai.blocks.request_hint') }}</span>
        </div>
    </AssistantShell>
</template>
