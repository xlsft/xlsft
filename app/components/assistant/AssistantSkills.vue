<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantQuery, type AssistantSkills } from '~/stores/assistant'

    const props = defineProps<{
        output?: unknown
        loading?: boolean
    }>()

    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<AssistantSkills> | undefined>(() => `assistant:skills:${JSON.stringify(query.value)}`, () => assistantStore.block<AssistantSkills>('skills', query.value), { server: false })

</script>

<template>
    <AssistantSkeleton v-if="props.loading || pending" variant="groups"/>
    <div v-else-if="data?.groups?.length" class="animate-rise stagger motion-reduce:animate-none w-full border py-2 text-xs/6">
        <div v-for="(row, index) in [{ type: 'category', items: ['items'], header: true }, ...data.groups.map((group) => ({ ...group, header: false }))]" :key="row.type" class="animate-rise stagger motion-reduce:animate-none grid grid-cols-skills" :style="{ '--i': index }">
            <span class="border-r pr-3 text-right tabular-nums text-comment">{{ index + 1 }}</span>
            <span class="truncate pl-3" :class="row.header ? 'text-comment' : 'text-warning'">{{ row.type }}</span>
            <span class="pr-3" :class="row.header ? 'text-comment' : 'text-default'">
                <template v-for="(skill, item) in row.items" :key="skill"><span class="whitespace-nowrap">{{ skill }}</span><template v-if="item < row.items.length - 1">&nbsp; </template></template>
            </span>
        </div>
    </div>
</template>
