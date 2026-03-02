<script setup lang="ts">
    const props = defineProps<{ name: string }>()
    const svg = (await import(`../../assets/svg/patterns/${props.name}.svg?raw`)).default
</script>

<template>
    <div class="overflow-hidden! relative flex items-center justify-center [--pattern-color:var(--ui-neutral)] hover:[--pattern-color:var(--ui-primary)]">
        <div class="absolute left-0 top-0 w-full h-full" v-html="svg"/>
        <slot />
    </div>
</template>