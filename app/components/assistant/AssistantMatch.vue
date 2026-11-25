<script setup lang="ts">
    import { useAssistantStore, type AssistantMatch } from '~/stores/assistant'

    const props = defineProps<{
        output?: unknown
        loading?: boolean
    }>()

    const { t } = useI18n()
    const assistantStore = useAssistantStore()

    const statuses = {
        match: { icon: 'mingcute:check-line', color: 'text-success' },
        partial: { icon: 'mingcute:minus-circle-line', color: 'text-warning' },
        missing: { icon: 'mingcute:close-line', color: 'text-dimmed' },
    }

    const result = computed<AssistantMatch | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantMatch>(props.output))

    function label(row: NonNullable<AssistantMatch['items']>[number]): string {
        if (row.status === 'partial') return t('ai.blocks.match_partial')
        if (row.status === 'missing') return t('ai.blocks.match_missing')
        return row.years ? t('ai.blocks.years', { n: row.years }) : t('ai.blocks.match_in_projects')
    }
</script>

<template>
    <AssistantSkeleton v-if="props.loading" variant="list"/>
    <div v-else-if="result?.items" class="flex flex-col border">
        <div class="flex items-center justify-between gap-3 border-b px-3 py-2 text-xs/5">
            <span class="min-w-0 truncate font-bold">{{ result.title ?? t('ai.blocks.match') }}</span>
            <span class="shrink-0 tabular-nums" :class="result.score >= 70 ? 'text-success' : result.score >= 40 ? 'text-warning' : 'text-dimmed'">{{ t('ai.blocks.match_score', { n: result.score }) }}</span>
        </div>
        <ul class="flex flex-col p-3 text-xs/5">
            <li v-for="(row, index) in result.items" :key="index" class="animate-rise stagger motion-reduce:animate-none flex items-start gap-2" :style="{ '--i': index }">
                <NuxtIcon :name="statuses[row.status].icon" class="mt-0.5 size-4 shrink-0" :class="statuses[row.status].color"/>
                <span class="min-w-0 grow" :class="row.status === 'missing' ? 'text-dimmed' : 'text-default'">{{ row.requirement }}</span>
                <span class="shrink-0 tabular-nums text-dimmed">{{ label(row) }}</span>
            </li>
        </ul>
        <div v-if="result.projects?.length" class="flex flex-wrap items-center gap-1.5 border-t p-3">
            <span class="text-xs text-dimmed">{{ t('ai.blocks.match_projects') }}</span>
            <NuxtButton
                v-for="(project, index) in result.projects"
                :key="project.id"
                size="xs"
                variant="outline"
                color="neutral"
                class="animate-rise stagger motion-reduce:animate-none rounded-none"
                :style="{ '--i': index }"
                @click="assistantStore.project(project.id)"
            >
                {{ project.name }}
            </NuxtButton>
        </div>
    </div>
</template>
