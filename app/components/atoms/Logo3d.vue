<script setup lang="ts">
    // Extruded logo-mini. Depth equals the logo height (18), so seen edge-on the mark reads as an 18×18 square.
    // SVG variants: 0 — stacked slices, 1 — wireframe tumble, 2 — solid flip-and-hold.
    // Canvas variants: 3 — particle swarm, 4 — ASCII render, 5 — edge current.
    export type Logo3dVariant = 0 | 1 | 2 | 3 | 4 | 5

    const props = defineProps<{ variant: Logo3dVariant }>()

    type V2 = [number, number]
    type V3 = [number, number, number]
    type Shape = { d: string, style: string }

    const SIZE = 54
    const VIEW = 40 // world units across the frame, centred on 0
    const OUTLINE: V2[] = ([
        [18, 13.5], [22.5, 9], [18, 4.5], [13.5, 9], [13.5, 0], [22.5, 0], [27, 4.5], [27, 13.5], [22.5, 18],
        [13.5, 18], [9, 13.5], [4.5, 18], [0, 18], [0, 13.5], [4.5, 9], [0, 4.5], [0, 0], [4.5, 0],
    ] as V2[]).map(([x, y]) => [x - 13.5, y - 9])
    const N = OUTLINE.length
    const HALF_DEPTH = 9
    const CAMERA = 140
    const COLOR = 'var(--ui-primary)'
    const LIGHT: V3 = (() => {
        const v: V3 = [-0.45, -0.55, 0.7]
        const l = Math.hypot(...v)
        return v.map(x => x / l) as V3
    })()

    const SIDE_NORMALS: V3[] = (() => {
        let area = 0
        for (let i = 0; i < N; i++) {
            const a = OUTLINE[i]!, b = OUTLINE[(i + 1) % N]!
            area += a[0] * b[1] - b[0] * a[1]
        }
        return OUTLINE.map((a, i) => {
            const b = OUTLINE[(i + 1) % N]!
            const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy)
            return area > 0 ? [dy / l, -dx / l, 0] : [-dy / l, dx / l, 0]
        })
    })()

    const FACES = (() => {
        const list: { v: V3[], n: V3, cap: boolean }[] = [
            { v: OUTLINE.map(([x, y]) => [x, y, HALF_DEPTH]), n: [0, 0, 1], cap: true },
            { v: OUTLINE.map(([x, y]) => [x, y, -HALF_DEPTH]), n: [0, 0, -1], cap: true },
        ]
        OUTLINE.forEach((a, i) => {
            const b = OUTLINE[(i + 1) % N]!
            list.push({
                v: [[a[0], a[1], HALF_DEPTH], [b[0], b[1], HALF_DEPTH], [b[0], b[1], -HALF_DEPTH], [a[0], a[1], -HALF_DEPTH]],
                n: SIDE_NORMALS[i]!,
                cap: false,
            })
        })
        return list
    })()

    const inside = (x: number, y: number) => {
        let c = false
        for (let i = 0, j = N - 1; i < N; j = i++) {
            const [xi, yi] = OUTLINE[i]!, [xj, yj] = OUTLINE[j]!
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c
        }
        return c
    }
    const rotate = ([x0, y0, z0]: V3, ry: number, rx: number): V3 => {
        const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx)
        const x = x0 * cy + z0 * sy, z = -x0 * sy + z0 * cy
        return [x, y0 * cx - z * sx, y0 * sx + z * cx]
    }
    const project = ([x, y, z]: V3): V3 => {
        const s = CAMERA / (CAMERA - z)
        return [x * s, y * s, s]
    }
    const toPath = (points: V3[]) => 'M' + points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + 'Z'
    const ease = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

    const pose = (t: number): [number, number] => {
        switch (props.variant) {
            case 0: return [t * 1.1, 0.35 * Math.sin(t * 0.7)]
            case 1: return [t * 0.9, t * 0.55]
            case 2: {
                const segment = 1.6, move = 0.55
                const u = (t % segment) / segment, k = Math.floor(t / segment)
                return [(k + (u < move ? ease(u / move) : 1)) * Math.PI / 2, 0]
            }
            case 3: return [t, 0.3 * Math.sin(t * 0.6)]
            case 4: return [t * 0.9, 0.35 * Math.sin(t * 0.5)]
            case 5: return [t * 0.8, 0.25 + 0.15 * Math.sin(t * 0.7)]
        }
    }

    // ── SVG variants ────────────────────────────────────────────────────────

    const slices = (ry: number, rx: number): Shape[] => {
        const count = 7
        return Array.from({ length: count }, (_, i) => {
            const z = -HALF_DEPTH + (2 * HALF_DEPTH * i) / (count - 1)
            return { points: OUTLINE.map(([x, y]) => rotate([x, y, z], ry, rx)), z: rotate([0, 0, z], ry, rx)[2] }
        })
            .sort((a, b) => a.z - b.z)
            .map(({ points, z }) => {
                const k = (z + HALF_DEPTH) / (2 * HALF_DEPTH)
                return {
                    d: toPath(points.map(project)),
                    style: `fill:${COLOR};fill-opacity:${(0.04 + 0.1 * k).toFixed(3)};stroke:${COLOR};stroke-opacity:${(0.3 + 0.7 * k).toFixed(3)};stroke-width:.6;stroke-linejoin:round`,
                }
            })
    }

    const solid = (ry: number, rx: number, wire: boolean): Shape[] => FACES
        .map((face) => {
            const verts = face.v.map(p => rotate(p, ry, rx))
            const n = rotate(face.n, ry, rx)
            const c = verts.reduce<V3>((a, p) => [a[0] + p[0] / verts.length, a[1] + p[1] / verts.length, a[2] + p[2] / verts.length], [0, 0, 0])
            const visible = -n[0] * c[0] - n[1] * c[1] + n[2] * (CAMERA - c[2]) > 0
            return { d: toPath(verts.map(project)), z: c[2], visible, n, cap: face.cap }
        })
        .filter(f => wire || f.visible)
        .sort((a, b) => a.z - b.z)
        .map((f) => {
            if (wire) return {
                d: f.d,
                style: f.visible
                    ? `fill:${COLOR};fill-opacity:${f.cap ? 0.12 : 0.05};stroke:${COLOR};stroke-width:.8;stroke-linejoin:round`
                    : `fill:none;stroke:${COLOR};stroke-opacity:.25;stroke-width:.5;stroke-dasharray:1.5 1.5`,
            }
            const k = Math.max(0, f.n[0] * LIGHT[0] + f.n[1] * LIGHT[1] + f.n[2] * LIGHT[2])
            const mix = Math.round(f.cap ? 82 + k * 18 : 40 + k * 45)
            const color = `color-mix(in oklab, ${COLOR} ${mix}%, black)`
            return { d: f.d, style: `fill:${color};stroke:${color};stroke-width:.3;stroke-linejoin:round` }
        })

    // ── Canvas variants ─────────────────────────────────────────────────────

    type Particle = { home: V3, offset: V3, spin: number }
    let particles: Particle[] | undefined
    const getParticles = () => particles ??= (() => {
        const homes: V3[] = []
        OUTLINE.forEach((a, i) => {
            const b = OUTLINE[(i + 1) % N]!
            const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.1))
            for (let k = 0; k < n; k++) {
                const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n
                homes.push([x, y, HALF_DEPTH], [x, y, -HALF_DEPTH])
            }
            for (let z = -HALF_DEPTH + 2; z < HALF_DEPTH; z += 2.25) homes.push([a[0], a[1], z])
        })
        for (let k = 0; k < 160; k++) {
            let x, y
            do { x = (Math.random() - 0.5) * 27; y = (Math.random() - 0.5) * 18 } while (!inside(x, y))
            homes.push([x, y, Math.random() < 0.5 ? HALF_DEPTH : -HALF_DEPTH])
        }
        // Each particle bursts to a random point inside a sphere that stays within the frame.
        return homes.map((home) => {
            const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1), r = 15 * Math.cbrt(Math.random())
            const target: V3 = [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)]
            return { home, offset: [target[0] - home[0], target[1] - home[1], target[2] - home[2]], spin: Math.random() }
        })
    })()

    const burst = (t: number) => {
        const u = t % 5
        if (u < 2.6) return 0
        const v = u - 2.6
        if (v < 0.5) return 1 - Math.pow(1 - v / 0.5, 3)
        return 1 - ease(Math.min(1, (v - 0.5) / 1.6))
    }

    const drawParticles = (ctx: CanvasRenderingContext2D, t: number, ry: number, rx: number) => {
        const b = burst(t), limit = VIEW / 2 - 0.6
        const points = getParticles().map(({ home, offset, spin }) => {
            const r = rotate([home[0] + offset[0] * b, home[1] + offset[1] * b, home[2] + offset[2] * b], ry + b * (1 + spin) * 0.42, rx)
            const p = project(r)
            const d = Math.hypot(p[0], p[1])
            if (d > limit) { p[0] *= limit / d; p[1] *= limit / d }
            return [p[0], p[1], p[2], r[2]] as const
        }).sort((a, c) => a[3] - c[3])
        for (const [x, y, s, z] of points) {
            ctx.globalAlpha = Math.max(0.15, Math.min(1, 0.25 + (z + 20) / 40 * 0.75))
            ctx.beginPath()
            ctx.arc(x, y, Math.max(0.15, 0.32 * s), 0, Math.PI * 2)
            ctx.fill()
        }
    }

    const ASCII = { cols: 20, rows: 15, chars: ' .,-~:;=!*#$@' }
    let samples: number[][] | undefined
    const getSamples = () => samples ??= (() => {
        const list: number[][] = []
        const step = 0.6
        for (let x = -13.5; x <= 13.5; x += step) for (let y = -9; y <= 9; y += step)
            if (inside(x, y)) list.push([x, y, HALF_DEPTH, 0, 0, 1], [x, y, -HALF_DEPTH, 0, 0, -1])
        OUTLINE.forEach((a, i) => {
            const b = OUTLINE[(i + 1) % N]!, m = SIDE_NORMALS[i]!
            const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)
            for (let k = 0; k < n; k++) for (let z = -HALF_DEPTH; z <= HALF_DEPTH; z += step)
                list.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, z, m[0], m[1], m[2]])
        })
        return list
    })()
    const zBuffer = new Float32Array(ASCII.cols * ASCII.rows)
    const lBuffer = new Float32Array(ASCII.cols * ASCII.rows)

    const drawAscii = (ctx: CanvasRenderingContext2D, ry: number, rx: number) => {
        const { cols, rows, chars } = ASCII, cw = VIEW / cols, rh = VIEW / rows
        zBuffer.fill(-1e9)
        for (const s of getSamples()) {
            const r = rotate([s[0]!, s[1]!, s[2]!], ry, rx), p = project(r)
            const cx = Math.floor((p[0] + VIEW / 2) / cw), cy = Math.floor((p[1] + VIEW / 2) / rh)
            if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue
            const id = cy * cols + cx
            if (r[2] > zBuffer[id]!) {
                zBuffer[id] = r[2]
                const n = rotate([s[3]!, s[4]!, s[5]!], ry, rx)
                lBuffer[id] = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]
            }
        }
        ctx.font = `500 ${(rh * 1.2).toFixed(2)}px ui-monospace, Menlo, monospace`
        ctx.textBaseline = 'top'
        for (let i = 0; i < cols * rows; i++) {
            if (zBuffer[i]! < -1e8) continue
            const l = Math.max(0, lBuffer[i]!)
            ctx.globalAlpha = 0.45 + 0.55 * l
            ctx.fillText(chars[Math.min(chars.length - 1, 1 + Math.floor(l * (chars.length - 1)))]!, (i % cols) * cw - VIEW / 2, Math.floor(i / cols) * rh - VIEW / 2)
        }
    }

    const EDGES: [V3, V3][] = OUTLINE.flatMap((a, i) => {
        const b = OUTLINE[(i + 1) % N]!
        return [
            [[a[0], a[1], HALF_DEPTH], [b[0], b[1], HALF_DEPTH]],
            [[a[0], a[1], -HALF_DEPTH], [b[0], b[1], -HALF_DEPTH]],
            [[a[0], a[1], HALF_DEPTH], [a[0], a[1], -HALF_DEPTH]],
        ] as [V3, V3][]
    })
    const LOOP_FRONT: V3[] = OUTLINE.map(([x, y]) => [x, y, HALF_DEPTH])
    const LOOP_BACK: V3[] = OUTLINE.map(([x, y]): V3 => [x, y, -HALF_DEPTH]).reverse()
    const along = (loop: V3[], u: number): V3 => {
        const f = ((u % 1) + 1) % 1 * loop.length, i = Math.floor(f), k = f - i
        const a = loop[i]!, b = loop[(i + 1) % loop.length]!
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2]]
    }

    const drawCurrent = (ctx: CanvasRenderingContext2D, t: number, ry: number, rx: number) => {
        const at = (p: V3) => project(rotate(p, ry, rx))
        ctx.lineCap = 'round'
        ctx.globalAlpha = 0.45
        ctx.lineWidth = 0.4
        ctx.beginPath()
        for (const [a, b] of EDGES) {
            const pa = at(a), pb = at(b)
            ctx.moveTo(pa[0], pa[1])
            ctx.lineTo(pb[0], pb[1])
        }
        ctx.stroke()
        const pulses: [V3[], number][] = [[LOOP_FRONT, t * 0.12], [LOOP_FRONT, t * 0.12 + 0.5], [LOOP_BACK, t * 0.12 + 0.25], [LOOP_BACK, t * 0.12 + 0.75]]
        for (const [loop, u] of pulses) {
            const tail = 24
            for (let j = 0; j < tail; j++) {
                const p1 = at(along(loop, u - j * 0.0035)), p2 = at(along(loop, u - (j + 1) * 0.0035))
                ctx.globalAlpha = 1 - j / tail
                ctx.lineWidth = 0.65 * (1 - j / tail) + 0.12
                ctx.beginPath()
                ctx.moveTo(p1[0], p1[1])
                ctx.lineTo(p2[0], p2[1])
                ctx.stroke()
            }
            const head = at(along(loop, u))
            ctx.globalAlpha = 1
            ctx.beginPath()
            ctx.arc(head[0], head[1], 0.8, 0, Math.PI * 2)
            ctx.fill()
        }
        const vt = (t * 1.3) % 1, shift = Math.floor(t * 1.3) * 5
        ctx.globalAlpha = Math.sin(vt * Math.PI)
        for (let i = 0; i < N; i += 3) {
            const a = OUTLINE[(i + shift) % N]!, p = at([a[0], a[1], HALF_DEPTH - 2 * HALF_DEPTH * vt])
            ctx.beginPath()
            ctx.arc(p[0], p[1], 0.5, 0, Math.PI * 2)
            ctx.fill()
        }
    }

    // ── Rendering ───────────────────────────────────────────────────────────

    const isCanvas = computed(() => props.variant >= 3)
    const root = ref<HTMLElement>()
    const canvas = ref<HTMLCanvasElement>()
    const shapes = shallowRef<Shape[]>([])

    const draw = (t: number) => {
        const [ry, rx] = pose(t)
        if (!isCanvas.value) {
            shapes.value = props.variant === 0 ? slices(ry, rx) : solid(ry, rx, props.variant === 1)
            return
        }
        const el = canvas.value, ctx = el?.getContext('2d')
        if (!el || !ctx || !root.value) return
        const dpr = window.devicePixelRatio || 1
        if (el.width !== SIZE * dpr) el.width = el.height = SIZE * dpr
        const scale = dpr * SIZE / VIEW
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, el.width, el.height)
        ctx.setTransform(scale, 0, 0, scale, el.width / 2, el.height / 2)
        const color = getComputedStyle(root.value).color
        ctx.fillStyle = ctx.strokeStyle = color
        if (props.variant === 3) drawParticles(ctx, t, ry, rx)
        else if (props.variant === 4) drawAscii(ctx, ry, rx)
        else drawCurrent(ctx, t, ry, rx)
        ctx.globalAlpha = 1
    }

    if (!isCanvas.value) draw(0)

    watch(() => props.variant, () => root.value?.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(0.6)', offset: 0.2 },
        { transform: 'scale(1.25)', offset: 0.5 },
        { transform: 'scale(0.92)', offset: 0.75 },
        { transform: 'scale(1)' },
    ], { duration: 550, easing: 'ease-out' }))

    let frame = 0
    onMounted(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const still = () => nextTick(() => draw(props.variant === 2 ? 0 : 0.6))
            still()
            watch(() => props.variant, still)
            return
        }
        let t = 0, last = performance.now()
        const loop = (now: number) => {
            t += Math.min(0.05, (now - last) / 1000)
            last = now
            draw(t)
            frame = requestAnimationFrame(loop)
        }
        frame = requestAnimationFrame(loop)
    })
    onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
    <span ref="root" class="block text-(--ui-primary)" :style="{ width: `${SIZE}px`, height: `${SIZE}px` }" aria-hidden="true">
        <canvas v-if="isCanvas" ref="canvas" :style="{ width: `${SIZE}px`, height: `${SIZE}px` }"/>
        <svg v-else :viewBox="`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`" :width="SIZE" :height="SIZE" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path v-for="(shape, i) in shapes" :key="i" :d="shape.d" :style="shape.style"/>
        </svg>
    </span>
</template>
