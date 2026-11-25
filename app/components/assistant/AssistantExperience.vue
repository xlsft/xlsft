<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantCompany, type AssistantQuery } from '~/stores/assistant'

    const props = defineProps<{
        input?: unknown
        output?: unknown
        loading?: boolean
        status?: string
    }>()

    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<AssistantCompany> | undefined>(() => `assistant:experience:${JSON.stringify(query.value)}`, () => assistantStore.block<AssistantCompany>('experience', query.value), { server: false })

    const range = (positions: AssistantCompany['positions']): string => `${assistantStore.date(positions.at(-1)?.from)} — ${assistantStore.date(positions[0]?.to)}`
</script>

<template>
    <AssistantShell
        :command="`\0ocat \0sexperience/${assistantStore.arg(assistantStore.args<AssistantQuery>(props.input, props.output).company) || '*'}.yaml`"
        :loading="props.loading || pending"
        :status="props.status"
    >
        <div v-if="data?.items?.length" class="flex flex-col gap-3">
            <article v-for="(company, index) in data.items" :key="company.id" class="animate-rise stagger motion-reduce:animate-none flex flex-col" :style="{ '--i': index }">
                <header class="flex items-center justify-between gap-3">
                    <component :is="company.link ? 'a' : 'span'" :href="company.link" target="_blank" class="flex min-w-0 items-center gap-ch no-underline!">
                        <span class="text-comment">#</span>
                        <img v-if="assistantStore.image(company.logo)" :src="assistantStore.image(company.logo)" :alt="company.name" class="h-4 w-auto max-w-28 shrink-0 object-contain">
                        <span v-else class="truncate font-bold text-default">{{ company.name }}</span>
                        <span v-if="company.link" class="terminal-link truncate">{{ assistantStore.host(company.link) }}</span>
                    </component>
                    <span class="shrink-0 tabular-nums text-warning">{{ range(company.positions) }}</span>
                </header>
                <div v-for="(position, item) in company.positions" :key="item" class="flex min-w-0 gap-ch">
                    <span aria-hidden="true" class="flex shrink-0 flex-col text-line">
                        <span>{{ item === company.positions.length - 1 ? '└─' : '├─' }}</span>
                        <span v-if="item < company.positions.length - 1" class="ml-ch-half grow border-l border-line"/>
                    </span>
                    <div class="flex min-w-0 grow flex-col">
                        <div class="flex items-baseline justify-between gap-4">
                            <span class="min-w-0" :class="position.to ? 'text-default/78' : 'font-bold text-default'">{{ position.name }}</span>
                            <span class="shrink-0 tabular-nums text-comment">{{ assistantStore.date(position.from) }} — {{ assistantStore.date(position.to) }}</span>
                        </div>
                        <CommonHighlight v-if="position.skills?.length" :text="`\0c[${position.skills.map((skill) => `\0d${skill}`).join('\0c, ')}\0c]`"/>
                    </div>
                </div>
            </article>
        </div>
    </AssistantShell>
</template>
