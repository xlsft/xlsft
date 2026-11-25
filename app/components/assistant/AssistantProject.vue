<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantProject, type AssistantQuery } from '~/stores/assistant'

    const props = defineProps<{
        output?: unknown
        loading?: boolean
    }>()

    const { t } = useI18n()
    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<AssistantProject> | undefined>(() => `assistant:project:${JSON.stringify(query.value)}`, () => assistantStore.block<AssistantProject>('project', query.value), { server: false })

    function open(): void {
        if (project.value) assistantStore.project(project.value.id)
    }

    const project = computed<AssistantProject | undefined>(() => data.value?.items?.[0])
</script>

<template>
    <AssistantSkeleton v-if="props.loading || pending"/>
    <article v-else-if="project" class="flex flex-col border">
        <div class="animate-rise stagger motion-reduce:animate-none flex items-center justify-between gap-3 border-b p-3">
            <img v-if="assistantStore.image(project.logo)" :src="assistantStore.image(project.logo)" :alt="project.name" class="h-5 w-auto max-w-32 object-contain">
            <span v-else class="text-sm font-bold">{{ project.name }}</span>
            <span v-if="project.status" class="shrink-0 text-xs text-dimmed">{{ project.status }}</span>
        </div>
        <div v-if="project.images?.length" class="animate-rise stagger motion-reduce:animate-none flex gap-px overflow-x-auto border-b bg-border" :style="{ '--i': 1 }">
            <img v-for="src in project.images" :key="src" :src="src" alt="" class="h-28 w-auto shrink-0 bg-default object-cover">
        </div>
        <MDC v-if="project.description" :value="project.description" class="animate-rise stagger motion-reduce:animate-none p-3 text-xs/5 md-compact" :style="{ '--i': 2 }"/>
        <div v-if="project.stack?.length" class="animate-rise stagger motion-reduce:animate-none flex flex-wrap gap-1 px-3 pb-3" :style="{ '--i': 3 }">
            <NuxtBadge v-for="skill in project.stack" :key="skill" :label="skill" size="sm" color="neutral" variant="outline" class="rounded-none"/>
        </div>
        <div class="animate-rise stagger motion-reduce:animate-none flex flex-wrap items-center gap-1.5 border-t p-3" :style="{ '--i': 4 }">
            <NuxtButton size="xs" variant="outline" color="neutral" icon="mingcute:arrow-right-up-line" class="rounded-none" @click="open">{{ t('ai.blocks.open') }}</NuxtButton>
            <NuxtButton v-if="project.repo" :to="`https://github.com/${project.repo}`" target="_blank" size="xs" variant="outline" color="neutral" icon="mingcute:github-line" class="rounded-none no-underline!">
                {{ project.repo }}
                <span v-if="project.github" class="inline-flex items-center gap-0.5 text-dimmed"><NuxtIcon name="mingcute:star-line" class="size-3.5"/>{{ project.github.stars }}</span>
            </NuxtButton>
            <NuxtButton v-for="link in project?.links ?? []" :key="link" :to="link" target="_blank" size="xs" variant="ghost" color="neutral" icon="mingcute:link-line" class="rounded-none no-underline!">{{ assistantStore.host(link) }}</NuxtButton>
        </div>
    </article>
</template>
