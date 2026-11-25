<script setup lang="ts">
    interface Cell { col: number, row: number, w: number, h: number }

    const props = defineProps<{
        projects: Tile[]
        colors?: Record<string, string | undefined>
        animate?: boolean
    }>()
    const emit = defineEmits<{ open: [id: string] }>()

    const COLS = 3
    const SHAPES = [
        { w: 1, h: 4, weight: 3 },
        { w: 1, h: 3, weight: 4 },
        { w: 2, h: 2, weight: 3 },
        { w: 1, h: 2, weight: 1.5 },
        { w: 2, h: 3, weight: 1 },
        { w: 3, h: 2, weight: 0.3 },
    ]

    const methods = {
        random(seed: number): () => number {
            return () => {
                seed = (seed + 0x6D2B79F5) | 0
                let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
                x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
                return ((x ^ (x >>> 14)) >>> 0) / 4294967296
            }
        },
        hash: (text: string): number => [...text].reduce((acc, char) => (Math.imul(acc, 31) + char.charCodeAt(0)) | 0, 7),
        pack(count: number, seed: number): Cell[] {
            const random = methods.random(seed)
            const heights = Array<number>(COLS).fill(0)
            const cells: Cell[] = []
            let budget = 20000
            const place = (left: number): boolean => {
                if (!left) return heights.every((height) => height === heights[0])
                if (--budget < 0) return false
                const row = Math.min(...heights)
                const col = heights.indexOf(row)
                let flat = 1
                while (col + flat < COLS && heights[col + flat] === row) flat++
                const prev = cells.at(-1)

                const options = SHAPES
                    .filter((shape) => shape.w <= flat)
                    .map((shape) => ({ shape, key: random() ** (1 / (shape.weight * (prev?.w === shape.w && prev.h === shape.h ? 0.25 : 1))) }))
                    .sort((a, b) => b.key - a.key)
                for (const { shape } of options) {
                    cells.push({ col: col + 1, row: row + 1, w: shape.w, h: shape.h })
                    for (let i = col; i < col + shape.w; i++) heights[i]! += shape.h

                    if (Math.max(...heights) - Math.min(...heights) <= 4 && place(left - 1)) return true
                    for (let i = col; i < col + shape.w; i++) heights[i]! -= shape.h
                    cells.pop()
                }
                return false
            }
            if (place(count)) return cells

            return Array.from({ length: count }, (_, index) => {
                const row = Math.floor(index / COLS) * 2 + 1
                const rest = count % COLS
                if (rest && index >= count - rest) return { col: rest === 2 && index === count - 1 ? 2 : 1, row, w: rest === 1 ? 3 : index === count - 1 ? 2 : 1, h: 2 }
                return { col: (index % COLS) + 1, row, w: 1, h: 2 }
            })
        },
        style(index: number): Record<string, string | number> {
            const cell = cells.value[index]
            return { '--i': index, ...cell && { '--tile-col': `${cell.col} / span ${cell.w}`, '--tile-row': `${cell.row} / span ${cell.h}` } }
        },
        span(index: number): string | undefined {
            const cell = cells.value[index]
            return cell && (cell.h >= 4 || cell.w === 3) ? 'sm:col-span-2' : undefined
        },
    }

    const cells = computed<Cell[]>(() => methods.pack(props.projects.length, methods.hash(props.projects.map((project) => project.id).join())))
</script>

<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:grid-flow-dense lg:auto-rows-32 gap-px">
        <ProjectsItem
            v-for="(project, index) in props.projects"
            :key="project.id"
            :project
            :colors="props.colors"
            :class="['lg:tile-place', methods.span(index), props.animate && 'animate-rise stagger motion-reduce:animate-none']"
            :style="methods.style(index)"
            @open="emit('open', $event)"
        />
    </div>
</template>

