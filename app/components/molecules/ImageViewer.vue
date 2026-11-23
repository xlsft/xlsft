<script setup lang="ts">
    const props = defineProps<{ images: string[], label: string }>()
    const open = defineModel<boolean>('open', { required: true })
    const index = defineModel<number>('index', { default: 0 })
    const { t } = useI18n()

    const pad = (value: number) => String(value).padStart(2, '0')

    // направление последнего шага — от него зависит, с какой стороны въезжает следующий кадр
    const direction = ref<1 | -1>(1)

    function step(delta: 1 | -1) {
        const count = props.images.length
        if (count < 2) return
        direction.value = delta
        index.value = (index.value + delta + count) % count
    }

    function select(value: number) {
        direction.value = value >= index.value ? 1 : -1
        index.value = value
    }

    // имя «файла» в заголовке: индекс кадра с нуля (как в превью) + расширение из урла, как будто открываем screenshots/00.webp
    const filename = computed(() => {
        const ext = props.images[index.value]?.split(/[?#]/)[0]?.match(/\.(\w{2,5})$/)?.[1]?.toLowerCase() || 'png'
        return `${pad(index.value)}.${ext}`
    })

    // зум и жесты: щипок двумя пальцами, двойной тап/клик (x2.5 в точку касания), перетаскивание увеличенного кадра;
    // свайп листает кадры только без увеличения. touch-action: none — браузер не перехватывает жесты сам
    const MAX_SCALE = 4
    const DOUBLE_TAP_SCALE = 2.5
    const img = useTemplateRef<HTMLImageElement>('img')
    const zoom = reactive({ scale: 1, x: 0, y: 0, gesture: false })
    const zoomed = computed(() => zoom.scale > 1.01)
    const imageStyle = computed(() => ({
        transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
        // во время жеста кадр идёт за пальцем без задержки; в остальное время работает transition из классов
        transition: zoom.gesture ? 'none' : undefined,
        cursor: zoomed.value ? 'grab' : 'zoom-in'
    }))

    // сдвиг не даёт краю увеличенного кадра уйти внутрь окна
    function clamp(scale = zoom.scale) {
        const el = img.value
        if (!el) return
        const maxX = Math.max(0, (el.offsetWidth * scale - el.offsetWidth) / 2)
        const maxY = Math.max(0, (el.offsetHeight * scale - el.offsetHeight) / 2)
        zoom.x = Math.min(maxX, Math.max(-maxX, zoom.x))
        zoom.y = Math.min(maxY, Math.max(-maxY, zoom.y))
    }

    // масштаб с фиксированной точкой (clientX/Y): то, что под пальцем, остаётся под пальцем
    function zoomAt(scale: number, clientX: number, clientY: number) {
        const el = img.value
        if (!el) return
        const next = Math.min(MAX_SCALE, Math.max(1, scale))
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const ratio = next / zoom.scale
        zoom.x += (clientX - cx) * (1 - ratio)
        zoom.y += (clientY - cy) * (1 - ratio)
        zoom.scale = next
        if (next === 1) { zoom.x = 0; zoom.y = 0 }
        clamp()
    }

    function toggleZoom(clientX: number, clientY: number) {
        zoomAt(zoomed.value ? 1 : DOUBLE_TAP_SCALE, clientX, clientY)
    }

    function resetZoom() {
        Object.assign(zoom, { scale: 1, x: 0, y: 0, gesture: false })
    }

    const pointers = new Map<number, { x: number, y: number }>()
    let start: { x: number, y: number, time: number } | null = null
    let pinch: { distance: number, scale: number } | null = null
    let lastTap = { time: 0, x: 0, y: 0 }

    const distance = () => {
        const [a, b] = [...pointers.values()]
        return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
    }
    const midpoint = () => {
        const [a, b] = [...pointers.values()]
        return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: 0, y: 0 }
    }

    function onPointerDown(event: PointerEvent) {
        // кнопки листания живут на этой же сцене — их нажатия не трогаем, иначе захват указателя съест click
        if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
        // захват держит жест за сценой, даже если палец уехал за её край; не критичен, если браузер откажет
        try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId) } catch {}
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
        zoom.gesture = true
        if (pointers.size === 2) {
            pinch = { distance: distance(), scale: zoom.scale }
            start = null
        } else if (pointers.size === 1) {
            start = { x: event.clientX, y: event.clientY, time: event.timeStamp }
        }
    }

    function onPointerMove(event: PointerEvent) {
        const prev = pointers.get(event.pointerId)
        if (!prev) return
        const point = { x: event.clientX, y: event.clientY }
        pointers.set(event.pointerId, point)
        if (pinch && pointers.size === 2) {
            const center = midpoint()
            zoomAt(pinch.scale * distance() / pinch.distance, center.x, center.y)
        } else if (pointers.size === 1 && zoomed.value) {
            // увеличенный кадр тащим за палец/мышь
            zoom.x += point.x - prev.x
            zoom.y += point.y - prev.y
            clamp()
        }
    }

    function onPointerUp(event: PointerEvent) {
        if (!pointers.has(event.pointerId)) return
        pointers.delete(event.pointerId)
        if (pointers.size) {
            // после щипка оставшийся палец продолжает как перетаскивание, без свайпа
            pinch = null
            return
        }
        zoom.gesture = false
        if (pinch) { pinch = null; if (zoom.scale < 1.05) resetZoom(); return }
        if (!start || event.type === 'pointercancel') return
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        start = null
        // свайп: быстрый горизонтальный жест без увеличения
        if (!zoomed.value && event.pointerType !== 'mouse' && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
            step(dx < 0 ? 1 : -1)
            return
        }
        // двойной тап на таче (на десктопе — dblclick)
        if (event.pointerType !== 'mouse' && Math.hypot(dx, dy) < 10) {
            const near = Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30
            if (event.timeStamp - lastTap.time < 300 && near) {
                toggleZoom(event.clientX, event.clientY)
                lastTap.time = 0
            } else {
                lastTap = { time: event.timeStamp, x: event.clientX, y: event.clientY }
            }
        }
    }

    // колесо с ctrl/⌘ (и щипок на тачпаде, который браузер шлёт как ctrl+wheel) — зум в точку курсора
    function onWheel(event: WheelEvent) {
        if (!event.ctrlKey && !event.metaKey) return
        event.preventDefault()
        zoomAt(zoom.scale * Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY)
    }

    watch(index, resetZoom)
    watch(open, value => { if (!value) resetZoom() })

    watch(() => props.images.length, count => {
        index.value = Math.max(0, Math.min(index.value, count - 1))
        if (!count) open.value = false
    })
