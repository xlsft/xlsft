<script setup lang="ts">
    import { useAssistantStore, type AssistantMatch } from '~/stores/assistant'

    const props = defineProps<{
        input?: unknown
        output?: unknown
        loading?: boolean
        status?: string
    }>()

    const { t } = useI18n()
    const assistantStore = useAssistantStore()

    const statuses = {
        match: { mark: '[✓]', color: 'text-success' },
        partial: { mark: '[~]', color: 'text-warning' },
        missing: { mark: '[✗]', color: 'text-error' },
    }

    const title = computed<string | undefined>(() => assistantStore.args<AssistantMatch>(props.input, props.output).title)
    const result = computed<AssistantMatch | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantMatch>(props.output))

    function label(row: NonNullable<AssistantMatch['items']>[number]): string {
        if (row.status === 'partial') return t('ai.blocks.match_partial')
        if (row.status === 'missing') return t('ai.blocks.match_missing')
        return row.years ? t('ai.blocks.years', { n: row.years }) : t('ai.blocks.match_in_projects')
    }
</script>

<template>
    <AssistantShell
        :command="`\0ogrep \0i-if \0svacancy.txt cv.md${title ? ` \0c# ${assistantStore.arg(title)}` : ''}`"
        :loading="props.loading"
        :status="props.status"
    >
        <div v-if="result?.items" class="flex flex-col gap-2">
            <ul class="m-0 flex list-none flex-col p-0">
                <li v-for="(row, index) in result.items" :key="index" class="animate-rise stagger motion-reduce:animate-none flex items-baseline gap-ch" :style="{ '--i': index }">
                    <span class="shrink-0" :class="statuses[row.status].color">{{ statuses[row.status].mark }}</span>
                    <span class="min-w-0 grow" :class="row.status === 'missing' ? 'text-dimmed' : 'text-default'">{{ row.requirement }}</span>
                    <span class="shrink-0 tabular-nums text-comment">{{ label(row) }}</span>
                </li>
            </ul>
            <p class="m-0 flex items-center gap-ch tabular-nums">
                <span class="text-dimmed">score</span>
                <span aria-hidden="true">
                    <span class="text-line">[</span><span :class="result.score >= 70 ? 'text-success' : result.score >= 40 ? 'text-warning' : 'text-error'">{{ '█'.repeat(Math.round(result.score / 5)) }}</span><span class="text-line">{{ '░'.repeat(20 - Math.round(result.score / 5)) }}]</span>
                </span>
                <span :class="result.score >= 70 ? 'text-success' : result.score >= 40 ? 'text-warning' : 'text-error'">{{ t('ai.blocks.match_score', { n: result.score }) }}</span>
            </p>
            <p v-if="result.projects?.length" class="m-0 flex flex-wrap items-baseline gap-x-ch">
                <span class="text-comment"># {{ t('ai.blocks.match_projects') }}</span>
                <template v-for="(project, index) in result.projects" :key="project.id">
                    <button type="button" class="terminal-link p-0" @click="assistantStore.project(project.id)">{{ project.name }}</button><span v-if="index < result.projects.length - 1" class="-ml-ch text-comment">,</span>
                </template>
            </p>
        </div>
    </AssistantShell>
</template>
