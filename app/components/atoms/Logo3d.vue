<script setup lang="ts">
    // Extruded logo-mini rendered as live SVG. Depth equals the logo height (18),
    // so seen edge-on the mark reads as an 18×18 square.
    // 0 — stacked slices, 1 — wireframe tumble, 2 — solid flip-and-hold.
    const props = defineProps<{ variant: 0 | 1 | 2 }>()

    type V2 = [number, number]
    type V3 = [number, number, number]
    type Shape = { d: string, style: string }

    const OUTLINE: V2[] = ([
        [18, 13.5], [22.5, 9], [18, 4.5], [13.5, 9], [13.5, 0], [22.5, 0], [27, 4.5], [27, 13.5], [22.5, 18],
        [13.5, 18], [9, 13.5], [4.5, 18], [0, 18], [0, 13.5], [4.5, 9], [0, 4.5], [0, 0], [4.5, 0],
    ] as V2[]).map(([x, y]) => [x - 13.5, y - 9])
    const HALF_DEPTH = 9
    const CAMERA = 140
    const COLOR = 'var(--ui-primary)'
    const LIGHT: V3 = (() => {
        const v: V3 = [-0.45, -0.55, 0.7]
        const l = Math.hypot(...v)
        return v.map(x => x / l) as V3
    })()

    const faces = (() => {
        const n = OUTLINE.length
        let area = 0
        for (let i = 0; i < n; i++) {
            const a = OUTLINE[i]!, b = OUTLINE[(i + 1) % n]!
            area += a[0] * b[1] - b[0] * a[1]
        }
        const list: { v: V3[], n: V3, cap: boolean }[] = [
            { v: OUTLINE.map(([x, y]) => [x, y, HALF_DEPTH]), n: [0, 0, 1], cap: true },
            { v: OUTLINE.map(([x, y]) => [x, y, -HALF_DEPTH]), n: [0, 0, -1], cap: true },
        ]
        for (let i = 0; i < n; i++) {
            const a = OUTLINE[i]!, b = OUTLINE[(i + 1) % n]!
            const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy)
            const normal: V3 = area > 0 ? [dy / l, -dx / l, 0] : [-dy / l, dx / l, 0]
            list.push({
                v: [[a[0], a[1], HALF_DEPTH], [b[0], b[1], HALF_DEPTH], [b[0], b[1], -HALF_DEPTH], [a[0], a[1], -HALF_DEPTH]],
                n: normal,
                cap: false,
            })
        }
        return list
    })()

    const rotate = ([x0, y0, z0]: V3, ry: number, rx: number): V3 => {
        const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx)
        const x = x0 * cy + z0 * sy, z = -x0 * sy + z0 * cy
        return [x, y0 * cx - z * sx, y0 * sx + z * cx]
    }
    const project = ([x, y, z]: V3): V2 => {
        const s = CAMERA / (CAMERA - z)
        return [x * s, y * s]
    }
    const toPath = (points: V2[]) => 'M' + points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + 'Z'
    const ease = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

    const pose = (t: number): [number, number] => {
        if (props.variant === 0) return [t * 1.1, 0.35 * Math.sin(t * 0.7)]
        if (props.variant === 1) return [t * 0.9, t * 0.55]
        const segment = 1.6, move = 0.55
        const u = (t % segment) / segment, k = Math.floor(t / segment)
        return [(k + (u < move ? ease(u / move) : 1)) * Math.PI / 2, 0]
    }

    const slices = (ry: number, rx: number): Shape[] => {
        const count = 7
        return Array.from({ length: count }, (_, i) => {
            const z = -HALF_DEPTH + (2 * HALF_DEPTH * i) / (count - 1)
            const points = OUTLINE.map(([x, y]) => rotate([x, y, z], ry, rx))
            return { points, z: rotate([0, 0, z], ry, rx)[2] }
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

    const solid = (ry: number, rx: number, wire: boolean): Shape[] => faces
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

    const render = (t: number): Shape[] => {
        const [ry, rx] = pose(t)
        return props.variant === 0 ? slices(ry, rx) : solid(ry, rx, props.variant === 1)
    }

    const shapes = shallowRef<Shape[]>(render(0))

    const bounce = ref<SVGSVGElement>()
    watch(() => props.variant, () => bounce.value?.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(0.6)', offset: 0.2 },
        { transform: 'scale(1.25)', offset: 0.5 },
        { transform: 'scale(0.92)', offset: 0.75 },
        { transform: 'scale(1)' },
    ], { duration: 550, easing: 'ease-out' }))

    let frame = 0
    onMounted(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            shapes.value = render(props.variant === 2 ? 0 : 0.6)
            return
        }
        let t = 0, last = performance.now()
        const loop = (now: number) => {
            t += Math.min(0.05, (now - last) / 1000)
            last = now
            shapes.value = render(t)
            frame = requestAnimationFrame(loop)
        }
        frame = requestAnimationFrame(loop)
    })
    onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
    <svg ref="bounce" viewBox="-20 -20 40 40" width="54" height="54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path v-for="(shape, i) in shapes" :key="i" :d="shape.d" :style="shape.style"/>
    </svg>
</template>
