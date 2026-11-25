<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantProject, type AssistantQuery } from '~/stores/assistant'

    const props = defineProps<{
        input?: unknown
        output?: unknown
        loading?: boolean
        status?: string
    }>()

    const { t } = useI18n()
    const assistantStore = useAssistantStore()

    const pair = 'grid grid-cols-pair'

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<AssistantProject> | undefined>(() => `assistant:project:${JSON.stringify(query.value)}`, () => assistantStore.block<AssistantProject>('project', query.value), { server: false })

    const project = computed<AssistantProject | undefined>(() => data.value?.items?.[0])
</script>

<template>
    <AssistantShell
        :command="`\0ocat \0sprojects/${assistantStore.arg(assistantStore.args<AssistantQuery>(props.input, props.output).id) || '*'}/README.md`"
        :loading="props.loading || pending"
        :status="props.status"
    >
        <article v-if="project" class="flex flex-col gap-2">
            <header class="animate-rise stagger motion-reduce:animate-none flex items-center justify-between gap-3">
                <span class="flex min-w-0 items-center gap-ch">
                    <span class="text-comment">#</span>
                    <img v-if="assistantStore.image(project.logo)" :src="assistantStore.image(project.logo)" :alt="project.name" class="h-4 w-auto max-w-28 object-contain">
                    <span v-else class="truncate font-bold text-default">{{ project.name }}</span>
                </span>
                <span v-if="project.status" class="shrink-0 text-comment">{{ project.status }}</span>
            </header>
            <div v-if="project.images?.length" class="animate-rise stagger motion-reduce:animate-none flex gap-px overflow-x-auto border bg-border" :style="{ '--i': 1 }">
                <img v-for="src in project.images" :key="src" :src="src" alt="" class="h-28 w-auto shrink-0 bg-default object-cover">
            </div>
            <MDC v-if="project.description" :value="project.description" class="animate-rise stagger motion-reduce:animate-none text-xs/5 text-default/78 md-compact md-strong" :style="{ '--i': 2 }"/>
            <dl class="animate-rise stagger motion-reduce:animate-none m-0 flex flex-col" :style="{ '--i': 3 }">
                <div v-if="project.stack?.length" :class="pair">
                    <dt class="text-dimmed">stack</dt><span aria-hidden="true" class="text-line">=</span>
                    <dd class="m-0"><CommonHighlight :text="`\0c[${project.stack.map((skill) => `\0o${skill}`).join('\0c, ')}\0c]`"/></dd>
                </div>
                <div v-if="project.repo" :class="pair">
                    <dt class="text-dimmed">repo</dt><span aria-hidden="true" class="text-line">=</span>
                    <dd class="m-0 flex min-w-0 gap-ch">
                        <a :href="`https://github.com/${project.repo}`" target="_blank" class="terminal-link truncate">github.com/{{ project.repo }}</a>
                        <span v-if="project.github?.stars !== undefined" class="shrink-0 text-warning">★ {{ project.github.stars }}</span>
                    </dd>
                </div>
                <div v-for="(link, index) in project.links ?? []" :key="link" :class="pair">
                    <dt class="text-dimmed">{{ index ? '' : 'links' }}</dt><span aria-hidden="true" class="text-line">{{ index ? '' : '=' }}</span>
                    <dd class="m-0 min-w-0 truncate"><a :href="link" target="_blank" class="terminal-link">{{ assistantStore.host(link) }}</a></dd>
                </div>
            </dl>
            <button type="button" class="terminal-link animate-rise stagger motion-reduce:animate-none w-fit p-0" :style="{ '--i': 4 }" @click="assistantStore.project(project.id)">
                → {{ t('ai.blocks.open') }} ~/projects/{{ project.id }}
            </button>
        </article>
    </AssistantShell>
</template>
