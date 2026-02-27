<script setup lang="ts">
    const { t } = useI18n()
    const props = defineProps<{ key: string }>()
</script>

<template>
    <section>
        <h1>{{ t(`projects.${key}.title`) }}</h1>
        <span>{{ t(`projects.${key}.description`) }}</span>
    </section>
</template>