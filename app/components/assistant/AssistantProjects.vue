<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantQuery } from '~/stores/assistant'
    import { useCmsStore } from '~/stores/cms'

    const props = defineProps<{
        output?: unknown
        loading?: boolean
    }>()

    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<Tile> | undefined>(() => `assistant:projects:${JSON.stringify(query.value)}`, () => assistantStore.block<Tile>('projects', query.value), { server: false })
    const { data: colors } = useCmsStore().colors(() => (data.value?.items ?? []).map((project) => project.logo))
</script>

<template>
    <AssistantSkeleton v-if="props.loading || pending" variant="list"/>
    <ProjectsGrid v-else-if="data?.items?.length" :projects="data.items" :colors="colors ?? undefined" animate @open="assistantStore.project"/>
</template>
