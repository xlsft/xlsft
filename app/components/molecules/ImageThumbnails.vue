<script setup lang="ts">
    defineProps<{ images: string[], label: string }>()
    const index = defineModel<number>({ required: true })

    const pad = (value: number) => String(value).padStart(2, '0')
    const strip = useTemplateRef<HTMLElement>('strip')

    // активное превью всегда в зоне видимости: крутим только саму полосу, не страницу (scrollIntoView дёрнул бы и её)
    watch(index, value => nextTick(() => {
        const el = strip.value
        const item = el?.children[value] as HTMLElement | undefined
        if (!el || !item) return
        const left = item.offsetLeft - el.offsetLeft
        if (left < el.scrollLeft) el.scrollTo({ left, behavior: 'smooth' })
        else if (left + item.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollTo({ left: left + item.offsetWidth - el.clientWidth, behavior: 'smooth' })
    }))
</script>

<template>
    <div v-if="images.length > 1" ref="strip" class="flex max-w-full shrink-0 gap-2 overflow-x-auto p-px [scrollbar-width:none]">
        <button
            v-for="(src, i) in images"
            :key="i"
            type="button"
            :aria-label="`${label} · ${i + 1}`"
            :aria-pressed="index === i"
            class="group/thumb relative w-20 shrink-0 cursor-pointer overflow-hidden bg-default outline-1 -outline-offset-1 outline-(--ui-border) transition-[outline-color] hover:outline-(--ui-text-dimmed) focus-visible:outline-2 focus-visible:outline-(--ui-primary) aria-pressed:outline-2 aria-pressed:outline-(--ui-primary)"
            @click="index = i"
        >
            <img :src="src" alt="" loading="lazy" draggable="false" class="aspect-video w-full object-cover opacity-50 grayscale transition-all group-hover/thumb:opacity-100 group-hover/thumb:grayscale-0 group-aria-pressed/thumb:opacity-100 group-aria-pressed/thumb:grayscale-0">
            <!-- индекс с нуля; ярлык лежит поверх обводки превью, поэтому рамка у него со всех сторон:
                 сверху и справа отделяет от картинки, снизу и слева продолжает обводку плитки -->
            <span aria-hidden="true" class="absolute bottom-0 left-0 border border-(--ui-border) bg-default px-1 text-[10px] leading-4 tabular-nums text-dimmed transition-colors group-aria-pressed/thumb:border-(--ui-primary) group-aria-pressed/thumb:bg-primary group-aria-pressed/thumb:text-inverted">{{ pad(i) }}</span>
        </button>
    </div>
</template>
