<script setup lang="ts">
    const props = defineProps<{ name: string, title: string, description?: string }>()
</script>

<template>
    <section :id="props.name">
        <AtomsHighlight :text="props.title"/>
    </section>
</template>
