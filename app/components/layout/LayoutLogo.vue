<script setup lang="ts">
    import { logo, type Glyphs, type Shape } from '~/lib/logo'

    const props = defineProps<{
        variant: 0 | 1 | 2 | 3 | 4 | 5
    }>()

    const colorMode = useColorMode()

    const root = useTemplateRef<HTMLElement>('root')

    const shapes = shallowRef<Shape[]>([])
    const text = shallowRef<Glyphs>()
    const loop: { frame: number } = { frame: 0 }

    const methods = {
        draw(t: number): void {
            const dark = colorMode.value === 'dark'
            const [ry, rx] = logo.pose(props.variant, t)
            text.value = props.variant === 4 ? logo.ascii(ry, rx, dark) : undefined
            if (props.variant === 0) shapes.value = logo.slices(ry, rx, dark)
            else if (props.variant < 3) shapes.value = logo.solid(ry, rx, props.variant === 1, dark)
            else if (props.variant === 3) shapes.value = logo.particles(t, ry, rx, dark)
            else if (props.variant === 5) shapes.value = logo.current(t, ry, rx, dark)
            else shapes.value = []
        },
        bounce(): void {
            root.value?.animate([
                { transform: 'scale(1)' },
                { transform: 'scale(0.6)', offset: 0.2 },
                { transform: 'scale(1.25)', offset: 0.5 },
                { transform: 'scale(0.92)', offset: 0.75 },
                { transform: 'scale(1)' },
            ], { duration: 550, easing: 'ease-out' })
        },
    }

    if (props.variant < 3) methods.draw(0)

    watch(() => props.variant, methods.bounce)
    onMounted(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const still = (): Promise<void> => nextTick(() => methods.draw(props.variant === 2 ? 0 : 0.6))
            still()
            watch(() => props.variant, still)
            return
        }
        let t = 0
        let last = performance.now()
        const tick = (now: number): void => {
            t += Math.min(0.05, (now - last) / 1000)
            last = now
            methods.draw(t)
            loop.frame = requestAnimationFrame(tick)
        }
        loop.frame = requestAnimationFrame(tick)
    })
    onBeforeUnmount(() => cancelAnimationFrame(loop.frame))
</script>

<template>
    <span ref="root" class="block size-13.5 text-primary" aria-hidden="true">
        <svg :viewBox="`${-logo.view / 2} ${-logo.view / 2} ${logo.view} ${logo.view}`" :width="logo.size" :height="logo.size" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path v-for="(shape, index) in shapes" :key="index" :d="shape.d" :style="shape.style"/>
            <text
                v-for="(glyph, index) in text?.glyphs"
                :key="`glyph-${index}`"
                :x="glyph.x"
                :y="glyph.y"
                :font-size="text?.size"
                :font-weight="text?.weight"
                :fill-opacity="glyph.opacity"
                fill="currentColor"
                dominant-baseline="hanging"
                font-family="ui-monospace, Menlo, monospace"
            >{{ glyph.char }}</text>
        </svg>
    </span>
</template>
