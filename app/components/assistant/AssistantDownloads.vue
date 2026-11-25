<script setup lang="ts">
    import { ASSISTANT_FORMATS, useAssistantStore } from '~/stores/assistant'

    const props = defineProps<{
        input?: unknown
        output?: unknown
        loading?: boolean
        status?: string
    }>()

    const { t, locale } = useI18n()
    const assistantStore = useAssistantStore()

    const sheet = 'absolute inset-0 block border border-default bg-white transition-transform duration-250 ease-out motion-reduce:transition-none'

    const state = ref<{ preview?: boolean }>({})

    const result = computed<{ locale?: string } | undefined>(() => props.loading ? undefined : assistantStore.parse<{ locale?: string }>(props.output))
    const files = computed<{ format: string, label: string, icon: string, to: string }[]>(() => ASSISTANT_FORMATS.map((file) => ({ ...file, to: `/api/public/${result.value?.locale ?? locale.value}/cv.${file.format}` })))
</script>

<template>
    <AssistantShell :command="`\0ols \0i-l \0scv/`" :loading="props.loading" :status="props.status">
        <div v-if="result" class="flex min-w-0 items-start gap-6">
            <a :href="files[0]?.to" target="_blank" class="group/deck animate-rise motion-reduce:animate-none relative mt-1 mr-2 ml-1 block h-32 w-24 shrink-0" :aria-label="t('ai.blocks.cv_open')">
                <span aria-hidden="true" :class="sheet" class="z-1 translate-x-3 translate-y-2 rotate-8 group-hover/deck:translate-x-4 group-hover/deck:translate-y-0.5 group-hover/deck:rotate-12"/>
                <span aria-hidden="true" :class="sheet" class="z-2 translate-x-1.5 translate-y-1 rotate-4 group-hover/deck:translate-x-2 group-hover/deck:-translate-y-0.5 group-hover/deck:rotate-6"/>
                <span :class="sheet" class="z-3 overflow-hidden group-hover/deck:-translate-y-1.5 group-hover/deck:-rotate-2">
                    <span v-if="!state.preview" class="absolute inset-0 block animate-skeleton bg-elevated motion-reduce:animate-none"/>
                    <img :src="`/api/public/${result.locale ?? locale}/cv.png`" alt="" class="size-full object-cover object-top transition-opacity duration-300" :class="state.preview ? 'opacity-100' : 'opacity-0'" @load="state.preview = true">
                </span>
            </a>
            <div class="flex min-w-0 flex-col">
                <span class="text-comment">total {{ files.length }}</span>
                <a
                    v-for="(file, index) in files"
                    :key="file.format"
                    :href="file.to"
                    download
                    target="_blank"
                    class="terminal-link terminal-link-bright animate-rise stagger motion-reduce:animate-none flex min-w-0 items-center gap-ch"
                    :style="{ '--i': index + 1 }"
                >
                    <span class="text-dimmed">-rw-r--r--</span>
                    <NuxtIcon :name="file.icon" class="size-3.5 shrink-0"/>
                    <span class="text-success">cv.{{ file.format }}</span>
                    <span class="text-comment">↓</span>
                </a>
                <span class="mt-2 text-comment"># {{ t('ai.blocks.cv_meta') }}</span>
            </div>
        </div>
    </AssistantShell>
</template>
