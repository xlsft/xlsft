<script setup lang="ts">
    const props = defineProps<{
        images: string[]
        label: string
        id?: string
    }>()
    const index = defineModel<number>('index', { required: true })

    const { t } = useI18n()

    const state = ref<{ open?: boolean, pushed?: boolean }>({})

    const methods = {
        open(): void {
            state.value.open = true
            if (state.value.pushed) return
            history.pushState({ fullscreen: true }, '')
            state.value.pushed = true
        },
        close(): void {
            state.value.open = undefined
            if (!state.value.pushed) return
            history.back()
            state.value.pushed = undefined
        },
        back(): void {
            if (!state.value.open) return
            state.value.open = undefined
            state.value.pushed = undefined
        },
    }

    onMounted(() => window.addEventListener('popstate', methods.back))
    onBeforeUnmount(() => window.removeEventListener('popstate', methods.back))
</script>

<template>
    <div>
        <button type="button" class="block w-full cursor-zoom-in!" :aria-label="`${t('labels.view_screenshots', { count: props.images.length })} — ${props.label}`" @click="methods.open">
            <slot />
        </button>
        <Gallery :id="props.id" v-model:index="index" :open="state.open" :images="props.images" :label="props.label" @update:open="(value) => value ? methods.open() : methods.close()"/>
    </div>
</template>
