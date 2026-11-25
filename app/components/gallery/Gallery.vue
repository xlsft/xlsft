<script setup lang="ts">
    const props = defineProps<{
        images: string[]
        label: string
        id?: string
    }>()
    const open = defineModel<boolean | undefined>('open')
    const index = defineModel<number>('index', { default: 0 })

    const { t } = useI18n()

    const image = useTemplateRef<HTMLImageElement>('image')

    const MAX = 4
    const DOUBLE = 2.5

    const touch: {
        pointers: Map<number, { x: number, y: number }>
        start?: { x: number, y: number }
        pinch?: { distance: number, scale: number }
        tap: { time: number, x: number, y: number }
    } = { pointers: new Map(), tap: { time: 0, x: 0, y: 0 } }

    const state = ref<{ direction: 1 | -1, gesture?: boolean, zoom: { scale: number, x: number, y: number } }>({
        direction: 1,
        zoom: { scale: 1, x: 0, y: 0 },
    })

    const methods = {
        pad: (value: number): string => String(value).padStart(2, '0'),
        filename: (): string => `${methods.pad(index.value)}.${props.images[index.value]?.split(/[?#]/)[0]?.match(/\.(\w{2,5})$/)?.[1]?.toLowerCase() ?? 'png'}`,
        step(delta: 1 | -1): void {
            const count = props.images.length
            if (count < 2) return
            state.value.direction = delta
            index.value = (index.value + delta + count) % count
        },
        select(value: number): void {
            state.value.direction = value >= index.value ? 1 : -1
            index.value = value
        },
        zoom: {
            clamp(): void {
                const element = image.value
                if (!element) return
                const zoom = state.value.zoom
                const x = Math.max(0, (element.offsetWidth * zoom.scale - element.offsetWidth) / 2)
                const y = Math.max(0, (element.offsetHeight * zoom.scale - element.offsetHeight) / 2)
                zoom.x = Math.min(x, Math.max(-x, zoom.x))
                zoom.y = Math.min(y, Math.max(-y, zoom.y))
            },
            at(scale: number, x: number, y: number): void {
                const element = image.value
                if (!element) return
                const zoom = state.value.zoom
                const next = Math.min(MAX, Math.max(1, scale))
                const rect = element.getBoundingClientRect()
                const ratio = next / zoom.scale
                zoom.x += (x - (rect.left + rect.width / 2)) * (1 - ratio)
                zoom.y += (y - (rect.top + rect.height / 2)) * (1 - ratio)
                zoom.scale = next
                if (next === 1) Object.assign(zoom, { x: 0, y: 0 })
                methods.zoom.clamp()
            },
            toggle(x: number, y: number): void {
                methods.zoom.at(zoomed.value ? 1 : DOUBLE, x, y)
            },
            reset(): void {
                state.value.zoom = { scale: 1, x: 0, y: 0 }
                state.value.gesture = undefined
            },
        },
        pointer: {
            distance(): number {
                const [a, b] = [...touch.pointers.values()]
                return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
            },
            center(): { x: number, y: number } {
                const [a, b] = [...touch.pointers.values()]
                return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: 0, y: 0 }
            },
            down(event: PointerEvent): void {
                if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return

                try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId) } catch { }
                touch.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
                state.value.gesture = true
                if (touch.pointers.size === 2) {
                    touch.pinch = { distance: methods.pointer.distance(), scale: state.value.zoom.scale }
                    touch.start = undefined
                } else if (touch.pointers.size === 1) {
                    touch.start = { x: event.clientX, y: event.clientY }
                }
            },
            move(event: PointerEvent): void {
                const prev = touch.pointers.get(event.pointerId)
                if (!prev) return
                const point = { x: event.clientX, y: event.clientY }
                touch.pointers.set(event.pointerId, point)
                if (touch.pinch && touch.pointers.size === 2) {
                    const center = methods.pointer.center()
                    methods.zoom.at(touch.pinch.scale * methods.pointer.distance() / touch.pinch.distance, center.x, center.y)
                } else if (touch.pointers.size === 1 && zoomed.value) {
                    state.value.zoom.x += point.x - prev.x
                    state.value.zoom.y += point.y - prev.y
                    methods.zoom.clamp()
                }
            },
            up(event: PointerEvent): void {
                if (!touch.pointers.has(event.pointerId)) return
                touch.pointers.delete(event.pointerId)

                if (touch.pointers.size) { touch.pinch = undefined; return }
                state.value.gesture = undefined
                if (touch.pinch) {
                    touch.pinch = undefined
                    if (state.value.zoom.scale < 1.05) methods.zoom.reset()
                    return
                }
                if (!touch.start || event.type === 'pointercancel') return
                const dx = event.clientX - touch.start.x
                const dy = event.clientY - touch.start.y
                touch.start = undefined

                if (!zoomed.value && event.pointerType !== 'mouse' && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
                    methods.step(dx < 0 ? 1 : -1)
                    return
                }

                if (event.pointerType === 'mouse' || Math.hypot(dx, dy) >= 10) return
                const near = Math.hypot(event.clientX - touch.tap.x, event.clientY - touch.tap.y) < 30
                if (event.timeStamp - touch.tap.time < 300 && near) {
                    methods.zoom.toggle(event.clientX, event.clientY)
                    touch.tap.time = 0
                } else {
                    touch.tap = { time: event.timeStamp, x: event.clientX, y: event.clientY }
                }
            },
        },
        wheel(event: WheelEvent): void {
            if (!event.ctrlKey && !event.metaKey) return
            event.preventDefault()
            methods.zoom.at(state.value.zoom.scale * Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY)
        },
    }

    const zoomed = computed<boolean>(() => state.value.zoom.scale > 1.01)

    const transform = computed<{ transform: string, transition?: string, cursor: string }>(() => ({
        transform: `translate(${state.value.zoom.x}px, ${state.value.zoom.y}px) scale(${state.value.zoom.scale})`,
        transition: state.value.gesture ? 'none' : undefined,
        cursor: zoomed.value ? 'grab' : 'zoom-in',
    }))

    watch(index, methods.zoom.reset)
    watch(open, (value) => { if (!value) methods.zoom.reset() })
    watch(() => props.images.length, (count) => {
        index.value = Math.max(0, Math.min(index.value, count - 1))
        if (!count) open.value = undefined
    })
