<script setup lang="ts">

    import { useBadge, useDebouncer, usePureClick } from '@xlsft/nuxt'
    import type { PixelBattleOptions, PixelBattleState } from '~/types/pixlebattle.types'
    import { io } from "socket.io-client";

    const debouncer = useDebouncer(2000)
    const { t } = useI18n()
    const ip = ref<string>()
    const socket = io();
    const canvas = ref<HTMLCanvasElement | null>(null)
    let ctx: CanvasRenderingContext2D | null = null

    const options: PixelBattleOptions = {
        cols: 500,
        rows: 500,
        base: 16,
        name: 'pb',
        scale: {
            min: .5,
            max: 6,
            threshold: 1
        },
        colors: {
            map: { 0: '#000', 1: '#fff', 2: '#f97316', 3: '#eab308', 4: '#10b981', 5: '#2B7FFF', 6: '#a855f7', 7: '#ec4899', 8: '#e11d48', },
            bg: '#000',
            fg: '#101010',
            hover: '#fff',
        }
    }

    const state = ref<PixelBattleState>({
        loading: true,
        scale: 1,
        frame: 0,
        panning: false,
        offset: { x: 0, y: 0 },
        last: { x: 0, y: 0 },
        ui: {
            updating: {
                scale: false,
                pos: false
            },
            color: 1
        },
        hover: { x: null, y: null },
        selected: { x: null, y: null },
        touch: { dist: null, center: null },
        map: new Array(options.cols * options.rows).fill(0),
    })

    const actions = {
        resize: () => {
            if (!canvas.value) return
            const parent = canvas.value.parentElement
            if (!parent) return
            const dpr = window.devicePixelRatio || 1
            const rect = parent.getBoundingClientRect()
            canvas.value.width = Math.round(rect.width * dpr)
            canvas.value.height = Math.round(rect.height * dpr)
            canvas.value.style.width = rect.width + 'px'
            canvas.value.style.height = rect.height + 'px'
            if (!ctx) ctx = canvas.value.getContext('2d')
            if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        },
        screen: (sx: number, sy: number) => {
            return {
                x: (sx - state.value.offset.x) / (options.base * state.value.scale),
                y: (sy - state.value.offset.y) / (options.base * state.value.scale),
            }
        },
        draw: (...only: string[]) => {
            if (!canvas.value || !ctx) return
            const w = canvas.value.width / (window.devicePixelRatio || 1)
            const h = canvas.value.height / (window.devicePixelRatio || 1)
            const cell = options.base * state.value.scale
            const x0 = Math.floor((-state.value.offset.x) / cell) - 1
            const y0 = Math.floor((-state.value.offset.y) / cell) - 1
            const x1 = Math.ceil((w - state.value.offset.x) / cell) + 1
            const y1 = Math.ceil((h - state.value.offset.y) / cell) + 1

            if (!only.length) ctx.clearRect(0, 0, w, h); ctx.fillStyle = options.colors.bg; ctx.fillRect(0, 0, w, h)

            const sc = Math.max(0, x0)
            const ec = Math.min(options.cols - 1, x1)
            const sr = Math.max(0, y0)
            const er = Math.min(options.rows - 1, y1)

            if (!only.length || only.includes('tiles')) for (let r = sr; r <= er; r++) for (let c = sc; c <= ec; c++) {
                const idx = r * options.cols + c
                const key = state.value.map[idx]
                const color = options.colors.map[key as keyof typeof options.colors.map] || options.colors.bg
                if (color === options.colors.bg) continue
                const sx = state.value.offset.x + c * cell
                const sy = state.value.offset.y + r * cell
                ctx.fillStyle = color
                ctx.fillRect(sx, sy, cell, cell)
            }
            
            if (!only.length || only.includes('lines')) if (cell >= options.scale.threshold) {
                ctx.strokeStyle = options.colors.fg; ctx.lineWidth = 1; ctx.beginPath()
                for (let c = sc; c <= ec; c++) {
                    const x = state.value.offset.x + c * cell + 0.5
                    ctx.moveTo(x, 0); ctx.lineTo(x, h)
                }
                for (let r = sr; r <= er; r++) {
                    const y = state.value.offset.y + r * cell + 0.5
                    ctx.moveTo(0, y); ctx.lineTo(w, y)
                }
                ctx.stroke()
            }

            if (!only.length || only.includes('hover')) if (state.value.hover.x !== null && state.value.hover.y !== null) {
                const sx = state.value.offset.x + state.value.hover.x * cell
                const sy = state.value.offset.y + state.value.hover.y * cell
                ctx.globalAlpha = 0.1; ctx.fillStyle = options.colors.hover; ctx.fillRect(sx, sy, cell, cell); ctx.globalAlpha = 1
            }

            if (!only.length || only.includes('selected')) if (state.value.selected.x !== null && state.value.selected.y !== null) {
                const sx = state.value.offset.x + state.value.selected.x * cell
                const sy = state.value.offset.y + state.value.selected.y * cell
                ctx.strokeStyle = state.value.ui.color === 0 ? options.colors.hover : options.colors.map[state.value.ui.color]!
                ctx.lineWidth = 2
                ctx.globalAlpha = 1
                ctx.strokeRect(sx + 1, sy + 1, cell - 2, cell - 2)
            }

            state.value.frame = requestAnimationFrame(() => actions.draw())
        },
        move: (e: MouseEvent) => {
            const rect = canvas.value!.getBoundingClientRect()
            const cx = e.clientX - rect.left
            const cy = e.clientY - rect.top
            const world = actions.screen(cx, cy)
            const c = Math.floor(world.x)
            const r = Math.floor(world.y)
            if (c >= 0 && c < options.cols && r >= 0 && r < options.rows) { state.value.hover.x = c; state.value.hover.y = r } 
            else { state.value.hover.x = null; state.value.hover.y = null }

            if (state.value.panning) {
                const dx = e.clientX - state.value.last.x
                const dy = e.clientY - state.value.last.y
                state.value.offset.x += dx; state.value.offset.y += dy
                state.value.last.x = e.clientX; state.value.last.y = e.clientY
            }
        },
        leave: () => {
            state.value.hover.x = null
            state.value.hover.y = null
        },
        wheel: (e: WheelEvent) => {
            const rect = canvas.value!.getBoundingClientRect()
            const cx = e.clientX - rect.left
            const cy = e.clientY - rect.top
            const before = actions.screen(cx, cy)
            const delta = -e.deltaY
            const factor = delta > 0 ? 1.12 : 1 / 1.12
            let ns = state.value.scale * factor; state.value.scale = ns = Math.max(options.scale.min, Math.min(options.scale.max, ns))
            const after = actions.screen(cx, cy)
            state.value.offset.x += (after.x - before.x) * options.base * state.value.scale
            state.value.offset.y += (after.y - before.y) * options.base * state.value.scale
        },
        pan: {
            start: (e: MouseEvent) => {
                state.value.panning = true
                state.value.last.x = e.clientX
                state.value.last.y = e.clientY
            },
            end: () => state.value.panning = false
        },
        touch: {
            calc: {
                dist: (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
                center: (a: Touch, b: Touch) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 })
            },
            start: (e: TouchEvent) => {
                if (!canvas.value) return
                if (e.touches.length === 1) {
                    const t = e.touches[0] as Touch
                    state.value.panning = true
                    state.value.last.x = t.clientX
                    state.value.last.y = t.clientY
                } else if (e.touches.length === 2) {
                    state.value.touch.dist = actions.touch.calc.dist(e.touches[0] as Touch, e.touches[1] as Touch)
                    state.value.touch.center = actions.touch.calc.center(e.touches[0] as Touch, e.touches[1] as Touch)
                }
            },
            move: (e: TouchEvent) => {
                if (!canvas.value) return
                if (e.touches.length === 1 && state.value.panning) {
                    const t = e.touches[0] as Touch
                    const dx = t.clientX - state.value.last.x
                    const dy = t.clientY - state.value.last.y
                    state.value.offset.x += dx
                    state.value.offset.y += dy
                    state.value.last.x = t.clientX
                    state.value.last.y = t.clientY
                } else if (e.touches.length === 2) {
                    const d = actions.touch.calc.dist(e.touches[0] as Touch, e.touches[1] as Touch)
                    const c = actions.touch.calc.center(e.touches[0] as Touch, e.touches[1] as Touch)
                    if (state.value.touch.dist && state.value.touch.center) {
                        const rect = canvas.value.getBoundingClientRect()
                        const px = state.value.touch.center.x - rect.left
                        const py = state.value.touch.center.y - rect.top
                        const before = actions.screen(px, py)

                        const factor = d / state.value.touch.dist
                        let ns = state.value.scale * factor; state.value.scale = ns = Math.max(options.scale.min, Math.min(options.scale.max, ns))

                        const after = actions.screen(px, py)
                        state.value.offset.x += (after.x - before.x) * options.base * state.value.scale
                        state.value.offset.y += (after.y - before.y) * options.base * state.value.scale
                    }
                    state.value.touch.dist = d
                    state.value.touch.center = c
                }
            },
            end: (e: TouchEvent) => {
                if (e.touches.length !== 0) return
                state.value.panning = false
                state.value.touch.dist = null
                state.value.touch.center = null
            }
        },
        map: {
            load: () => { try {
                const saved = localStorage.getItem(`${options.name}-map`)
                if (!saved) return
                const map = JSON.parse(saved)
                if (Array.isArray(map) && map.length === options.cols * options.rows) state.value.map = map
            } catch {} },
            save: () => { try {
                localStorage.setItem(`${options.name}-map`, JSON.stringify(state.value.map))
            } catch {}}
        },
        selected: {
            click: (e: MouseEvent | TouchEvent) => {
                if (!canvas.value) return
                const rect = canvas.value.getBoundingClientRect()
                let x: number, y: number
                if ('touches' in e && e.touches.length > 0) { x = (e.touches[0] as Touch).clientX; y = (e.touches[0] as Touch).clientY } 
                else if ('clientX' in e && 'clientY' in e) { x = e.clientX; y = e.clientY } 
                else return
                
                const cx = x - rect.left
                const cy = y - rect.top
                const world = actions.screen(cx, cy)
                const c = Math.floor(world.x)
                const r = Math.floor(world.y)
                if (c >= 0 && c < options.cols && r >= 0 && r < options.rows) { state.value.selected.x = c; state.value.selected.y = r } 
                else { state.value.selected.x = null; state.value.selected.y = null }
            },
            clear: () => {
                state.value.selected.x = null
                state.value.selected.y = null
            },
            apply: async () => {
                if (!state.value.selected.y || !state.value.selected.x || !ip.value) return
                const i = state.value.selected.y * options.cols + (state.value.selected.x + 1)
                socket.emit('pb:draw', { color: state.value.ui.color, i, ip: ip.value })
                state.value.map.splice(i - 1, 1, state.value.ui.color)
                actions.selected.clear()
            },
        }
    }

    onMounted(async () => {
        ip.value = (await (await fetch('https://api.ipify.org/?format=json')).json()).ip
        actions.map.load()
        window.addEventListener('resize', actions.resize)
        window.addEventListener('wheel', actions.resize)
        actions.resize(); ctx = canvas.value!.getContext('2d')
        const rect = canvas.value!.getBoundingClientRect()
        state.value.offset.x = (rect.width - (options.cols * options.base * state.value.scale)) / 2
        state.value.offset.y = (rect.height - (options.rows * options.base * state.value.scale)) / 2
        actions.draw()
        socket.emit('pb:init'); socket.on('pb:init:response', (map) => {
            state.value.map = map
            state.value.loading = false
        })
    })

    watch(() => state.value.map, actions.map.save, { deep: true })
    watch(() => state.value.scale, () => { state.value.ui.updating.scale = true; debouncer.use(() => state.value.ui.updating.scale = false)})
    watch(() => state.value.hover, () => { state.value.ui.updating.pos = true; debouncer.use(() => state.value.ui.updating.pos = false)}, { deep: true })
    watch(() => state.value.ui.color, () => actions.draw('selected'))
    socket.on('pb:update', (data) => state.value.map.splice(data.i - 1, 1, data.color))

    onBeforeUnmount(() => {
        window.removeEventListener('resize', actions.resize)
        window.removeEventListener('wheel', actions.resize)
        cancelAnimationFrame(state.value.frame)
    })
    usePureClick(canvas, actions.selected.click)

