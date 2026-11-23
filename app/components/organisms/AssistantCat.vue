<script setup lang="ts">
    const { t } = useI18n()
    const assistant = useAssistant()
</script>

<template>
    <NuxtTooltip :text="t('ai.tooltip')" :content="{ side: 'left' }" :delay-duration="0">
        <button
            type="button"
            :aria-label="t('ai.tooltip')"
            class="assistant-cat print:hidden fixed bottom-8 right-8 max-sm:bottom-5 max-sm:right-5 z-40 cursor-pointer select-none outline-none"
            :class="assistant.open.value && 'pointer-events-none opacity-0!'"
            @click="assistant.ask()"
        >
            <img src="/mascot-cat.svg" alt="" width="240" height="136" draggable="false" class="w-24 max-sm:w-20 h-auto"/>
        </button>
    </NuxtTooltip>
</template>

<style scoped>
    .assistant-cat {
        opacity: .45;
        transition: opacity .25s, transform .25s;
    }
    .assistant-cat img { image-rendering: pixelated; }
    .assistant-cat:hover, .assistant-cat:focus-visible {
        opacity: 1;
        transform: translateY(-2px);
    }
</style>
