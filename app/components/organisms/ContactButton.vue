<script setup lang="ts">
    import type { HTMLAttributes } from 'vue'

    const { t } = useI18n()
    const assistant = useAssistant()
    const props = defineProps<{ id?: string, class?: HTMLAttributes['class'] }>()
</script>

<template>
    <!-- «Связаться» теперь ведёт в ИИ-чат: он сам предложит способы связи и оформит заявку -->
    <NuxtButton size="xl" class="print:hidden w-fit" :class @click="assistant.ask(t('ai.contact_intent'))">{{ t('labels.contact_me') }}</NuxtButton>
</template>
