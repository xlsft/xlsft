<script setup lang="ts">
    import { useAssistantStore, type AssistantRequest } from '~/stores/assistant'

    const props = defineProps<{
        output?: unknown
        loading?: boolean
    }>()

    const { t } = useI18n()
    const assistantStore = useAssistantStore()

    const result = computed<AssistantRequest | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantRequest>(props.output))
    const contacts = computed<{ key: string, icon: string, value: string, to?: string }[]>(() => {
        const fields = result.value?.fields ?? {}
        const phone = fields.phone ?? ''
        const telegram = (fields.telegram ?? '').replace(/^@/, '')
        return [
            fields.name && { key: 'name', icon: 'mingcute:user-3-line', value: fields.name, to: undefined },
            fields.email && { key: 'email', icon: 'mingcute:mail-line', value: fields.email, to: `mailto:${fields.email}` },
            phone && { key: 'phone', icon: 'mingcute:phone-line', value: phone, to: `tel:${/^\d+$/.test(phone) ? `+${phone}` : phone.replace(/[^\d+]/g, '')}` },
            telegram && { key: 'telegram', icon: 'mingcute:telegram-line', value: `@${telegram}`, to: `https://t.me/${telegram}` },
        ].filter(Boolean) as { key: string, icon: string, value: string, to?: string }[]
    })
</script>

<template>
    <AssistantSkeleton v-if="props.loading"/>
    <div v-else-if="result?.fields" class="animate-rise stagger motion-reduce:animate-none flex w-full border">
        <div class="flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 border-r bg-success/5 p-3 text-center">
            <NuxtIcon name="mingcute:check-circle-line" class="size-7 text-success"/>
            <span class="text-xs/4 text-success">{{ result.created ? t('ai.blocks.request_saved') : t('ai.blocks.request_updated') }}</span>
        </div>
        <div class="flex min-w-0 grow flex-col gap-3 p-3">
            <div class="flex flex-col gap-0.5 text-xs/5">
                <span class="font-bold text-default">{{ t('ai.blocks.request') }}</span>
                <span class="text-comment"># {{ t('ai.blocks.request_hint') }}</span>
            </div>
            <div v-if="contacts.length" class="flex flex-wrap gap-1.5">
                <component
                    :is="contact.to ? 'a' : 'span'"
                    v-for="(contact, index) in contacts"
                    :key="contact.key"
                    :href="contact.to"
                    :target="contact.to?.startsWith('http') ? '_blank' : undefined"
                    class="animate-rise stagger motion-reduce:animate-none flex min-w-0 items-center gap-1.5 border px-2 py-1 text-xs/4 text-default no-underline! transition-colors"
                    :class="contact.to && 'hover:border-primary hover:text-primary'"
                    :style="{ '--i': index + 1 }"
                    :aria-label="t(`ai.blocks.${contact.key}`)"
                >
                    <NuxtIcon :name="contact.icon" class="size-3.5 shrink-0 text-dimmed"/><span class="truncate">{{ contact.value }}</span>
                </component>
            </div>
            <span v-else class="text-xs/4 text-comment"># {{ t('ai.blocks.request_no_contacts') }}</span>
            <p v-if="result.fields.message" class="animate-rise stagger motion-reduce:animate-none m-0 border-l-2 border-primary pl-3 text-xs/5 wrap-break-word text-default" :style="{ '--i': contacts.length + 1 }">{{ result.fields.message }}</p>
        </div>
    </div>
</template>
