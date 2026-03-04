<script setup lang="ts">
    import type { HTMLAttributes } from 'vue';
    import SectionHeader from '../molecules/SectionHeader.vue';

    const { t } = useI18n()
    const props = defineProps<{ id?: string, class?: HTMLAttributes['class'] }>()

    const open = ref<boolean>(false)
</script>

<template>
    <NuxtButton size="xl" :class @click="open = !open">{{ t('labels.contact_me') }}</NuxtButton>
    <NuxtModal v-model:open="open">
        <template #content>
            <SectionHeader no-contact pattern="topography"/>
        </template>
    </NuxtModal>
</template>