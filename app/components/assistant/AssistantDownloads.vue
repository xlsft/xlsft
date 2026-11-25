<script setup lang="ts">
    import { ASSISTANT_FORMATS, useAssistantStore } from '~/stores/assistant'

    const props = defineProps<{
        output?: unknown
        loading?: boolean
    }>()

    const { t, locale } = useI18n()
    const assistantStore = useAssistantStore()

    const sheet = 'absolute inset-0 block border border-default bg-white transition-transform duration-250 ease-out motion-reduce:transition-none'

    const state = ref<{ preview?: boolean }>({})

    const result = computed<{ locale?: string } | undefined>(() => props.loading ? undefined : assistantStore.parse<{ locale?: string }>(props.output))
    const files = computed<{ format: string, label: string, icon: string, to: string }[]>(() => ASSISTANT_FORMATS.map((file) => ({ ...file, to: `/api/public/${result.value?.locale ?? locale.value}/cv.${file.format}` })))
</script>

<template>
    <AssistantSkeleton v-if="props.loading" variant="buttons"/>
    <div v-else-if="result" class="animate-rise stagger motion-reduce:animate-none flex h-32 w-full overflow-hidden border">
        <a :href="files[0]?.to" target="_blank" class="group/deck relative mt-4 mr-6 ml-5 block h-44 w-32 shrink-0" :aria-label="t('ai.blocks.cv_open')">
            <span aria-hidden="true" :class="sheet" class="z-1 translate-x-3 translate-y-2 rotate-8 group-hover/deck:translate-x-4 group-hover/deck:translate-y-0.5 group-hover/deck:rotate-12"/>
            <span aria-hidden="true" :class="sheet" class="z-2 translate-x-1.5 translate-y-1 rotate-4 group-hover/deck:translate-x-2 group-hover/deck:-translate-y-0.5 group-hover/deck:rotate-6"/>
            <span :class="sheet" class="z-3 overflow-hidden group-hover/deck:-translate-y-1.5 group-hover/deck:-rotate-2">
                <span v-if="!state.preview" class="absolute inset-0 block animate-skeleton bg-elevated motion-reduce:animate-none"/>
                <img :src="`/api/public/${result.locale ?? locale}/cv.png`" alt="" class="size-full object-cover object-top transition-opacity duration-300" :class="state.preview ? 'opacity-100' : 'opacity-0'" @load="state.preview = true">
            </span>
        </a>
        <div class="flex min-w-0 grow flex-col justify-between gap-3 p-3">
            <div class="flex flex-col gap-0.5 text-xs/5">
                <span class="font-bold text-default">{{ t('ai.blocks.cv_title') }}</span>
                <span class="text-comment"># {{ t('ai.blocks.cv_meta') }}</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
                <NuxtButton
                    v-for="(file, index) in files"
                    :key="file.format"
                    :to="file.to"
                    external
                    download
                    target="_blank"
                    :icon="file.icon"
                    variant="outline"
                    color="neutral"
                    size="xs"
                    class="animate-rise stagger motion-reduce:animate-none rounded-none no-underline!"
                    :style="{ '--i': index + 1 }"
                    :ui="{ label: 'no-underline!' }"
                >
                    {{ file.label }}
                </NuxtButton>
            </div>
        </div>
    </div>
</template>
