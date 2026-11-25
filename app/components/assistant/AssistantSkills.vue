<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantQuery, type AssistantSkills } from '~/stores/assistant'

    const props = defineProps<{
        input?: unknown
        output?: unknown
        loading?: boolean
        status?: string
    }>()

    const { t } = useI18n()
    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<AssistantSkills> | undefined>(() => `assistant:skills:${JSON.stringify(query.value)}`, () => assistantStore.block<AssistantSkills>('skills', query.value), { server: false })
</script>

<template>
    <AssistantShell :command="`\0obat \0sstack.tsv`" :loading="props.loading || pending" :status="props.status">
        <CommonTSV v-if="data?.groups?.length" :label="t('labels.stack')" :rows="data.groups" compact class="animate-rise motion-reduce:animate-none border"/>
    </AssistantShell>
</template>
