<script setup lang="ts">
    const props = defineProps<{ images: string[], name: string, bg?: string }>()
    const { t } = useI18n()

    const open = ref(false)
    const current = ref(0)

    // в колоде максимум 3 карты; при наведении на плитку колода выезжает из-за угла и раскрывается узким веером
    const deck = computed(() => props.images.slice(0, 3))
    const fan = [
        'z-30',
        'z-20 group-hover/tile:-rotate-6 group-hover/tile:-translate-x-3 group-hover/tile:translate-y-0.5 group-focus-visible/deck:-rotate-6 group-focus-visible/deck:-translate-x-3',
        'z-10 group-hover/tile:-rotate-12 group-hover/tile:-translate-x-6 group-hover/tile:translate-y-2 group-focus-visible/deck:-rotate-12 group-focus-visible/deck:-translate-x-6'
    ]

</script>

<template>
    <!-- в покое колода целиком за верхним правым углом плитки (её обрезает overflow-clip), при наведении выезжает -->
    <div
        class="absolute top-4 right-4 z-20 translate-x-[calc(100%+2rem)] -translate-y-[calc(100%+2rem)] transition-transform duration-300 ease-out group-hover/tile:translate-x-0 group-hover/tile:translate-y-0 has-focus-visible:translate-x-0 has-focus-visible:translate-y-0"
    >
        <NuxtTooltip
            :text="t('labels.view_screenshots', { count: images.length })"
            :content="{ side: 'left', hideWhenDetached: true }"
            :disabled="open"
            ignore-non-keyboard-focus
        >
            <button
                type="button"
                :aria-label="`${t('labels.view_screenshots', { count: images.length })} — ${name}`"
                class="group/deck relative block h-11 w-16 cursor-zoom-in! *:cursor-zoom-in!"
                @click.stop="current = 0; open = true"
                @keydown.enter.stop
            >
                <span
                    v-for="(src, index) in deck"
                    :key="src"
                    :class="[
                        'absolute inset-0 origin-bottom-right overflow-hidden border border-default bg-default transition-transform duration-300 ease-out group-hover/tile:delay-150',
                        fan[index]
                    ]"
                    :style="{ background: bg }"
                >
                    <img :src="src" alt="" loading="lazy" class="size-full object-cover">
                </span>
            </button>
        </NuxtTooltip>

        <MoleculesImageViewer v-model:open="open" v-model:index="current" :images :label="name"/>
    </div>
</template>
