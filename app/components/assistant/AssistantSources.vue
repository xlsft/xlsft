<script setup lang="ts">
    import { useAssistantStore, type AssistantSources } from '~/stores/assistant'

    const props = defineProps<{
        output?: unknown
        loading?: boolean
    }>()

    const { t } = useI18n()
    const assistantStore = useAssistantStore()

    const result = computed<AssistantSources | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantSources>(props.output))
</script>

<template>
    <AssistantSkeleton v-if="props.loading"/>
    <div v-else-if="result?.results?.length" class="flex flex-col border">
        <div class="flex items-center gap-2 border-b px-3 py-2 text-xs/5 text-dimmed">
            <NuxtIcon name="mingcute:search-line" class="size-4 shrink-0"/>
            <span class="truncate">{{ t('ai.blocks.sources', { q: result.query }) }}</span>
        </div>
        <a
            v-for="(source, index) in result.results.slice(0, 4)"
            :key="source.url"
            :href="source.url"
            target="_blank"
            rel="noopener nofollow"
            class="animate-rise stagger motion-reduce:animate-none flex items-center justify-between gap-3 px-3 py-2 text-xs/5 no-underline! transition-colors hover:bg-elevated"
            :class="index !== 0 && 'border-t'"
            :style="{ '--i': index }"
        >
            <span class="min-w-0 truncate text-default">{{ source.title }}</span>
            <span class="shrink-0 text-dimmed">{{ assistantStore.domain(source.url) }}</span>
        </a>
    </div>
</template>
