<script setup lang="ts">
    const props = defineProps<{
        images: string[]
        name: string
        id?: string
        bg?: string
    }>()

    const { t } = useI18n()

    const fan = [
        'z-30',
        'z-20 group-hover/tile:-rotate-6 group-hover/tile:-translate-x-3 group-hover/tile:translate-y-0.5 group-focus-visible/deck:-rotate-6 group-focus-visible/deck:-translate-x-3',
        'z-10 group-hover/tile:-rotate-12 group-hover/tile:-translate-x-6 group-hover/tile:translate-y-2 group-focus-visible/deck:-rotate-12 group-focus-visible/deck:-translate-x-6',
    ]

    const state = ref<{ open?: boolean, index: number }>({ index: 0 })

    function open(): void {
        state.value = { open: true, index: 0 }
    }

</script>

<template>
    <div
        class="absolute top-4 right-4 z-20 tuck transition-transform duration-300 ease-out group-hover/tile:translate-none has-focus-visible:translate-none"
    >
        <NuxtTooltip
            :text="t('labels.view_screenshots', { count: props.images.length })"
            :content="{ side: 'left', hideWhenDetached: true }"
            :disabled="state.open"
            ignore-non-keyboard-focus
        >
            <button
                type="button"
                :aria-label="`${t('labels.view_screenshots', { count: props.images.length })} — ${props.name}`"
                class="group/deck relative block h-11 w-16 cursor-zoom-in! *:cursor-zoom-in!"
                @click.stop="open"
                @keydown.enter.stop
            >
                <span
                    v-for="(src, index) in props.images.slice(0, 3)"
                    :key="src"
                    :class="[
                        'absolute inset-0 origin-bottom-right overflow-hidden border border-default bg-default transition-transform duration-300 ease-out group-hover/tile:delay-150',
                        fan[index]
                    ]"
                    :style="{ background: props.bg }"
                >
                    <NuxtImg :src="src" preset="deck" alt="" loading="lazy" class="size-full object-cover"/>
                </span>
            </button>
        </NuxtTooltip>

        <Gallery :id="props.id" v-model:open="state.open" v-model:index="state.index" :images="props.images" :label="props.name"/>
    </div>
</template>
