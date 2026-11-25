<script setup lang="ts">
    import { useAssistantStore, type AssistantList, type AssistantContact, type AssistantQuery } from '~/stores/assistant'

    const props = defineProps<{
        input?: unknown
        output?: unknown
        loading?: boolean
        status?: string
    }>()

    const assistantStore = useAssistantStore()

    const query = computed<AssistantQuery | undefined>(() => props.loading ? undefined : assistantStore.parse<AssistantQuery>(props.output))
    const { data, pending } = useAsyncData<AssistantList<AssistantContact> | undefined>(() => `assistant:contacts:${JSON.stringify(query.value)}`, () => assistantStore.block<AssistantContact>('contacts', query.value), { server: false })

    function key(link: AssistantContact): string {
        if (link.to.startsWith('mailto:')) return 'email'
        if (link.to.startsWith('tel:')) return 'phone'
        return link.label.toLowerCase()
    }
</script>

<template>
    <AssistantShell :command="`\0ocat \0scontacts.conf`" :loading="props.loading || pending" :status="props.status">
        <dl v-if="data?.items?.length" class="fetch-rows m-0 grid grid-cols-fetch-sm gap-x-ch">
            <div v-for="(link, index) in data.items" :key="link.to" class="animate-rise stagger motion-reduce:animate-none col-span-full grid grid-cols-subgrid items-center" :style="{ '--i': index }">
                <NuxtIcon :name="assistantStore.icon(link.to)" class="size-3.5"/>
                <dt>{{ key(link) }}</dt>
                <dd class="m-0 min-w-0 truncate">
                    <a :href="link.to" :target="link.to.startsWith('http') ? '_blank' : undefined" class="terminal-link">{{ assistantStore.host(link.to) }}</a>
                </dd>
            </div>
        </dl>
    </AssistantShell>
</template>
