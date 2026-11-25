<script setup lang="ts">
    import type { ComponentPublicInstance } from 'vue'

    defineOptions({ inheritAttrs: false })
    const props = defineProps<{
        src?: ThemedImage
        skeleton?: string
    }>()

    const colorMode = useColorMode()

    const darkImage = useTemplateRef<ComponentPublicInstance>('darkImage')
    const lightImage = useTemplateRef<ComponentPublicInstance>('lightImage')

    const state = ref<{ dark?: boolean, light?: boolean }>({})

    const methods = {
        load(variant: 'dark' | 'light'): void {
            state.value[variant] = true
            if (dark.value === light.value) state.value = { dark: true, light: true }
        },
        sync(): void {
            for (const [variant, image] of [['dark', darkImage.value], ['light', lightImage.value]] as const) {
                const element = image?.$el as HTMLImageElement | undefined
                if (element?.complete && element.naturalWidth > 0) methods.load(variant)
            }
        },
    }

    const dark = computed<string | undefined>(() => props.src?.dark ?? props.src?.light ?? undefined)
    const light = computed<string | undefined>(() => props.src?.light ?? props.src?.dark ?? undefined)

    onMounted(methods.sync)
</script>

<template>
    <span
        v-if="!(colorMode.value === 'dark' ? state.dark : state.light)"
        aria-hidden="true"
        class="relative block animate-skeleton bg-elevated motion-reduce:animate-none"
        :class="props.skeleton"
    />
    <NuxtImg v-if="dark && dark === light" ref="darkImage" :src="dark" v-bind="$attrs" @load="methods.load('dark')"/>
    <template v-else>
        <span v-if="dark" class="hidden dark:contents"><NuxtImg ref="darkImage" :src="dark" v-bind="$attrs" @load="methods.load('dark')"/></span>
        <span v-if="light" class="contents dark:hidden"><NuxtImg ref="lightImage" :src="light" v-bind="$attrs" @load="methods.load('light')"/></span>
    </template>
</template>
