<script setup lang="ts">
    const props = defineProps<{
        title: string
        description: string
        command: string
        heading: string
    }>()
    const emit = defineEmits<{ keydown: [event: KeyboardEvent] }>()
    const open = defineModel<boolean | undefined>('open')
    const { t } = useI18n()

    const button = 'flex aspect-square shrink-0 cursor-pointer items-center justify-center border-l border-default transition-colors hover:bg-inverted hover:text-inverted focus-visible:-outline-offset-2'
</script>

<template>
    <NuxtModal
        v-model:open="open"
        fullscreen
        :title="props.title"
        :description="props.description"
        :ui="{ overlay: 'bg-default/80 backdrop-blur-md', content: 'bg-transparent! divide-y-0 ring-0! shadow-none!' }"
    >
        <template #content>
            <div class="flex h-full min-h-0 items-center justify-center sm:p-6 lg:p-10" @click.self="open = undefined" @keydown="emit('keydown', $event)">
                <div class="flex size-full max-w-7xl flex-col border-default bg-default sm:border">
                    <header class="flex h-12 shrink-0 items-stretch border-b border-default">
                        <p class="flex min-w-0 flex-1 items-center gap-3 px-4 text-sm sm:px-5">
                            <CommonHighlight class="truncate max-sm:hidden" aria-hidden="true" :text="props.command"/>
                            <span class="truncate font-bold sm:hidden">{{ props.heading }}</span>
                        </p>
                        <slot name="actions" :button="button"/>
                        <button type="button" :class="button" :aria-label="t('labels.close')" @click="open = undefined">
                            <svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
                        </button>
                    </header>
                    <slot/>
                    <slot name="footer"/>
                </div>
            </div>
        </template>
    </NuxtModal>
</template>
