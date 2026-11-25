<script setup lang="ts">
    const props = defineProps<{
        images: string[]
        label: string
    }>()
    const index = defineModel<number>({ required: true })

    const strip = useTemplateRef<HTMLElement>('strip')

    const methods = {
        pad: (value: number): string => String(value).padStart(2, '0'),
        reveal(value: number): void {
            const element = strip.value
            const item = element?.children[value] as HTMLElement | undefined
            if (!element || !item) return
            const left = item.offsetLeft - element.offsetLeft
            if (left < element.scrollLeft) element.scrollTo({ left, behavior: 'smooth' })
            else if (left + item.offsetWidth > element.scrollLeft + element.clientWidth) element.scrollTo({ left: left + item.offsetWidth - element.clientWidth, behavior: 'smooth' })
        },
    }

    watch(index, (value) => nextTick(() => methods.reveal(value)))
</script>

<template>
    <div v-if="props.images.length > 1" ref="strip" class="flex max-w-full shrink-0 gap-2 overflow-x-auto p-px scrollbar-none">
        <button
            v-for="(src, i) in props.images"
            :key="i"
            type="button"
            :aria-label="`${props.label} · ${i + 1}`"
            :aria-pressed="index === i"
            class="group/thumb relative w-20 shrink-0 cursor-pointer overflow-hidden bg-default outline-1 -outline-offset-1 outline-default transition-colors hover:outline-dim focus-visible:outline-2 focus-visible:outline-primary aria-pressed:outline-2 aria-pressed:outline-primary"
            @click="index = i"
        >
            <CommonProgressive :src="src" :steps="[16, 160]" :aspect="16 / 9" alt="" draggable="false" class="aspect-video w-full object-cover opacity-50 grayscale transition-all group-hover/thumb:opacity-100 group-hover/thumb:grayscale-0 group-aria-pressed/thumb:opacity-100 group-aria-pressed/thumb:grayscale-0"/>
            <span aria-hidden="true" class="absolute bottom-0 left-0 border border-default bg-default px-1 text-2xs/4 tabular-nums text-dimmed transition-colors group-aria-pressed/thumb:border-primary group-aria-pressed/thumb:bg-primary group-aria-pressed/thumb:text-inverted">{{ methods.pad(i) }}</span>
        </button>
    </div>
</template>
