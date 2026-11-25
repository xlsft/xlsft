<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantQuery, type AssistantRepo } from '~/stores/assistant'

    const props = defineProps<{
        output?: unknown
        loading?: boolean
    }>()

    const { t } = useI18n()
    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<AssistantRepo> | undefined>(() => `assistant:repos:${JSON.stringify(query.value)}`, () => assistantStore.block<AssistantRepo>('repos', query.value), { server: false })
</script>

<template>
    <AssistantSkeleton v-if="props.loading || pending" variant="list"/>
    <div v-else-if="data?.items?.length" class="flex flex-col border">
        <a
            v-for="(item, index) in data.items"
            :key="item.repo"
            :href="`https://github.com/${item.repo}`"
            target="_blank"
            class="animate-rise stagger motion-reduce:animate-none flex flex-col gap-1.5 p-3 no-underline! transition-colors hover:bg-elevated"
            :class="index !== 0 && 'border-t'"
            :style="{ '--i': index }"
        >
            <span class="flex items-center justify-between gap-3 text-xs/5">
                <span class="flex min-w-0 items-center gap-2"><NuxtIcon name="mingcute:github-line" class="size-4 shrink-0"/><span class="truncate font-bold text-default">{{ item.repo }}</span></span>
                <span class="flex shrink-0 items-center gap-3 tabular-nums text-dimmed">
                    <span v-if="item.github?.language">{{ item.github.language }}</span>
                    <span class="flex items-center gap-1" :title="t('ai.blocks.stars')"><NuxtIcon name="mingcute:star-line" class="size-3.5"/>{{ item.github?.stars ?? '—' }}</span>
                    <span v-if="item.github?.forks" class="flex items-center gap-1" :title="t('ai.blocks.forks')"><NuxtIcon name="mingcute:git-branch-line" class="size-3.5"/>{{ item.github.forks }}</span>
                </span>
            </span>
            <span class="text-xs text-dimmed">{{ item.name }}</span>
            <span v-if="item.github?.topics?.length" class="flex flex-wrap gap-1">
                <NuxtBadge v-for="topic in item.github.topics.slice(0, 6)" :key="topic" :label="topic" size="sm" color="neutral" variant="outline" class="rounded-none"/>
            </span>
        </a>
    </div>
</template>
