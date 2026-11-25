<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantQuery, type AssistantRepo } from '~/stores/assistant'

    const props = defineProps<{
        input?: unknown
        output?: unknown
        loading?: boolean
        status?: string
    }>()

    const { t } = useI18n()
    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<AssistantRepo> | undefined>(() => `assistant:repos:${JSON.stringify(query.value)}`, () => assistantStore.block<AssistantRepo>('repos', query.value), { server: false })
</script>

<template>
    <AssistantShell :command="`\0ogh \0orepo list \0ixlsft \0i--source`" :loading="props.loading || pending" :status="props.status">
        <ul v-if="data?.items?.length" class="m-0 flex list-none flex-col gap-2 p-0">
            <li v-for="(item, index) in data.items" :key="item.repo" class="animate-rise stagger motion-reduce:animate-none flex min-w-0 flex-col" :style="{ '--i': index }">
                <span class="flex items-center justify-between gap-3">
                    <a :href="`https://github.com/${item.repo}`" target="_blank" class="terminal-link terminal-link-bright flex min-w-0 items-center gap-ch">
                        <NuxtIcon name="mingcute:github-line" class="size-3.5 shrink-0 self-center"/><span class="truncate font-bold">{{ item.repo }}</span>
                    </a>
                    <span class="flex shrink-0 items-center gap-ch-2 tabular-nums">
                        <span v-if="item.github?.language" class="text-info">{{ item.github.language }}</span>
                        <span class="flex items-center gap-ch-half text-warning" :title="t('ai.blocks.stars')"><NuxtIcon name="mingcute:star-line" class="size-3.5"/>{{ item.github?.stars ?? '—' }}</span>
                        <span v-if="item.github?.forks" class="flex items-center gap-ch-half text-dimmed" :title="t('ai.blocks.forks')"><NuxtIcon name="mingcute:git-branch-line" class="size-3.5"/>{{ item.github.forks }}</span>
                    </span>
                </span>
                <span class="text-comment"># {{ item.github?.description ?? item.name }}</span>
                <span v-if="item.github?.topics?.length" class="text-success">{{ item.github.topics.slice(0, 6).map((topic) => `#${topic}`).join(' ') }}</span>
            </li>
        </ul>
    </AssistantShell>
</template>
