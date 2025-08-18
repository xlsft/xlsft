<script setup lang="ts">

    import { useBadge, useDebouncer, usePureClick } from '@xlsft/nuxt'
    import type { PixelBattleOptions, PixelBattleState } from '~/types/pixlebattle.types'
    import type { TelegramAuthUser } from '~/types/telegram.types';
    import TelegramAuth from '../global/TelegramAuth.vue';
    import { parseGIF, decompressFrames } from 'gifuct-js'
    import { format, formatDistanceToNow, formatRelative, isToday, isYesterday, subDays } from 'date-fns'
    import { ru, enUS } from 'date-fns/locale'

    const debouncer = useDebouncer(2000)
    const { t, locale } = useI18n()
    const ip = ref<string>()
    const socket = useSocket();
    const canvas = ref<HTMLCanvasElement | null>(null)
    let ctx: CanvasRenderingContext2D | null = null

    const options: PixelBattleOptions = {
        cols: 512,
        rows: 512,
        base: 16,
        padding: 256,
        gif: {
            url: '/ralsei.gif',
            speed: 8
        },
        name: 'pb',
        scale: {
            min: .1,
            max: 6,
            threshold: 8
        },
        colors: {
            map: { 0: useBadge('#000000'), 1: useBadge('#ffffff'), 2: useBadge('#f97316'), 3: useBadge('#eab308'), 4: useBadge('#10b981'), 5: useBadge('#2B7FFF'), 6: useBadge('#a855f7'), 7: useBadge('#ec4899'), 8: useBadge('#e11d48'), 9: useBadge('#FFC79F') },
            bg: '#000000',
            fg: '#101010',
            border: '#404040',
            hover: '#ffffff',
        }
    }

    const state = ref<PixelBattleState>({
        loading: true,
        scale: 1,
        frame: 0,
        panning: false,
        offset: { x: 0, y: 0 },
        last: { x: 0, y: 0 },
        gif: {
            frames: [],
            frame: 0,
            delays: [],
            last: 0
        },
        ui: {
            updating: {
                scale: false,
                pos: false
            },
            color: 1,
            current: null
        },
        hover: { x: null, y: null },
        selected: { x: null, y: null },
        touch: { dist: null, center: null },
        map: new Array(options.cols * options.rows).fill(0),
    })

    const user = ref<TelegramAuthUser>()

    const actions = {
        gif: async () => {
            const buffer = await (await fetch(options.gif.url)).arrayBuffer()
            console.log(buffer)
            const gif = parseGIF(buffer)
            console.log(gif)
            const frames = decompressFrames(gif, true)
            state.value.gif.frames = frames.map(f => {
                const cvs = document.createElement('canvas')
                cvs.width = f.dims.width
                cvs.height = f.dims.height
                const cctx = cvs.getContext('2d')!
                const imgData = cctx.createImageData(f.dims.width, f.dims.height)
                imgData.data.set(f.patch)
                cctx.putImageData(imgData, 0, 0)
                return cvs
            })
            state.value.gif.delays = frames.map(f => f.delay)
            console.log(frames)
        },
        clamp: () => {
            if (!canvas.value) return
            const cell = options.base * state.value.scale
            const map_w = options.cols * cell
            const map_h = options.rows * cell
            const w = canvas.value.width / (window.devicePixelRatio || 1)
            const h = canvas.value.height / (window.devicePixelRatio || 1)
            const pad = options.padding

            const min_x = -map_w + pad
            const max_x = w - pad
            const min_y = -map_h + pad
            const max_y = h - pad

            state.value.offset.x = Math.min(max_x, Math.max(min_x, state.value.offset.x))
            state.value.offset.y = Math.min(max_y, Math.max(min_y, state.value.offset.y))
        },
        format: (ts: string) => {
            const date = new Date(ts)
            const loc = locale.value === 'ru' ? ru : enUS
            const now = new Date()

            const secDiff = Math.floor((now.getTime() - date.getTime()) / 1000)

            if (secDiff < 60) {
                return `${locale.value === 'ru' ? 'Поставлен' : 'Placed'} ${formatDistanceToNow(date, { locale: loc, addSuffix: true })}`
            }
            if (isToday(date)) {
                return `${locale.value === 'ru' ? 'Поставлен' : 'Placed'} at ${format(date, 'HH:mm', { locale: loc })}`
            }
            if (isYesterday(date)) {
                return `${locale.value === 'ru' ? 'Поставлен' : 'Placed'} ${locale.value === 'ru' ? 'вчера' : 'yesterday'} at ${format(date, 'HH:mm', { locale: loc })}`
            }
            if (date >= subDays(now, 2) && date < subDays(now, 1)) {
                return `${locale.value === 'ru' ? 'Поставлен' : 'Placed'} ${locale.value === 'ru' ? 'позавчера' : 'the day before yesterday'} at ${format(date, 'HH:mm', { locale: loc })}`
            }
            return `${locale.value === 'ru' ? 'Поставлен' : 'Placed'} ${formatRelative(date, now, { locale: loc })}`
        },
        resize: () => {
            if (!canvas.value) return
            const parent = document.body
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
                const color = options.colors.map[key as keyof typeof options.colors.map]?.background || options.colors.bg
                if (color === options.colors.bg) continue
                const sx = state.value.offset.x + c * cell
                const sy = state.value.offset.y + r * cell
                ctx.fillStyle = color
                ctx.fillRect(sx, sy, cell, cell)
            }
            
            if ((!only.length || only.includes('lines'))) { 
                const sx = state.value.offset.x
                const sy = state.value.offset.y
                const gw = options.cols * cell
                const gh = options.rows * cell

                if (cell >= options.scale.threshold) {
                    ctx.strokeStyle = options.colors.fg
                    ctx.lineWidth = 1
                    ctx.beginPath()

                    for (let c = sc; c <= ec; c++) {
                        const x = state.value.offset.x + c * cell + 0.5
                        if (x >= sx && x <= sx + gw) {
                            ctx.moveTo(x, sy)
                            ctx.lineTo(x, sy + gh)
                        }
                    }

                    for (let r = sr; r <= er; r++) {
                        const y = state.value.offset.y + r * cell + 0.5
                        if (y >= sy && y <= sy + gh) {
                            ctx.moveTo(sx, y)
                            ctx.lineTo(sx + gw, y)
                        }
                    }
                }

                ctx.stroke()
                ctx.strokeStyle = options.colors.border; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, gw, gh)
            }

            if (!only.length || only.includes('hover')) if (state.value.hover.x !== null && state.value.hover.y !== null) {
                const sx = state.value.offset.x + state.value.hover.x * cell
                const sy = state.value.offset.y + state.value.hover.y * cell
                ctx.globalAlpha = 0.1; ctx.fillStyle = options.colors.hover; ctx.fillRect(sx, sy, cell, cell); ctx.globalAlpha = 1
            }

            if (!only.length || only.includes('selected')) if (state.value.selected.x !== null && state.value.selected.y !== null) {
                const sx = state.value.offset.x + state.value.selected.x * cell
                const sy = state.value.offset.y + state.value.selected.y * cell
                ctx.strokeStyle = state.value.ui.color === 0 ? options.colors.hover : options.colors.map[state.value.ui.color]?.background!
                ctx.lineWidth = 2
                ctx.globalAlpha = 1
                ctx.strokeRect(sx + 1, sy + 1, cell - 2, cell - 2)
            }

            if (!only.length || only.includes('popup')) {
                const x = state.value.selected.x
                const y = state.value.selected.y
                const info = state.value.ui.current
                if (x !== null && y !== null && info !== null) {
                    const sx = state.value.offset.x + x * cell
                    const sy = state.value.offset.y + y * cell
                    const pad = 8
                    const width = 220
                    const lineH = 16
                    const height = 48
                    let px = sx + cell + 8
                    let py = sy - height - 8
                    if (px + width > w - 8) px = sx - width - 8
                    if (px < 8) px = 8
                    if (py < 8) py = sy + cell + 8
                    if (py + height > h - 8) py = h - height - 8

                    const updated = info.updated ? actions.format(info.updated) : ''

                    ctx.beginPath()
                    ctx.rect(px, py, width, height)
                    ctx.fillStyle = options.colors.bg
                    ctx.fill()
                    ctx.lineWidth = 1
                    ctx.strokeStyle = options.colors.border
                    ctx.stroke()

                    const swatchSize = 14
                    const swColor = options.colors.map[info.color as keyof typeof options.colors.map]?.background || options.colors.bg
                    ctx.fillStyle = swColor
                    ctx.fillRect(px + pad, py + pad + 2, swatchSize, swatchSize)
        
                    ctx.font = '12px "Cascadia Mono", monospace'
                    ctx.textBaseline = 'top'
                    ctx.fillStyle = '#fff'
                    const textX = px + pad + swatchSize + pad
                    const textY = py + pad

                    ctx.fillText(`${info.user?.name}`.slice(0,15) ?? 'unknown', textX, textY + 3)
                    ctx.fillStyle = 'rgba(255,255,255,0.5)'
                    ctx.font = '10px "Cascadia Mono", monospace'
                    ctx.fillText(updated, textX - 22, textY + lineH + 6)


                    ctx.font = '12px "Cascadia Mono", monospace'
                    const statusText = info.user?.online ? 'online' : 'offline'
                    ctx.fillStyle = info.user?.online ? options.colors.map[4]?.background || options.colors.fg : options.colors.fg
                    const statusWidth = ctx.measureText(statusText).width
                    ctx.fillText(statusText, px + width - pad - statusWidth, textY + 3)
                }
            }

            if (state.value.gif.frames.length > 0) {
                const now = performance.now();
                const index = state.value.gif.frame;
                const delay = state.value.gif.delays?.[index];
                const speed = options.gif.speed

                const ms = (typeof delay === 'number' && delay > 0)
                    ? (delay * 10) / speed
                    : 100 / speed;
                if (now - (state.value.gif.last ?? 0) >= ms) {
                    state.value.gif.frame = (index + 1) % state.value.gif.frames.length;
                    state.value.gif.last = now;
                }
                const frame = state.value.gif.frames[state.value.gif.frame];
                if (frame) {
                    const sx = state.value.offset.x;
                    const sy = state.value.offset.y;
                    const size = cell;
                    ctx.drawImage(frame, sx, sy - size, size, size);
                }
            }


            state.value.frame = requestAnimationFrame(() => actions.draw())
        },
        move: (e: MouseEvent) => {
            if (!user.value?.id) return
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
                actions.clamp()
                state.value.last.x = e.clientX; state.value.last.y = e.clientY
            }
        },
        leave: () => {
            if (!user.value?.id) return
            state.value.hover.x = null
            state.value.hover.y = null
        },
        wheel: (e: WheelEvent) => {
            if (!user.value?.id) return
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
            actions.clamp()
        },
        pan: {
            start: (e: MouseEvent) => {
                if (!user.value?.id) return
                if (!user.value?.id) return
                state.value.panning = true
                state.value.last.x = e.clientX
                state.value.last.y = e.clientY
            },
            end: () => { 
                if (!user.value?.id) return
                state.value.panning = false
            }
        },
        touch: {
            calc: {
                dist: (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
                center: (a: Touch, b: Touch) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 })
            },
            start: (e: TouchEvent) => {
                if (!user.value?.id) return
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
                if (!user.value?.id) return
                if (!canvas.value) return
                if (e.touches.length === 1 && state.value.panning) {
                    const t = e.touches[0] as Touch
                    const dx = t.clientX - state.value.last.x
                    const dy = t.clientY - state.value.last.y
                    state.value.offset.x += dx
                    state.value.offset.y += dy
                    actions.clamp()
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
                        actions.clamp()
                    }
                    state.value.touch.dist = d
                    state.value.touch.center = c
                }
            },
            end: (e: TouchEvent) => {
                if (!user.value?.id) return
                if (e.touches.length !== 0) return
                state.value.panning = false
            }
        },
        map: {
            load: () => { try {

                const [raw_offset, raw_scale] = [
                    localStorage.getItem(`${options.name}-offset`), 
                    localStorage.getItem(`${options.name}-scale`)
                ]

                if (raw_offset) {
                    const offset = JSON.parse(raw_offset)
                    state.value.offset = offset
                }
                if (raw_scale) {
                    const scale = JSON.parse(raw_scale)
                    state.value.scale = scale
                }

            } catch {} },
            save: (...only: string[]) => { try {
                if (!only.length || only.includes('offset')) localStorage.setItem(`${options.name}-offset`, JSON.stringify(state.value.offset))
                if (!only.length || only.includes('scale')) localStorage.setItem(`${options.name}-scale`, JSON.stringify(state.value.scale))
            } catch {}}
        },
        selected: {
            click: (e: MouseEvent | TouchEvent) => {
                if (!user.value?.id) return
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
                if (!user.value?.id) return
                state.value.selected.x = null
                state.value.selected.y = null
            },
            apply: async () => {
                if (!user.value?.id) return
                if (!state.value.selected.y || !state.value.selected.x || !ip.value) return
                const i =  state.value.selected.y * options.cols + (state.value.selected.x + 1)
                socket.emit('pb:draw', { color: state.value.ui.color, coordinates: state.value.selected, uuid: user.value.uuid })
                state.value.map.splice(i - 1, 1, state.value.ui.color)
                actions.selected.clear()
            },
        }
    }

    onMounted(async () => {
        await actions.gif()
        
        ip.value = (await (await fetch('https://api.ipify.org/?format=json')).json()).ip
        actions.map.load()
        window.addEventListener('resize', actions.resize)
        window.addEventListener('wheel', actions.resize)
        window.addEventListener('touchstart', actions.resize)
        actions.resize(); ctx = canvas.value!.getContext('2d')
        const rect = canvas.value!.getBoundingClientRect()
        if (!state.value.offset.x) state.value.offset.x = (rect.width - (options.cols * options.base * state.value.scale)) / 2
        if (!state.value.offset.y) state.value.offset.y = (rect.height - (options.rows * options.base * state.value.scale)) / 2
        actions.draw()
        socket.emit('pb:init'); socket.on('pb:init:response', (base36: string) => {
            const decode = (str: string) => {
                const pixels = []
                for (let i = 0; i < str.length; i += 5) {
                    const n = parseInt(str.slice(i, i + 5), 36)
                    const x = (n >> 13) & 0x1ff
                    const y = (n >> 4) & 0x1ff
                    const c = n & 0xf
                    pixels.push({ x, y, c })
                }

                const array = new Array(options.cols * options.rows).fill(0)
                for (const { x, y, c } of pixels) {
                    if (x == null || y == null) continue
                    const index = y * options.cols + x
                    array[index] = c
                }

                return array
            }

            state.value.map = decode(base36)
            state.value.loading = false
        })
    })

    watch(() => state.value.offset, () => actions.map.save('offset'), { deep: true })
    watch(() => state.value.scale, () => { actions.map.save('scale'); state.value.ui.updating.scale = true; debouncer.use(() => state.value.ui.updating.scale = false)})
    watch(() => [state.value.hover, state.value.selected], () => state.value.ui.updating.pos = !!((state.value.hover.x && state.value.hover.y) || (state.value.selected.x && state.value.selected.y)), { deep: true })
    watch(() => state.value.selected, () => { state.value.ui.current = null; socket.emit('pb:info', state.value.selected) }, { deep: true })
    watch(() => state.value.ui.color, () => actions.draw('selected'))
    socket.on('pb:update', (base36: string) => {
        const decode = (str: string) => {
            const pixels = []
            for (let i = 0; i < str.length; i += 5) {
                const n = parseInt(str.slice(i, i + 5), 36)
                const x = (n >> 13) & 0x1ff
                const y = (n >> 4) & 0x1ff
                const c = n & 0xf
                pixels.push({ x, y, c })
            }

            return pixels
        }
        const pixels = decode(base36)
        pixels.forEach((pixel) => state.value.map.splice((pixel.y * options.cols + (pixel.x + 1)) - 1, 1, pixel.c))
    })
    socket.on('pb:info:response', (data) => {
        state.value.ui.current = data
    })

    onBeforeUnmount(() => {
        window.removeEventListener('resize', actions.resize)
        window.removeEventListener('wheel', actions.resize)
        window.removeEventListener('touchstart', actions.resize)
        cancelAnimationFrame(state.value.frame)
    })
    usePureClick(canvas, actions.selected.click)

