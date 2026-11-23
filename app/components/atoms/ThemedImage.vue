<script setup lang="ts">
    // картинка с отдельными версиями под тёмную и светлую тему: грузим обе и переключаем классом .dark,
    // чтобы SSR не зависел от темы посетителя и смена темы не требовала перезапроса в CMS
    defineOptions({ inheritAttrs: false })
    const props = defineProps<{ src?: ThemedImage | null }>()

    const dark = computed(() => props.src?.dark || props.src?.light || undefined)
    const light = computed(() => props.src?.light || props.src?.dark || undefined)
</script>

<template>
    <NuxtImg v-if="dark && dark === light" :src="dark" v-bind="$attrs"/>
    <template v-else>
        <span v-if="dark" class="hidden dark:contents"><NuxtImg :src="dark" v-bind="$attrs"/></span>
        <span v-if="light" class="contents dark:hidden"><NuxtImg :src="light" v-bind="$attrs"/></span>
    </template>
</template>