</script>

<template>
    <section @mouseleave="() => {
        actions.leave()
        actions.pan.end()
    }" class="p-0! print:hidden max-sm:hidden h-[600px] border-none!">
        <canvas 
            ref="canvas" 
            class="block w-full h-full bg-black transition-opacity! duration-500!" 
            :class="state.loading ? 'animate-pulse opacity-50 pointer-events-none' : 'opacity-100'"
            @mousedown="actions.pan.start" 
            @mousemove="actions.move" 
            @mouseup="actions.pan.end" 
            @wheel.prevent="actions.wheel" 
            @touchstart.passive="actions.touch.start" 
            @touchmove.passive="actions.touch.move" 
            @touchend="actions.touch.end"
        />
        <div class="bg-black border text-xs! text-white/50! px-[6px] absolute bottom-[24px] right-[24px] pointer-events-none duration-500" :class="state.ui.updating.scale ? 'opacity-100' : 'opacity-0'">{{ (state.scale * 100).toFixed(0) }}%</div>
        <div class="bg-black border text-xs! text-white/50! px-[6px] absolute bottom-[24px] left-[24px] pointer-events-none duration-500" :class="state.ui.updating.pos && state.hover.x && state.hover.y ? 'opacity-100' : 'opacity-0'">{{ state.hover.x || 0 }}x{{ state.hover.y || 0 }}</div>
        <div class="bg-black p-[6px] flex gap-[6px] absolute border bottom-[24px] left-1/2 -translate-x-1/2" :class="state.selected.x && state.selected.y ? 'opacity-100 *:pointer-events-auto pointer-events-auto' : 'opacity-0 *:pointer-events-none pointer-events-none'">
            <div class="h-[24px] w-[24px] flex items-center justify-center text-[24px]! font-bold cursor-nw-resize! hover:opacity-50"  @click="state.ui.color = i" :class="i === 0 ? 'border': ''" :style="useBadge(color)" v-for="color, i in Object.values(options.colors.map)" @mouseleave="() => {
                actions.leave()
                actions.pan.end()
            }">
                <template v-if="state.ui.color === i">
                    •
                </template>
            </div>
            <button mini class="h-[24px]! py-0! text-xs!" @click="actions.selected.apply">{{ t('apply') }}</button>
            <button mini black class="h-[24px]! py-0! text-xs!" @click="actions.selected.clear">{{ t('cancel') }}</button>
        </div>
    </section>
    <div class="w-full h-px bg-neutral-700"></div>
</template>

<style scoped>
    canvas { touch-action: none; user-select: none; }
</style>

<i18n>
    {
        "ru": {
            "apply": "Применить",
            "cancel": "Отмена"
        },
        "en": {
            "apply": "Apply",
            "cancel": "Cancel"
        },
    }
</i18n>
