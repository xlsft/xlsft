<script setup lang="ts">
    const props = defineProps<{ color?: string }>()
</script>

<template>
    <div class="text-xs! px-[12px] py-[4px] cursor-nw-resize! border bg-default hover:bg-(--badge-color)/50 hover:border-(--badge-color)! transition-colors w-fit" :style="`--badge-color: ${props.color}`">
        <slot/>
    </div>
</template>