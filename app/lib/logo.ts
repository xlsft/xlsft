type V2 = [number, number]
type V3 = [number, number, number]
export interface Shape { d: string, style: string }
export interface Glyph { x: number, y: number, char: string, opacity: number }
export interface Glyphs { glyphs: Glyph[], size: number, weight: number }

const SIZE = 54
const VIEW = 40
const OUTLINE: V2[] = ([
    [18, 13.5], [22.5, 9], [18, 4.5], [13.5, 9], [13.5, 0], [22.5, 0], [27, 4.5], [27, 13.5], [22.5, 18],
    [13.5, 18], [9, 13.5], [4.5, 18], [0, 18], [0, 13.5], [4.5, 9], [0, 4.5], [0, 0], [4.5, 0],
] as V2[]).map(([x, y]) => [x - 13.5, y - 9])
const N = OUTLINE.length
const HALF_DEPTH = 9
const CAMERA = 140
const COLOR = 'var(--ui-primary)'

const ink = (a: number, dark: boolean): number => dark ? a : 1 - (1 - a) * 0.45
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
const toPath = (points: V3[]) => `M${ points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') }Z`
const circle = (x: number, y: number, r: number): string => `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`
const segment = (a: V3, b: V3): string => `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`
const ease = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

const pose = (variant: number, t: number): [number, number] => {
    switch (variant) {
    case 0: return [t * 1.1, 0.35 * Math.sin(t * 0.7)]
    case 1: return [t * 0.9, t * 0.55]
    case 2: {
        const segment = 1.6, move = 0.55
        const u = (t % segment) / segment, k = Math.floor(t / segment)
        return [(k + (u < move ? ease(u / move) : 1)) * Math.PI / 2, 0]
    }
    case 3: return [t, 0.3 * Math.sin(t * 0.6)]
    case 4: return [t * 0.9, 0.35 * Math.sin(t * 0.5)]
    default: return [t * 0.8, 0.25 + 0.15 * Math.sin(t * 0.7)]
    }
}

const slices = (ry: number, rx: number, dark: boolean): Shape[] => {
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
                style: `fill:${COLOR};fill-opacity:${((0.04 + 0.1 * k) * (dark ? 1 : 1.6)).toFixed(3)};stroke:${COLOR};stroke-opacity:${ink(0.3 + 0.7 * k, dark).toFixed(3)};stroke-width:.6;stroke-linejoin:round`,
            }
        })
}

const solid = (ry: number, rx: number, wire: boolean, dark: boolean): Shape[] => FACES
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
                ? `fill:${COLOR};fill-opacity:${(f.cap ? 0.12 : 0.05) * (dark ? 1 : 1.5)};stroke:${COLOR};stroke-width:.8;stroke-linejoin:round`
                : `fill:none;stroke:${COLOR};stroke-opacity:${ink(0.25, dark).toFixed(3)};stroke-width:.5;stroke-dasharray:1.5 1.5`,
        }
        return { d: f.d, style: `fill:${COLOR};stroke:${COLOR};stroke-width:.3;stroke-linejoin:round` }
    })

interface Particle { home: V3, offset: V3, spin: number }
let cloud: Particle[] | undefined
const getCloud = (): Particle[] => cloud ??= (() => {
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

const particles = (t: number, ry: number, rx: number, dark: boolean): Shape[] => {
    const b = burst(t), limit = VIEW / 2 - 0.6
    return getCloud().map(({ home, offset, spin }) => {
        const r = rotate([home[0] + offset[0] * b, home[1] + offset[1] * b, home[2] + offset[2] * b], ry + b * (1 + spin) * 0.42, rx)
        const p = project(r)
        const d = Math.hypot(p[0], p[1])
        if (d > limit) { p[0] *= limit / d; p[1] *= limit / d }
        return [p[0], p[1], p[2], r[2]] as const
    }).sort((a, c) => a[3] - c[3]).map(([x, y, s, z]) => ({
        d: circle(x, y, Math.max(0.15, (dark ? 0.32 : 0.38) * s)),
        style: `fill:${COLOR};fill-opacity:${ink(Math.max(0.15, Math.min(1, 0.25 + (z + 20) / 40 * 0.75)), dark).toFixed(3)}`,
    }))
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

const ascii = (ry: number, rx: number, dark: boolean): Glyphs => {
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
    const glyphs: Glyph[] = []
    for (let i = 0; i < cols * rows; i++) {
        if (zBuffer[i]! < -1e8) continue
        const l = Math.max(0, lBuffer[i]!)
        glyphs.push({
            x: (i % cols) * cw - VIEW / 2,
            y: Math.floor(i / cols) * rh - VIEW / 2,
            char: chars[Math.min(chars.length - 1, 1 + Math.floor(l * (chars.length - 1)))]!,
            opacity: ink(0.45 + 0.55 * l, dark),
        })
    }
    return { glyphs, size: rh * 1.2, weight: dark ? 500 : 700 }
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

const current = (t: number, ry: number, rx: number, dark: boolean): Shape[] => {
    const at = (p: V3): V3 => project(rotate(p, ry, rx))
    const shapes: Shape[] = [{
        d: EDGES.map(([a, b]) => segment(at(a), at(b))).join(''),
        style: `fill:none;stroke:${COLOR};stroke-opacity:${ink(0.45, dark).toFixed(3)};stroke-width:.4;stroke-linecap:round`,
    }]
    const pulses: [V3[], number][] = [[LOOP_FRONT, t * 0.12], [LOOP_FRONT, t * 0.12 + 0.5], [LOOP_BACK, t * 0.12 + 0.25], [LOOP_BACK, t * 0.12 + 0.75]]
    for (const [loop, u] of pulses) {
        const tail = 24
        for (let j = 0; j < tail; j++) shapes.push({
            d: segment(at(along(loop, u - j * 0.0035)), at(along(loop, u - (j + 1) * 0.0035))),
            style: `fill:none;stroke:${COLOR};stroke-opacity:${(1 - j / tail).toFixed(3)};stroke-width:${(0.65 * (1 - j / tail) + 0.12).toFixed(3)};stroke-linecap:round`,
        })
        const head = at(along(loop, u))
        shapes.push({ d: circle(head[0], head[1], 0.8), style: `fill:${COLOR}` })
    }
    const vt = (t * 1.3) % 1, shift = Math.floor(t * 1.3) * 5
    for (let i = 0; i < N; i += 3) {
        const a = OUTLINE[(i + shift) % N]!, p = at([a[0], a[1], HALF_DEPTH - 2 * HALF_DEPTH * vt])
        shapes.push({ d: circle(p[0], p[1], 0.5), style: `fill:${COLOR};fill-opacity:${Math.sin(vt * Math.PI).toFixed(3)}` })
    }
    return shapes
}

export const logo = { size: SIZE, view: VIEW, pose, slices, solid, particles, ascii, current }
