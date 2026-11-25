<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantQuery } from '~/stores/assistant'
    import { useCmsStore } from '~/stores/cms'

    const props = defineProps<{
        input?: unknown
        output?: unknown
        loading?: boolean
        status?: string
    }>()

    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<Tile> | undefined>(() => `assistant:projects:${JSON.stringify(query.value)}`, () => assistantStore.block<Tile>('projects', query.value), { server: false })
    const { data: colors } = useCmsStore().colors(() => (data.value?.items ?? []).map((project) => project.logo))

    const tag = computed<string | undefined>(() => assistantStore.args<AssistantQuery>(props.input, undefined).tag)
</script>

<template>
    <AssistantShell :command="`\0ols \0sprojects/${tag ? ` \0i--tag \0w${assistantStore.arg(tag)}` : ''}`" :loading="props.loading || pending" :status="props.status">
        <template v-if="data?.items?.length">
            <span class="text-comment">total {{ data.items.length }}</span>
            <ProjectsGrid :projects="data.items" :colors="colors ?? undefined" animate class="border" @open="assistantStore.project"/>
        </template>
    </AssistantShell>
</template>
