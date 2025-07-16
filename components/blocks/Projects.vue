<script setup lang="ts">
    import ProjectCard from '../global/ProjectCard.vue';
    import { useDragger } from "@xlsft/nuxt"

    const dragger = useDragger({ drag: true, scroll: true, direction: 'x' })
    const container = ref<HTMLElement>()
    onMounted(() => { dragger.init(container.value) })
    onUnmounted(() => dragger.destroy())
    const { t } = useI18n()
    const items = computed<{ id: string, name: string, description: string, link: string, tags: string[] }[]>(() => [
        { id: 'ained_widget', name: t('project.ained_widget.name'), description: t('project.ained_widget.description'), link: '/demo/ained_widget', tags: ['ained'] },
        { id: 'ained_developer', name: t('project.ained_developer.name'), description: t('project.ained_developer.description'), link: 'https://developer.ained.ru/', tags: ['ained'] },
        { id: 'briskly_business', name: t('project.briskly_business.name'), description: t('project.briskly_business.description'), link: 'https://briskly.business', tags: ['briskly'] },
        { id: 'ained_b24', name: t('project.ained_b24.name'), description: t('project.ained_b24.description'), link: 'https://www.bitrix24.ru/apps/app/ained.ained_chess', tags: ['ained'] },
        { id: 'work_russia', name: t('project.work_russia.name'), description: t('project.work_russia.description'), link: 'https://guide.cznnew.ru/', tags: ['xlsft'] },
        { id: 'xlsft_nuxt', name: t('project.xlsft_nuxt.name'), description: t('project.xlsft_nuxt.description'), link: 'https://jsr.io/@xlsft/nuxt', tags: ['xlsft', 'oss', 'lib'] },
        { id: 'ained_widget_bot', name: t('project.ained_widget_bot.name'), description: t('project.ained_widget_bot.description'), link: 'https://t.me/ained_widget_bot', tags: ['ained'] },
        { id: 'smartshell_sdk', name: t('project.smartshell_sdk.name'), description: t('project.smartshell_sdk.description'), link: 'https://smartshell.xlsft.ru', tags: ['lib', 'oss'] },
        { id: 'xlkbd', name: t('project.xlkbd.name'), description: t('project.xlkbd.description'), link: 'https://github.com/xlsft/xlkbd', tags: ['oss'] },
        { id: 'htsx', name: t('project.htsx.name'), description: t('project.htsx.description'), link: 'https://github.com/xlsft/htsx', tags: ['oss', 'lib'] },
        { id: 'xlui', name: t('project.xlui.name'), description: t('project.xlui.description'), link: 'https://github.com/xlsft/ui', tags: ['oss'] },
        { id: 'gizmo_parser', name: t('project.gizmo_parser.name'), description: t('project.gizmo_parser.description'), link: 'https://github.com/xlsft/gizmo-parser', tags: ['oss'] },
        { id: 'yasearch', name: t('project.yasearch.name'), description: t('project.yasearch.description'), link: 'https://addons.mozilla.org/ru/firefox/addon/yasearch/', tags: ['oss','popular'] },
        { id: 'cyber_bot', name: t('project.cyber_bot.name'), description: t('project.cyber_bot.description'), link: 'https://github.com/xlsft/cyber-bot', tags: ['oss','tg'] },
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
    <SectionHeader id="projects" style="background-image: url('/patterns/lines-in-motion.svg');" hover-style="background-image: url('/patterns/lines-in-motion-hover.svg');"/>
    <section class="p-0! px-[24px]! sm:px-[48px]! py-[24px]! flex gap-[12px] sm:gap-[48px] items-center justify-between flex-col sm:flex-row">
        <span class="text-xl! opacity-50 hidden sm:flex">tags:</span>
        <div class="flex flex-wrap gap-[12px] justify-center items-center sm:justify-end">
            <span class="text-xl! opacity-50 flex sm:hidden">tags:</span>
            <button mini black v-for="tag in tags" @click="filters.includes(tag) ? filters.splice(filters.findIndex(v => v === tag), 1) : filters.push(tag)" :class="filters.includes(tag) ? 'border-accent! hover:border-accent!' : ''">{{ tag }} <span class="text-xs! opacity-50 ml-[8px] mt-[2px]">{{ counts[tag] }}</span></button>
        </div>
    </section>
    <section class="flex gap-[12px] p-0! overflow-x-auto min-h-[400px] duration-0 transition-colors!" ref="container">
        <template v-if="filtered.length > 0">
            <ProjectCard v-for="item in filtered" v-bind="item" :key="item.id"/>
        </template>
        <div v-else class="w-full h-[400px] text-center flex items-center justify-center opacity-50 text-2xl!">{{ t('no_items') }}</div>
    </section>
    
</template>