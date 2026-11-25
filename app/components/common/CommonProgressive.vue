<script setup lang="ts">
    const props = withDefaults(defineProps<{
        src: string
        steps: number[]
        aspect?: number
        quality?: number
    }>(), { quality: 50 })

    const image = useImage()

    const state = ref<{ step: number }>({ step: 0 })

    const methods = {
        url(width: number): string {
            return image(props.src, {
                width,
                height: props.aspect ? Math.round(width / props.aspect) : undefined,
                fit: props.aspect ? 'cover' : undefined,
                format: 'webp',
                quality: props.quality,
            })
        },
        load(): void {
            const src = props.src
            state.value.step = 0
            props.steps.forEach((width, step) => {
                if (!step) return
                const preload = new Image()
                preload.src = methods.url(width)
                preload.decode().then(() => {
                    if (props.src === src && step > state.value.step) state.value.step = step
                }).catch(() => undefined)
            })
        },
    }

    const size = computed<number[] | undefined>(() => props.src.match(/-(\d+)x(\d+)\.\w+$/)?.slice(1).map(Number))

    watch(() => props.src, methods.load)
    onMounted(methods.load)
</script>

<template>
    <img
        :src="methods.url(props.steps[state.step] ?? props.steps[0] ?? 0)"
        :width="size?.[0]"
        :height="size?.[1]"
        :class="{ pixelated: state.step < props.steps.length - 1 }"
    >
</template>