</script>

<template>
    <div @mouseleave="() => {
        actions.leave()
        actions.pan.end()
    }" class="p-0! print:hidden border-none! max-sm:fixed! max-sm:top-0! max-sm:left-0! max-sm:z-[99999]! max-sm:h-dvh bg-black">
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
        <template v-if="user?.id">
            <div class="max-sm:top-[24px]! h-[16px] bg-black border text-xs! text-white/50! px-[6px] absolute bottom-[24px] right-[24px] pointer-events-none duration-500" :class="state.ui.updating.scale ? 'opacity-100' : 'opacity-0'">{{ (state.scale * 100).toFixed(0) }}%</div>
            <div class="max-sm:top-[24px]! h-[16px] bg-black border text-xs! text-white/50! px-[6px] absolute bottom-[24px] left-[24px] pointer-events-none duration-500" :class="state.ui.updating.pos && ((state.hover.x && state.hover.y) || (state.selected.x != null && state.selected.y != null)) ? 'opacity-100' : 'opacity-0'">{{ state.selected.x || state.hover.x || 0 }}x{{ state.selected.y || state.hover.y || 0 }}</div>
            <div class="bg-black p-[6px] max-sm:p-[12px] flex max-sm:flex-col gap-[6px] max-sm:gap-[12px] absolute border bottom-[24px] left-1/2 -translate-x-1/2 max-sm:w-full max-sm:bottom-0 max-sm:border-none! max-sm:outline-1 outline-offset-[1px]" :class="state.selected.x != null && state.selected.y != null ? 'opacity-100 *:pointer-events-auto pointer-events-auto' : 'opacity-0 *:pointer-events-none pointer-events-none'">
                <div class="flex max-sm:flex-wrap w-full gap-[6px] max-sm:gap-[12px]">
                    <div :data-current="state.ui.color === i" class=" data-[current=true]:opacity-100 data-[current=false]:opacity-25 max-sm:min-h-[32px] max-sm:min-w-[32px] max-sm:grow max-sm:w-[48px] h-[24px] w-[24px] flex items-center justify-center text-[24px]! font-bold cursor-nw-resize! hover:opacity-50" @click="state.ui.color = i" :class="i === 0 ? 'border': ''" :style="{ background: `${color.background} !important` }" v-for="color, i in Object.values(options.colors.map)" @mouseleave="() => {
                        actions.leave()
                        actions.pan.end()
                    }">
                    </div>
                </div>
                <div class="w-full flex items-center justify-between gap-[6px] max-sm:gap-[12px]">
                    <button mini black class="h-[24px]! max-sm:h-[48px]! max-sm:grow py-0! text-xs! max-sm:text-lg!" @click="actions.selected.clear">{{ t('cancel') }}</button>
                    <button mini class="h-[24px]! max-sm:h-[48px]! max-sm:grow py-0! text-xs! max-sm:text-lg!" @click="actions.selected.apply">{{ t('apply') }}</button>
                </div>
            </div>
        </template>
        <template v-else>
            <div class="w-full h-full flex-col backdrop-blur-3xl absolute gap-[24px] top-0 left-0 flex items-center justify-center">
                <div class="w-fit h-fit border bg-black p-[24px] flex flex-col gap-[24px]">
                    <img src="/pixelbattle.svg" class="max-w-[80dvw] w-fit h-[32px]">
                    <p class="max-w-[400px]">
                        <b>{{ t('rules_title') }}:</b><br>
                        {{ t('rules_text') }}
                    </p>
                    <div class="flex flex-wrap items-center justify-center gap-[12px] max-w-[80dvw]">
                        <TelegramAuth v-model="user"/>
                        <button black>{{ t('return') }}</button>
                    </div>
                </div>

            </div>
        </template>
    </div>
</template>

<style scoped>
    canvas { touch-action: none; user-select: none; }
</style>

<i18n>
    {
        "ru": {
            "enter_pixel_battle": "Участвовать в пиксель-баттле",
            "apply": "Поставить",
            "cancel": "Отмена",
            "return": "Вернуться к резюме",
            "rules_title": "Правила",
            "rules_text": "КД нет, тематики нет, запретов нет (кроме законов РФ), боты приветствуются (только не положите сервак пж), удачи."
        },
        "en": {
            "enter_pixel_battle": "Enter pixel battle",
            "apply": "Place",
            "cancel": "Cancel",
            "return": "Return to CV",
            "rules_title": "Rules",
            "rules_text": "No cooldown, no specific theme, no restrictions (except Russian laws), bots are welcome (just don’t crash the server please), good luck."
        },
    }
</i18n>
