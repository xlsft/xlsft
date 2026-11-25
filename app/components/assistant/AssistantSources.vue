<script setup lang="ts">
    import { useAssistantStore, type AssistantSources } from '~/stores/assistant'

    const props = defineProps<{
        input?: unknown
        output?: unknown
        loading?: boolean
        status?: string
    }>()

    const assistantStore = useAssistantStore()

    const result = computed<AssistantSources | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantSources>(props.output))
</script>

<template>
    <AssistantShell
        :command="`\0ocurl \0i-s \0ssearx/search?q=\0w&quot;${assistantStore.arg(assistantStore.args<AssistantSources>(props.input, props.output).query)}&quot;`"
        :loading="props.loading"
        :status="props.status"
    >
        <ol v-if="result?.results?.length" class="m-0 flex list-none flex-col p-0">
            <li v-for="(source, index) in result.results.slice(0, 4)" :key="source.url" class="animate-rise stagger motion-reduce:animate-none flex min-w-0 items-baseline gap-ch" :style="{ '--i': index }">
                <span class="shrink-0 tabular-nums text-comment">{{ index + 1 }}.</span>
                <a :href="source.url" target="_blank" rel="noopener nofollow" class="terminal-link terminal-link-bright min-w-0 grow truncate">{{ source.title }}</a>
                <span class="shrink-0 text-info">{{ assistantStore.domain(source.url) }}</span>
            </li>
        </ol>
    </AssistantShell>
</template>
