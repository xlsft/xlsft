<script setup lang="ts">
    const props = defineProps<{ color: string }>()
</script>
<template>
    <div :style="{ '--badge-color': props.color }" class="print:hidden transition-all print:bg-transparent! font-medium text-center text-xs px-2 py-1 gap-1 rounded-md border border-default text-default bg-default hover:bg-(--badge-color)/50 hover:border-(--badge-color)!">
        <slot/>
    </div>
    <span class="hidden print:block font-medium text-xs">
        <slot/>
    </span>
    <span class="hidden print:block last:hidden font-medium text-xs">, </span>
</template>