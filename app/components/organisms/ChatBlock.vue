<script setup lang="ts">
    // Интерактивные блоки, которыми ассистент отвечает вместо длинного текста.
    // Пока инструмент работает — скелетон, затем контент плавно проявляется (элементы — со ступенчатой задержкой).
    const props = defineProps<{ name: string, output?: any, loading?: boolean }>()
    const { t, locale } = useI18n()
    const theme = useColorMode()

    // имя инструмента может прийти с префиксом MCP-сервера (cv_show_experience)
    const kind = computed(() => props.name.replace(/^.*?(?=show_|submit_request|update_request)/, ''))
    const blockType = computed(() => ({ show_experience: 'experience', show_projects: 'projects', show_skills: 'skills', show_contacts: 'contacts' } as Record<string, string>)[kind.value])
    const isRequest = computed(() => kind.value === 'submit_request' || kind.value === 'update_request')

    // результат инструмента: объект, JSON-строка или MCP-обёртка { content: [{ text }] }
    const parse = (value: any): any => {
        if (typeof value === 'string') { try { return parse(JSON.parse(value)) } catch { return undefined } }
        if (Array.isArray(value)) return parse(value.find((part: any) => part?.type === 'text')?.text)
        if (value?.structuredContent) return value.structuredContent
        if (Array.isArray(value?.content)) return parse(value.content.find((part: any) => part?.type === 'text')?.text)
        return value
    }
    const result = computed(() => parse(props.output))

    // содержимое блоков (опыт, проекты…) забираем отдельным запросом: модель видит только id, а не весь контент
    const data = ref<any>(null)
    const failed = ref(false)
    watch(() => [result.value, props.loading] as const, async ([value, loading]) => {
        if (!blockType.value || loading || !value) return
        if (value.items || value.groups) { data.value = value; return }
        try {
            data.value = await $fetch('/api/assistant/block', {
                query: { type: blockType.value, locale: value.locale || locale.value, ids: value.ids?.join(','), tag: value.tag, company: value.company }
            })
        } catch { failed.value = true }
    }, { immediate: true })

    // цвета логотипов подсвечивают сетку плитки при наведении — как на главной
    const logoColors = ref<Record<string, string | null>>({})
    watch(data, async (value) => {
        if (kind.value !== 'show_projects') return
        const sources = [...new Set((value?.items || []).flatMap((item: any) => [item.logo?.dark, item.logo?.light]).filter(Boolean))] as string[]
        const entries = await Promise.all(sources.map(async src => [src, (await $fetch<{ color: string | null }>('/api/logo-color', { query: { src } }).catch(() => ({ color: null }))).color] as const))
        logoColors.value = Object.fromEntries(entries)
    })
    // проект открываем в новой вкладке, чтобы не потерять диалог
    const openProject = (id: string) => window.open(`/${locale.value}/projects/${id}`, '_blank')

    const ready = computed(() => isRequest.value ? !props.loading && !!result.value : !!data.value)
    const hidden = computed(() => failed.value || (!props.loading && isRequest.value && result.value?.error && result.value.error !== 'already_exists'))

    const image = (value?: string | { dark?: string, light?: string }) => typeof value === 'string' ? value : value?.[theme.value as 'dark' | 'light'] || value?.dark
    const date = (value?: string) => value ? value.slice(0, 7) : t('ai.blocks.now')

    const linkIcon = (link: { to: string }) => {
        const to = link.to || ''
        if (to.startsWith('mailto:')) return 'mingcute:mail-line'
        if (to.startsWith('tel:')) return 'mingcute:phone-line'
        if (/t\.me|telegram/.test(to)) return 'mingcute:telegram-line'
        if (/github/.test(to)) return 'mingcute:github-line'
        if (/linkedin/.test(to)) return 'mingcute:linkedin-line'
        return 'mingcute:link-line'
    }

    const requestRows = computed(() => (['name', 'email', 'phone', 'telegram', 'message'] as const)
        .map(key => ({ key, value: result.value?.fields?.[key] as string | undefined })))
</script>

