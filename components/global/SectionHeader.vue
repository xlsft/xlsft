<script setup lang="ts">
    const { t } = useI18n()
    const props = defineProps<{ id: string, hoverStyle: string }>()
</script>

<template>
    <section class="flex items-center justify-center group" :id >
        <div class="w-full h-full absolute group-hover:opacity-100 opacity-0" :style="hoverStyle"></div>
        <div class="w-px h-[calc(100%-3px)] absolute bottom-0 left-0 bg-black"></div>
        <h2 class="mt-[8px] bg-black z-2 py-[12px] px-[24px] border group-hover:border-accent! relative">
            {{ t(id) }}
        </h2>
    </section>
</template>