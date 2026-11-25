<script setup lang="ts">
    import { useAssistantStore } from '~/stores/assistant'
    const { t } = useI18n()
    const assistantStore = useAssistantStore()
</script>

<template>
    <NuxtTooltip :text="t('ai.tooltip')" :content="{ side: 'left' }" :delay-duration="0">
        <button
            type="button"
            :aria-label="t('ai.tooltip')"
            class="opacity-45 transition-all duration-250 hover:-translate-y-0.5 hover:opacity-100 focus-visible:-translate-y-0.5 focus-visible:opacity-100 print:hidden fixed bottom-8 right-8 max-sm:bottom-5 max-sm:right-5 z-40 cursor-pointer select-none outline-none"
            :class="assistantStore.open && 'pointer-events-none opacity-0!'"
            @click="assistantStore.ask()"
        >
            <img src="/mascot-cat.svg" alt="" width="240" height="136" draggable="false" class="pixelated w-24 max-sm:w-20 h-auto"/>
        </button>
    </NuxtTooltip>
</template>