</script>

<template>
    <NuxtModal
        v-model:open="open"
        fullscreen
        :title="label"
        :description="`${index + 1} / ${images.length}`"
        :ui="{ overlay: 'bg-default/80 backdrop-blur-md', content: 'bg-transparent! divide-y-0 ring-0! shadow-none!' }"
    >
        <template #content>
            <div
                class="flex h-full min-h-0 items-center justify-center sm:p-6 lg:p-10"
                @click.self="open = false"
                @keydown.left.prevent="step(-1)"
                @keydown.right.prevent="step(1)"
            >
                <!-- окно терминала: заголовок с командой, кадр на сетке, снизу полоса превью -->
                <div class="flex size-full max-w-7xl flex-col border-default bg-default sm:border">
                    <header class="flex h-12 shrink-0 items-stretch border-b border-default">
                        <p class="flex min-w-0 flex-1 items-center gap-3 px-4 text-sm sm:px-5">
                            <span class="truncate text-dimmed max-sm:hidden">~/Projects/{{ label }}/screenshots</span>
                            <span class="shrink-0 text-primary max-sm:hidden" aria-hidden="true">$</span>
                            <span class="shrink-0 max-sm:hidden" aria-hidden="true">open</span>
                            <span class="shrink-0 text-success max-sm:hidden" aria-hidden="true">{{ filename }}</span>
                            <span class="truncate font-bold sm:hidden">{{ label }}</span>
                        </p>
                        <span class="flex shrink-0 items-center border-l border-default px-4 text-sm tabular-nums" aria-hidden="true">
                            {{ pad(index + 1) }}<span class="text-dimmed">/{{ pad(images.length) }}</span>
                        </span>
                        <button
                            type="button"
                            class="flex aspect-square shrink-0 cursor-pointer items-center justify-center border-l border-default transition-colors hover:bg-inverted hover:text-inverted focus-visible:-outline-offset-2"
                            :aria-label="t('labels.close')"
                            @click="open = false"
                        >
                            <svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
                        </button>
                    </header>

                    <div
                        class="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden p-4 select-none sm:p-8 lg:px-24"
                        @pointerdown="onPointerDown"
                        @pointermove="onPointerMove"
                        @pointerup="onPointerUp"
                        @pointercancel="onPointerUp"
                        @wheel="onWheel"
                        @dblclick="event => toggleZoom(event.clientX, event.clientY)"
                    >
                        <div aria-hidden="true" class="absolute inset-0 opacity-20 bg-[linear-gradient(var(--ui-border)_1px,transparent_1px),linear-gradient(90deg,var(--ui-border)_1px,transparent_1px)] bg-size-[24px_24px] bg-center"/>
                        <Transition
                            mode="out-in"
                            enter-active-class="duration-200 ease-out"
                            leave-active-class="duration-150 ease-in"
                            :enter-from-class="direction > 0 ? 'opacity-0 translate-x-6' : 'opacity-0 -translate-x-6'"
                            :leave-to-class="direction > 0 ? 'opacity-0 -translate-x-6' : 'opacity-0 translate-x-6'"
                        >
                            <img
                                v-if="images[index]"
                                ref="img"
                                :key="images[index]"
                                :src="images[index]"
                                :style="imageStyle"
                                :alt="`${label} · ${index + 1} / ${images.length}`"
                                draggable="false"
                                class="relative max-h-full max-w-full object-contain transition-[transform,translate,opacity] duration-200 ease-out select-none"
                            >
                        </Transition>

                        <template v-if="images.length > 1">
                            <button
                                v-for="side in ([-1, 1] as const)"
                                :key="side"
                                type="button"
                                :class="[
                                    'absolute top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center border border-default bg-default transition-colors hover:border-primary hover:bg-primary hover:text-inverted focus-visible:outline-offset-2 max-sm:hidden',
                                    side < 0 ? 'left-4 lg:left-6' : 'right-4 lg:right-6'
                                ]"
                                :aria-label="side < 0 ? t('labels.previous') : t('labels.next')"
                                @click="step(side)"
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="side < 0 ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'"/></svg>
                            </button>
                        </template>
                    </div>

                    <footer v-if="images.length > 1" class="flex shrink-0 items-center justify-between gap-6 border-t border-default px-4 py-3 sm:px-5">
                        <MoleculesImageThumbnails :model-value="index" :images :label class="min-w-0" @update:model-value="select"/>
                        <p class="flex shrink-0 items-center gap-4 text-xs text-dimmed max-md:hidden" aria-hidden="true">
                            <span class="flex items-center gap-1.5"><kbd
                                    v-for="path in ['M19 12H5m6-6-6 6 6 6', 'M5 12h14m-6-6 6 6-6 6']"
                                    :key="path"
                                    class="flex h-5.5 items-center border border-default px-1 text-default"
                                ><svg viewBox="0 0 24 24" class="size-3" fill="none" stroke="currentColor" stroke-width="2"><path :d="path"/></svg></kbd>{{ t('labels.viewer_navigate') }}</span>
                            <span class="flex items-center gap-1.5"><kbd class="border border-default px-1.5 py-0.5 text-default">esc</kbd>{{ t('labels.viewer_close') }}</span>
                        </p>
                    </footer>
                </div>
            </div>
        </template>
    </NuxtModal>
</template>
