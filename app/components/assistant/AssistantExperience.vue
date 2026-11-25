<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantCompany, type AssistantQuery } from '~/stores/assistant'

    const props = defineProps<{
        output?: unknown
        loading?: boolean
    }>()

    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<AssistantCompany> | undefined>(() => `assistant:experience:${JSON.stringify(query.value)}`, () => assistantStore.block<AssistantCompany>('experience', query.value), { server: false })

    const range = (positions: AssistantCompany['positions']): string => `${assistantStore.date(positions.at(-1)?.from)} — ${assistantStore.date(positions[0]?.to)}`
</script>

<template>
    <AssistantSkeleton v-if="props.loading || pending" variant="list"/>
    <div v-else-if="data?.items?.length" class="flex w-full flex-col gap-1.5">
        <article v-for="(company, index) in data.items" :key="company.id" class="animate-rise stagger motion-reduce:animate-none flex flex-col border" :style="{ '--i': index }">
            <header class="flex items-center justify-between gap-3 border-b px-3 py-2">
                <component :is="company.link ? 'a' : 'span'" :href="company.link" target="_blank" class="flex min-w-0 items-center gap-3 no-underline!">
                    <img v-if="assistantStore.image(company.logo)" :src="assistantStore.image(company.logo)" :alt="company.name" class="h-5 w-auto max-w-32 shrink-0 object-contain">
                    <span v-else class="truncate text-xs font-bold text-default">{{ company.name }}</span>
                    <span v-if="company.link" class="truncate text-xs text-comment transition-colors hover:text-primary">{{ assistantStore.host(company.link) }}</span>
                </component>
                <span class="shrink-0 text-xs tabular-nums text-default">{{ range(company.positions) }}</span>
            </header>
            <div class="flex flex-col gap-2.5 p-3">
                <div v-for="(position, item) in company.positions" :key="item" class="flex flex-col gap-0.5 border-l-2 pl-3" :class="position.to ? 'border-default' : 'border-primary'">
                    <div class="flex items-baseline justify-between gap-4 text-xs/5">
                        <span class="min-w-0 font-bold text-default">{{ position.name }}</span>
                        <span class="shrink-0 tabular-nums text-comment">{{ assistantStore.date(position.from) }} — {{ assistantStore.date(position.to) }}</span>
                    </div>
                    <CommonHighlight v-if="position.skills?.length" class="text-xs/5" :text="`\0c[${position.skills.map((skill) => `\0d${skill}`).join('\0c, ')}\0c]`"/>
                </div>
            </div>
        </article>
    </div>
</template>
