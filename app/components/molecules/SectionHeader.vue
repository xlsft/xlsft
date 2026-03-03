<script setup lang="ts">
    const props = defineProps<{ pattern: string, id?: string }>()
</script>

<template>
    <AtomsPattern :name="props.pattern" :id class="w-full py-12 outline group/header hover:outline-blue-500! transition-colors z-2 flex items-center justify-center" :class="$slots.default ? 'min-h-32' : 'min-h-18'">
        <h2 class="text-center bg-default py-3 px-6 border group-hover/header:border-blue-500! text-2xl font-bold z-3 pointer-events-none" v-if="$slots.default">
            <slot/>
        </h2>
        <slot name="outer"/>
    </AtomsPattern>
</template>