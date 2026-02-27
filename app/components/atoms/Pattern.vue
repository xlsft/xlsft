<script setup lang="ts">
    
    const props = defineProps<{ name: string }>()
</script>

<template>
    <div class="overflow-hidden relative flex items-center justify-center">
        <div class="w-full h-full group/pattern flex items-center justify-center absolute top-0 left-0" :style="`background-image: url('/patterns/${props.name}.svg')`">
            <div class="w-full h-full group-hover/pattern:opacity-100 opacity-0 transition-opacity" :style="`background-image: url('/patterns/${props.name}-hover.svg')`"></div>
        </div>
        <slot/>
    </div>
</template>