<template>
    <Transition name="block" mode="out-in" appear>
        <!-- скелетон -->
        <div v-if="!ready && !hidden" key="skeleton" class="border" aria-hidden="true">
            <template v-if="kind === 'show_experience' || kind === 'show_projects'">
                <div v-for="row in 2" :key="row" class="flex flex-col gap-2 p-3" :class="row > 1 && 'border-t'">
                    <span class="sk h-4 w-28"/>
                    <span class="sk h-3 w-2/3"/>
                    <span class="flex gap-1"><span class="sk h-5 w-10"/><span class="sk h-5 w-12"/><span class="sk h-5 w-9"/></span>
                </div>
            </template>
            <template v-else-if="kind === 'show_skills'">
                <div v-for="row in 3" :key="row" class="flex flex-col gap-2 p-3" :class="row > 1 && 'border-t'">
                    <span class="sk h-3 w-16"/>
                    <span class="flex gap-1"><span class="sk h-5 w-10"/><span class="sk h-5 w-14"/><span class="sk h-5 w-9"/><span class="sk h-5 w-12"/></span>
                </div>
            </template>
            <div v-else-if="kind === 'show_contacts'" class="flex gap-2 p-3"><span class="sk h-8 w-24"/><span class="sk h-8 w-24"/><span class="sk h-8 w-24"/></div>
            <div v-else class="flex flex-col gap-2 p-3"><span class="sk h-4 w-40"/><span class="sk h-3 w-3/4"/><span class="sk h-3 w-1/2"/></div>
        </div>

        <!-- опыт -->
        <div v-else-if="kind === 'show_experience' && data" key="experience" class="flex flex-col border">
            <article v-for="(item, index) in data.items" :key="item.id" class="item flex flex-col gap-3 p-3" :class="index > 0 && 'border-t'" :style="{ '--i': index }">
                <NuxtLink v-if="item.link" :to="item.link" target="_blank" class="flex h-6 w-fit items-center no-underline!">
                    <img v-if="image(item.logo)" :src="image(item.logo)" :alt="item.name" class="h-5 w-auto max-w-32 object-contain"/>
                    <span v-else class="text-sm font-bold">{{ item.name }}</span>
                </NuxtLink>
                <span v-else class="text-sm font-bold">{{ item.name }}</span>
                <div v-for="(position, i) in item.positions" :key="i" class="flex flex-col gap-1.5">
                    <div class="flex items-baseline justify-between gap-4 text-xs leading-5">
                        <span class="min-w-0 text-default">{{ position.name }}</span>
                        <span class="shrink-0 tabular-nums text-dimmed">{{ date(position.from) }} — {{ date(position.to) }}</span>
                    </div>
                    <div v-if="position.skills?.length" class="flex flex-wrap gap-1">
                        <NuxtBadge v-for="skill in position.skills" :key="skill" :label="skill" size="sm" color="neutral" variant="outline" class="rounded-none"/>
                    </div>
                </div>
            </article>
        </div>

        <!-- проекты: та же бенто-сетка плиток, что на главной -->
        <MoleculesProjectsGrid v-else-if="kind === 'show_projects' && data" key="projects" :projects="data.items" :logo-colors="logoColors" animate @open="openProject"/>

        <!-- стек -->
        <div v-else-if="kind === 'show_skills' && data" key="skills" class="flex flex-col border">
            <div v-for="(group, index) in data.groups" :key="group.type" class="item flex flex-col gap-2 p-3" :class="index > 0 && 'border-t'" :style="{ '--i': index }">
                <span class="text-xs leading-4 text-dimmed">{{ group.type }}</span>
                <div class="flex flex-wrap gap-1">
                    <NuxtBadge v-for="skill in group.items" :key="skill" :label="skill" size="sm" color="neutral" variant="outline" class="rounded-none"/>
                </div>
            </div>
        </div>

        <!-- прямые контакты -->
        <div v-else-if="kind === 'show_contacts' && data" key="contacts" class="flex flex-wrap gap-2">
            <NuxtButton
                v-for="(link, index) in data.items" :key="link.to" :to="link.to" target="_blank" :icon="linkIcon(link)"
                variant="outline" color="neutral" size="sm" class="item rounded-none" :style="{ '--i': index }"
            >{{ link.label }}</NuxtButton>
        </div>

        <!-- заявка -->
        <div v-else-if="isRequest && result?.fields" key="request" class="border">
            <div class="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs leading-5">
                <span class="flex items-center gap-2 font-bold"><NuxtIcon name="mingcute:check-circle-line" class="size-4 text-success"/>{{ t('ai.blocks.request') }}</span>
                <span class="text-dimmed">{{ result.created ? t('ai.blocks.request_saved') : t('ai.blocks.request_updated') }}</span>
            </div>
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 p-3 text-xs leading-5">
                <template v-for="(row, index) in requestRows" :key="row.key">
                    <dt class="item text-dimmed" :style="{ '--i': index }">{{ t(`ai.blocks.${row.key}`) }}</dt>
                    <dd class="item min-w-0 break-words" :class="row.value ? 'text-default' : 'text-dimmed'" :style="{ '--i': index }">{{ row.value || '—' }}</dd>
                </template>
            </dl>
        </div>
    </Transition>
</template>

<style scoped>
    .sk { display: block; background: var(--ui-bg-elevated); animation: sk-pulse 1.2s ease-in-out infinite; }
    @keyframes sk-pulse { 50% { opacity: .45; } }

    .block-enter-active { animation: block-fade .3s ease-out both; }
    .block-leave-active { transition: opacity .15s ease-in; }
    .block-leave-to { opacity: 0; }
    @keyframes block-fade { from { opacity: 0; } }

    .item { animation: block-in .45s cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(var(--i, 0) * 70ms); }
    @keyframes block-in { from { opacity: 0; transform: translateY(8px); } }

    @media (prefers-reduced-motion: reduce) {
        .block-enter-active, .item, .sk { animation: none; }
    }
</style>