</script>

<template>
    <CommonModal
        v-model:open="open"
        :title="props.label"
        :description="`${index + 1} / ${props.images.length}`"
        :heading="props.id ?? props.label"
        :command="`\0d~/projects/${props.id ?? props.label}/screenshots \0p$ \0oopen \0s${methods.filename()}`"
        @keydown.left.prevent="methods.step(-1)"
        @keydown.right.prevent="methods.step(1)"
    >
        <template #actions>
            <span class="flex shrink-0 items-center border-l border-default px-4 text-sm tabular-nums" aria-hidden="true">
                <CommonHighlight :text="`${methods.pad(index + 1)}\0d/${methods.pad(props.images.length)}`"/>
            </span>
        </template>

        <div
            class="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden p-4 select-none sm:p-8 lg:px-24"
            @pointerdown="methods.pointer.down"
            @pointermove="methods.pointer.move"
            @pointerup="methods.pointer.up"
            @pointercancel="methods.pointer.up"
            @wheel="methods.wheel"
            @dblclick="(event) => methods.zoom.toggle(event.clientX, event.clientY)"
        >
            <div aria-hidden="true" class="bg-lines absolute inset-0 opacity-20"/>
            <Transition
                mode="out-in"
                enter-active-class="duration-200 ease-out"
                leave-active-class="duration-150 ease-in"
                :enter-from-class="state.direction > 0 ? 'opacity-0 translate-x-6' : 'opacity-0 -translate-x-6'"
                :leave-to-class="state.direction > 0 ? 'opacity-0 -translate-x-6' : 'opacity-0 translate-x-6'"
            >
                <img
                    v-if="props.images[index]"
                    ref="image"
                    :key="props.images[index]"
                    :src="props.images[index]"
                    :style="transform"
                    :alt="`${props.label} · ${index + 1} / ${props.images.length}`"
                    draggable="false"
                    class="relative max-h-full max-w-full object-contain transition-all duration-200 ease-out select-none"
                >
            </Transition>

            <template v-if="props.images.length > 1">
                <button
                    v-for="side in ([-1, 1] as const)"
                    :key="side"
                    type="button"
                    :class="[
                        'absolute top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center border border-default bg-default transition-colors hover:border-primary hover:bg-primary hover:text-inverted focus-visible:outline-offset-2 max-sm:hidden',
                        side < 0 ? 'left-4 lg:left-6' : 'right-4 lg:right-6'
                    ]"
                    :aria-label="side < 0 ? t('labels.previous') : t('labels.next')"
                    @click="methods.step(side)"
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="side < 0 ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'"/></svg>
                </button>
            </template>
        </div>

        <template #footer>
            <footer v-if="props.images.length > 1" class="flex shrink-0 items-center justify-between gap-6 border-t border-default px-4 py-3 sm:px-5">
                <GalleryThumbnails :model-value="index" :images="props.images" :label="props.label" class="min-w-0" @update:model-value="methods.select"/>
                <p class="flex shrink-0 items-center gap-4 text-xs text-dimmed max-md:hidden" aria-hidden="true">
                    <span class="flex items-center gap-1.5"><kbd
                        v-for="path in ['M19 12H5m6-6-6 6 6 6', 'M5 12h14m-6-6 6 6-6 6']"
                        :key="path"
                        class="flex h-5.5 items-center border border-default px-1 text-default"
                    ><svg viewBox="0 0 24 24" class="size-3" fill="none" stroke="currentColor" stroke-width="2"><path :d="path"/></svg></kbd>{{ t('labels.viewer_navigate') }}</span>
                    <span class="flex items-center gap-1.5"><kbd class="border border-default px-1.5 py-0.5 text-default">esc</kbd>{{ t('labels.viewer_close') }}</span>
                </p>
            </footer>
        </template>
    </CommonModal>
</template>
