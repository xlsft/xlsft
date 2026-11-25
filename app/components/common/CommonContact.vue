<script setup lang="ts">
    import { useAssistantStore } from '~/stores/assistant'

    const { t } = useI18n()
    const assistantStore = useAssistantStore()
</script>

<template>
    <NuxtButton size="xl" class="w-fit print:hidden" @click="assistantStore.ask(t('ai.contact_intent'))">{{ t('labels.contact_me') }}</NuxtButton>
</template>
