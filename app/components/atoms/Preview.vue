<script setup lang="ts">
    defineProps<{ images: string[], label: string, id?: string }>()
    const index = defineModel<number>('index', { required: true })
    const { t } = useI18n()
    const visible = ref(false)
    const pushed = ref<boolean>(false)

    const actions = {
        open: () => {
            visible.value = true
            if (!pushed.value) {
                history.pushState({ fullscreen: true }, '')
                pushed.value = true
            }
        },
        close:  () => {
            visible.value = false
            if (pushed.value) {
                history.back()
                pushed.value = false
            }
        },
        event: (e: PopStateEvent) => {
            if (visible.value) {
                visible.value = false
                pushed.value = false
            }
        }
    }

    onMounted(() => window.addEventListener('popstate', actions.event))
    onBeforeUnmount(() => window.removeEventListener('popstate', actions.event))
</script>

<template>
    <div>
        <button type="button" class="block w-full cursor-zoom-in!" :aria-label="`${t('labels.view_screenshots', { count: images.length })} — ${label}`" @click="actions.open">
            <slot />
        </button>
        <MoleculesImageViewer :open="visible" v-model:index="index" :images :label :id @update:open="value => value ? actions.open() : actions.close()"/>
    </div>
</template>
