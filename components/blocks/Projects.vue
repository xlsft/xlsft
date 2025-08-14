<script setup lang="ts">
    import { useDragger } from '@xlsft/nuxt';
    import ProjectCard from '../global/ProjectCard.vue';

    const dragger = useDragger({ drag: true, scroll: true, direction: 'x' })
    const container = ref<HTMLElement>()
    onMounted(() => { dragger.init(container.value) })
    onUnmounted(() => dragger.destroy())
    const { t } = useI18n()
    const items = computed<{ id: string, link: string, tags: string[] }[]>(() => [
        { id: 'worker', link: 'https://github.com/xlsft/worker', tags: ['xlsft', 'oss'] },
        { id: 'ained_widget', link: '/demo/ained_widget', tags: ['ained'] },
        { id: 'ained_developer', link: 'https://developer.ained.ru/', tags: ['ained'] },
        { id: 'briskly_business', link: 'https://briskly.business', tags: ['briskly'] },
        { id: 'pixelbattle', link: '/pixelbattle', tags: ['xlsft', 'oss', 'fun'] },
        { id: 'ained_b24', link: 'https://www.bitrix24.ru/apps/app/ained.ained_chess', tags: ['ained'] },
        { id: 'work_russia', link: 'https://guide.cznnew.ru/', tags: ['xlsft'] },
        { id: 'xlsft_nuxt', link: 'https://jsr.io/@xlsft/nuxt', tags: ['xlsft', 'oss', 'lib'] },
        { id: 'ained_widget_bot', link: 'https://t.me/ained_widget_bot', tags: ['ained'] },
        { id: 'smartshell_sdk', link: 'https://smartshell.xlsft.ru', tags: ['lib', 'oss'] },
        { id: 'xlkbd', link: 'https://github.com/xlsft/xlkbd', tags: ['oss'] },
        { id: 'htsx', link: 'https://github.com/xlsft/htsx', tags: ['oss', 'lib'] },
        { id: 'xlui', link: 'https://github.com/xlsft/ui', tags: ['oss'] },
        { id: 'gizmo_parser', link: 'https://github.com/xlsft/gizmo-parser', tags: ['oss'] },
        { id: 'yasearch', link: 'https://addons.mozilla.org/ru/firefox/addon/yasearch/', tags: ['oss','popular'] },
        { id: 'cyber_bot', link: 'https://github.com/xlsft/cyber-bot', tags: ['oss', 'tg', 'fun'] },
    ])

    const counts = computed(() => {
        const map: Record<string, number> = {}
        for (const item of items.value) for (const tag of item.tags) map[tag] = (map[tag] || 0) + 1
        return map
    })
    const filters = ref<string[]>([])
    const tags = computed(() => Array.from(new Set(items.value.flatMap(v => v.tags))).sort((a, b) => (counts.value[b] ?? 0) - (counts.value[a] ?? 0)))
    const filtered = computed(() => filters.value.length === 0 ? items.value : items.value.filter(item => filters.value.every(tag => item.tags.includes(tag))))
</script>

<template>
    <SectionHeader id="projects" class="print:hidden" style="background-image: url('/patterns/lines-in-motion.svg');" hover-style="background-image: url('/patterns/lines-in-motion-hover.svg');"/>
    <section class="print:hidden p-0! px-[24px]! sm:px-[48px]! py-[24px]! flex gap-[12px] sm:gap-[48px] items-center justify-between flex-col sm:flex-row">
        <span class="text-xl! opacity-50 hidden sm:flex">tags:</span>
        <div class="flex flex-wrap gap-[12px] justify-center items-center sm:justify-end">
            <span class="text-xl! opacity-50 flex sm:hidden">tags:</span>
            <button mini black v-for="tag in tags" @click="filters.includes(tag) ? filters.splice(filters.findIndex(v => v === tag), 1) : filters.push(tag)" :class="filters.includes(tag) ? 'border-accent! hover:border-accent!' : ''">{{ tag }} <span class="text-xs! opacity-50 ml-[8px] mt-[2px]">{{ counts[tag] }}</span></button>
        </div>
    </section>
    <section class="print:hidden flex gap-[12px] p-0! overflow-x-auto min-h-[400px] duration-0 transition-colors!" ref="container">
        <template v-if="filtered.length > 0">
            <ProjectCard v-for="item in filtered" v-bind="item" :key="item.id"/>
        </template>
        <div v-else class="w-full h-[400px] text-center flex items-center justify-center opacity-50 text-2xl!">{{ t('no_items') }}</div>
    </section>
</template>