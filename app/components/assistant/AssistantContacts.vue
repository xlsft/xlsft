<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantContact, type AssistantQuery } from '~/stores/assistant'

    const props = defineProps<{
        output?: unknown
        loading?: boolean
    }>()

    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<AssistantContact> | undefined>(() => `assistant:contacts:${JSON.stringify(query.value)}`, () => assistantStore.block<AssistantContact>('contacts', query.value), { server: false })

    const digits = (text: string): string => text.replace(/\D/g, '')

    const cards = computed<(AssistantContact & { icon: string, value?: string })[]>(() => (data.value?.items ?? []).map((link) => {
        const value = assistantStore.host(link.to)
        const same = value === link.label || (link.to.startsWith('tel:') && digits(value) === digits(link.label))
        return { ...link, icon: assistantStore.icon(link.to), value: same ? undefined : value }
    }))
</script>

<template>
    <AssistantSkeleton v-if="props.loading || pending" variant="buttons"/>
    <div v-else-if="cards.length" class="grid w-full grid-cols-2 gap-1.5 max-sm:grid-cols-1">
        <a
            v-for="(card, index) in cards"
            :key="card.to"
            :href="card.to"
            :target="card.to.startsWith('http') ? '_blank' : undefined"
            class="animate-rise stagger motion-reduce:animate-none group flex min-w-0 items-center gap-3 border p-2 no-underline! transition-colors hover:border-primary"
            :style="{ '--i': index }"
        >
            <span class="flex size-8 shrink-0 items-center justify-center border transition-colors group-hover:border-primary group-hover:text-primary">
                <NuxtIcon :name="card.icon" class="size-4"/>
            </span>
            <span class="flex min-w-0 grow flex-col text-xs/4">
                <span class="truncate text-default">{{ card.label }}</span>
                <span v-if="card.value" class="truncate text-comment">{{ card.value }}</span>
            </span>
            <NuxtIcon name="mingcute:arrow-right-up-line" class="size-3.5 shrink-0 text-dimmed transition-colors group-hover:text-primary"/>
        </a>
    </div>
</template>
