<script setup lang="ts">
    // Бенто-сетка плиток проектов: одна и та же на главной и в блоке проектов в чате ассистента.
    type Project = { id: string, name: string, description?: string, tags?: string[], bg?: string, logo?: { dark?: string | null, light?: string | null } | null, images?: string[] }
    const props = defineProps<{ projects: Project[], logoColors?: Record<string, string | null> | null, animate?: boolean }>()
    const emit = defineEmits<{ open: [id: string] }>()

    // бенто-мозаика на lg собирается упаковщиком, а не повторяющимся шаблоном: каждая следующая плитка
    // ставится в самую низкую (левую) колонку, форма выбирается случайно с весами, и перебор с откатом
    // гарантирует, что сетка закрывается ровным прямоугольником без дыр. Генератор детерминирован
    // (сид — из id проектов), поэтому SSR и клиент получают одну и ту же раскладку
    type Tile = { col: number, row: number, w: number, h: number }
    const SHAPES = [
        { w: 1, h: 4, weight: 3 },
        { w: 1, h: 3, weight: 4 },
        { w: 2, h: 2, weight: 3 },
        { w: 1, h: 2, weight: 1.5 },
        { w: 2, h: 3, weight: 1 },
        { w: 3, h: 2, weight: 0.3 }
    ]
    const COLS = 3
    const seeded = (seed: number) => () => {
        seed = (seed + 0x6D2B79F5) | 0
        let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296
    }
    const hash = (text: string) => [...text].reduce((acc, char) => (Math.imul(acc, 31) + char.charCodeAt(0)) | 0, 7)

    const packTiles = (count: number, seed: number): Tile[] => {
        const rand = seeded(seed)
        const heights = Array<number>(COLS).fill(0)
        const tiles: Tile[] = []
        let budget = 20000
        const place = (left: number): boolean => {
            if (!left) return heights.every(h => h === heights[0])
            if (--budget < 0) return false
            const row = Math.min(...heights)
            const col = heights.indexOf(row)
            let flat = 1
            while (col + flat < COLS && heights[col + flat] === row) flat++
            const prev = tiles.at(-1)
            // взвешенный случайный порядок (ключ u^(1/w)); повтор формы соседа штрафуется
            const options = SHAPES
                .filter(shape => shape.w <= flat)
                .map(shape => {
                    const weight = shape.weight * (prev && prev.w === shape.w && prev.h === shape.h ? 0.25 : 1)
                    return { shape, key: rand() ** (1 / weight) }
                })
                .sort((a, b) => b.key - a.key)
            for (const { shape } of options) {
                tiles.push({ col: col + 1, row: row + 1, w: shape.w, h: shape.h })
                for (let i = col; i < col + shape.w; i++) heights[i]! += shape.h
                // слишком рваный край потом не закрыть красиво
                if (Math.max(...heights) - Math.min(...heights) <= 4 && place(left - 1)) return true
                for (let i = col; i < col + shape.w; i++) heights[i]! -= shape.h
                tiles.pop()
            }
            return false
        }
        if (place(count)) return tiles
        // запасной вариант: ровные ряды 1×2, остаток добивается широкими плитками
        return Array.from({ length: count }, (_, index) => {
            const row = Math.floor(index / COLS) * 2 + 1
            const rest = count % COLS
            if (rest && index >= count - rest) {
                const w = rest === 1 ? 3 : index === count - 1 ? 2 : 1
                return { col: rest === 2 && index === count - 1 ? 2 : 1, row, w, h: 2 }
            }
            return { col: (index % COLS) + 1, row, w: 1, h: 2 }
        })
    }

    const tiles = computed(() => packTiles(
        props.projects.length,
        hash(props.projects.map(project => project.id).join())
    ))
    const tileStyle = (index: number) => {
        const tile = tiles.value[index]
        return tile && {
            '--tile-col': `${tile.col} / span ${tile.w}`,
            '--tile-row': `${tile.row} / span ${tile.h}`
        }
    }
    // на sm (2 колонки) во всю ширину идут только самые крупные плитки
    const tileClass = (index: number) => {
        const tile = tiles.value[index]
        return tile && (tile.h >= 4 || tile.w === 3) ? 'sm:col-span-2' : ''
    }

</script>

<template>
    <!-- без отступов: карточки стыкуются в одну сетку, общий 1px-бордер даёт outline каждой карточки поверх gap-px -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:grid-flow-dense lg:auto-rows-[8rem] gap-px">
        <MoleculesProjectItem
            v-for="(project, index) in projects"
            :key="project.id"
            :project
            :logo-colors
            :class="['lg:[grid-column:var(--tile-col)] lg:[grid-row:var(--tile-row)]', tileClass(index), animate && 'tile-in']"
            :style="{ ...tileStyle(index), '--i': index }"
            @open="emit('open', $event)"
        />
    </div>
</template>

<style scoped>
    .tile-in { animation: tile-in .45s cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(var(--i, 0) * 70ms); }
    @keyframes tile-in { from { opacity: 0; transform: translateY(8px); } }
    @media (prefers-reduced-motion: reduce) { .tile-in { animation: none; } }
</style>
