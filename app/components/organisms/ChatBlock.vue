<script setup lang="ts">
    // Интерактивные блоки, которыми ассистент отвечает вместо длинного текста.
    // Пока инструмент работает — скелетон, затем контент плавно проявляется (элементы — со ступенчатой задержкой).
    const props = defineProps<{ name: string, output?: any, loading?: boolean }>()
    const { t, locale } = useI18n()
    const theme = useColorMode()

    // имя инструмента может прийти с префиксом MCP-сервера (cv_show_experience)
    const kind = computed(() => props.name.replace(/^.*?(?=show_|submit_request|update_request|match_vacancy|web_search)/, ''))
    const blockType = computed(() => ({ show_experience: 'experience', show_projects: 'projects', show_skills: 'skills', show_contacts: 'contacts', show_project: 'project', show_repos: 'repos' } as Record<string, string>)[kind.value])
    const isMatch = computed(() => kind.value === 'match_vacancy')
    const isSources = computed(() => kind.value === 'web_search')
    const isRequest = computed(() => kind.value === 'submit_request' || kind.value === 'update_request')
    const isDownloads = computed(() => kind.value === 'show_downloads')

    // файлы резюме отдаёт сервер (/api/public/{locale}/cv.*), превью — первая страница того же docx в PNG
    const cvLocale = computed(() => result.value?.locale || locale.value)
    const downloads = computed(() => [
        { format: 'pdf', label: 'PDF', icon: 'mingcute:pdf-line' },
        { format: 'docx', label: 'DOCX', icon: 'mingcute:doc-line' },
        { format: 'md', label: 'MD', icon: 'mingcute:markdown-line' },
    ].map(item => ({ ...item, to: `/api/public/${cvLocale.value}/cv.${item.format}` })))
    const previewLoaded = ref(false)

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
                query: { type: blockType.value, locale: value.locale || locale.value, ids: (value.id ? [value.id] : value.ids)?.join(','), tag: value.tag, company: value.company }
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
    const openProject = (id: string) => { window.open(`/${locale.value}/projects/${id}`, '_blank') }
    const project = computed(() => kind.value === 'show_project' ? data.value?.items?.[0] : undefined)

    const ready = computed(() => isRequest.value || isDownloads.value || isMatch.value || isSources.value ? !props.loading && !!result.value : !!data.value)
    const hidden = computed(() => failed.value
        || (!props.loading && isRequest.value && result.value?.error && result.value.error !== 'already_exists')
        || (!props.loading && !isRequest.value && !!result.value?.error)
        || (!props.loading && isSources.value && !!result.value && !result.value.results?.length)
        || (!!data.value && !data.value.items?.length && !data.value.groups?.length))

    // сверка с вакансией: значок и цвет по статусу требования, ссылки ведут на проекты
    const matchIcon = (status: string) => ({ match: 'mingcute:check-line', partial: 'mingcute:minus-circle-line' } as Record<string, string>)[status] ?? 'mingcute:close-line'
    const matchColor = (status: string) => ({ match: 'text-success', partial: 'text-warning' } as Record<string, string>)[status] ?? 'text-dimmed'
    const refLabel = (ref: string) => ref.startsWith('project:') ? ref.slice(8) : null
    const domain = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } }
    const years = (value?: number) => value ? t('ai.blocks.years', { n: value }) : ''

    const image = (value?: string | { dark?: string, light?: string }) => typeof value === 'string' ? value : value?.[theme.value as 'dark' | 'light'] || value?.dark
    // «дек. 2025» / «Dec 2025»; без даты окончания — «сейчас»
    const date = (value?: string) => value
        ? new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(new Date(value))
        : t('ai.blocks.now')
    const companyRange = (positions: { from?: string, to?: string }[]) => `${date(positions.at(-1)?.from)} — ${date(positions[0]?.to)}`
    const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

    const linkIcon = (link: { to: string }) => {
        const to = link.to || ''
        if (to.startsWith('mailto:')) return 'mingcute:mail-line'
        if (to.startsWith('tel:')) return 'mingcute:phone-line'
        if (/t\.me|telegram/.test(to)) return 'mingcute:telegram-line'
        if (/github/.test(to)) return 'mingcute:github-line'
        if (/linkedin/.test(to)) return 'mingcute:linkedin-line'
        return 'mingcute:link-line'
    }

    // заявка: только заполненные контакты, кликабельные (почта, телефон, Telegram)
    // прямые контакты: название и адрес без протокола (у почты и телефона название и есть адрес — не дублируем)
    const contactValue = (link: { to: string }) => (link.to || '').replace(/^(mailto:|tel:|https?:\/\/(www\.)?)/, '').replace(/\/$/, '')
    const contactCards = computed(() => (data.value?.items || []).map((link: { label: string, to: string }) => {
        const value = contactValue(link)
        const digits = (text: string) => text.replace(/\D/g, '')
        const same = value === link.label || (link.to.startsWith('tel:') && digits(value) === digits(link.label))
        return { ...link, icon: linkIcon(link), value: same ? '' : value }
    }))

    const requestContacts = computed(() => {
        const fields = result.value?.fields || {}
        const phone = String(fields.phone || '')
        const telegram = String(fields.telegram || '').replace(/^@/, '')
        return [
            fields.name && { key: 'name', icon: 'mingcute:user-3-line', value: fields.name },
            fields.email && { key: 'email', icon: 'mingcute:mail-line', value: fields.email, to: `mailto:${fields.email}` },
            phone && { key: 'phone', icon: 'mingcute:phone-line', value: phone, to: `tel:${/^\d+$/.test(phone) ? `+${phone}` : phone.replace(/[^\d+]/g, '')}` },
            telegram && { key: 'telegram', icon: 'mingcute:telegram-line', value: `@${telegram}`, to: `https://t.me/${telegram}` },
        ].filter(Boolean) as { key: string, icon: string, value: string, to?: string }[]
    })
</script>

<template>
    <Transition name="block" mode="out-in" appear>
        <!-- скелетон -->
        <div v-if="!ready && !hidden" key="skeleton" class="border" aria-hidden="true">
            <template v-if="kind === 'show_experience' || kind === 'show_projects' || kind === 'show_repos' || kind === 'match_vacancy'">
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
            <div v-else-if="kind === 'show_contacts' || kind === 'show_downloads'" class="flex gap-2 p-3"><span class="sk h-8 w-24"/><span class="sk h-8 w-24"/><span class="sk h-8 w-24"/></div>
            <div v-else class="flex flex-col gap-2 p-3"><span class="sk h-4 w-40"/><span class="sk h-3 w-3/4"/><span class="sk h-3 w-1/2"/></div>
        </div>

        <!-- опыт: карточка на компанию, позиции строками с полосой слева (синяя — текущая), стек — как в experience.conf -->
        <div v-else-if="kind === 'show_experience' && data" key="experience" class="flex w-full flex-col gap-1.5">
            <article v-for="(item, index) in data.items" :key="item.id" class="item flex flex-col border" :style="{ '--i': index }">
                <header class="flex items-center justify-between gap-3 border-b px-3 py-2">
                    <component :is="item.link ? 'a' : 'span'" :href="item.link" target="_blank" class="flex min-w-0 items-center gap-3 no-underline!">
                        <img v-if="image(item.logo)" :src="image(item.logo)" :alt="item.name" class="h-5 w-auto max-w-32 shrink-0 object-contain">
                        <span v-else class="truncate text-xs font-bold text-default">{{ item.name }}</span>
                        <span v-if="item.link" class="truncate text-xs text-(--ui-text-comment) transition-colors hover:text-(--ui-primary)">{{ host(item.link) }}</span>
                    </component>
                    <span class="shrink-0 text-xs tabular-nums text-default">{{ companyRange(item.positions) }}</span>
                </header>
                <div class="flex flex-col gap-2.5 p-3">
                    <div v-for="(position, i) in item.positions" :key="i" class="flex flex-col gap-0.5 border-l-2 pl-3" :class="position.to ? 'border-(--ui-border)' : 'border-(--ui-primary)'">
                        <div class="flex items-baseline justify-between gap-4 text-xs leading-5">
                            <span class="min-w-0 font-bold text-default">{{ position.name }}</span>
                            <span class="shrink-0 tabular-nums text-(--ui-text-comment)">{{ date(position.from) }} — {{ date(position.to) }}</span>
                        </div>
                        <span v-if="position.skills?.length" class="text-xs leading-5 text-dimmed"><span class="text-(--ui-text-comment)">[</span><template v-for="(skill, s) in position.skills" :key="skill"><span>{{ skill }}</span><span v-if="s < position.skills.length - 1" class="text-(--ui-text-comment)">, </span></template><span class="text-(--ui-text-comment)">]</span></span>
                    </div>
                </div>
            </article>
        </div>

        <!-- проекты: та же бенто-сетка плиток, что на главной -->
        <MoleculesProjectsGrid v-else-if="kind === 'show_projects' && data" key="projects" :projects="data.items" :logo-colors="logoColors" animate @open="openProject"/>

        <!-- стек: как stack.tsv на главной — номера строк, категории оранжевым, навыки через пробелы -->
        <div v-else-if="kind === 'show_skills' && data" key="skills" class="item w-full border py-2 text-xs leading-6">
            <div v-for="(group, index) in [{ type: 'category', items: ['items'], header: true }, ...data.groups]" :key="group.type" class="item grid grid-cols-[2.5rem_7rem_minmax(0,1fr)]" :style="{ '--i': index }">
                <span class="border-r pr-3 text-right tabular-nums text-(--ui-text-comment)">{{ index + 1 }}</span>
                <span class="truncate pl-3" :class="group.header ? 'text-(--ui-text-comment)' : 'text-warning'">{{ group.type }}</span>
                <span class="pr-3" :class="group.header ? 'text-(--ui-text-comment)' : 'text-default'">
                    <template v-for="(skill, i) in group.items" :key="skill"><span class="whitespace-nowrap">{{ skill }}</span><template v-if="i < group.items.length - 1">&nbsp; </template></template>
                </span>
            </div>
        </div>

        <!-- прямые контакты -->
        <div v-else-if="kind === 'show_contacts' && data" key="contacts" class="grid w-full grid-cols-2 gap-1.5 max-sm:grid-cols-1">
            <a
                v-for="(link, index) in contactCards" :key="link.to" :href="link.to" :target="link.to.startsWith('http') ? '_blank' : undefined"
                class="contact item group flex min-w-0 items-center gap-3 border p-2 no-underline! transition-colors hover:border-(--ui-primary)" :style="{ '--i': index }"
            >
                <span class="flex size-8 shrink-0 items-center justify-center border transition-colors group-hover:border-(--ui-primary) group-hover:text-(--ui-primary)">
                    <NuxtIcon :name="link.icon" class="size-4"/>
                </span>
                <span class="flex min-w-0 grow flex-col text-xs leading-4">
                    <span class="truncate text-default">{{ link.label }}</span>
                    <span v-if="link.value" class="truncate text-(--ui-text-comment)">{{ link.value }}</span>
                </span>
                <NuxtIcon name="mingcute:arrow-right-up-line" class="size-3.5 shrink-0 text-dimmed transition-colors group-hover:text-(--ui-primary)"/>
            </a>
        </div>

        <!-- один проект: логотип, описание, стек, ссылки и GitHub -->
        <article v-else-if="kind === 'show_project' && project" key="project" class="flex flex-col border">
            <div class="item flex items-center justify-between gap-3 border-b p-3">
                <img v-if="image(project.logo)" :src="image(project.logo)" :alt="project.name" class="h-5 w-auto max-w-32 object-contain"/>
                <span v-else class="text-sm font-bold">{{ project.name }}</span>
                <span v-if="project.status" class="shrink-0 text-xs text-dimmed">{{ project.status }}</span>
            </div>
            <div v-if="project.images?.length" class="item flex gap-px overflow-x-auto border-b bg-(--ui-border)" :style="{ '--i': 1 }">
                <img v-for="src in project.images" :key="src" :src="src" alt="" class="h-28 w-auto shrink-0 bg-default object-cover"/>
            </div>
            <MDC v-if="project.description" :value="project.description" class="item p-3 text-xs leading-5 *:my-0! [&_p+p]:mt-2!" :style="{ '--i': 2 }"/>
            <div v-if="project.stack?.length" class="item flex flex-wrap gap-1 px-3 pb-3" :style="{ '--i': 3 }">
                <NuxtBadge v-for="skill in project.stack" :key="skill" :label="skill" size="sm" color="neutral" variant="outline" class="rounded-none"/>
            </div>
            <div class="item flex flex-wrap items-center gap-1.5 border-t p-3" :style="{ '--i': 4 }">
                <NuxtButton size="xs" variant="outline" color="neutral" icon="mingcute:arrow-right-up-line" class="rounded-none" @click="openProject(project.id)">{{ t('ai.blocks.open') }}</NuxtButton>
                <NuxtButton v-if="project.repo" :to="`https://github.com/${project.repo}`" target="_blank" size="xs" variant="outline" color="neutral" icon="mingcute:github-line" class="rounded-none no-underline!">
                    {{ project.repo }}
                    <span v-if="project.github" class="inline-flex items-center gap-0.5 text-dimmed"><NuxtIcon name="mingcute:star-line" class="size-3.5"/>{{ project.github.stars }}</span>
                </NuxtButton>
                <NuxtButton v-for="link in project.links" :key="link" :to="link" target="_blank" size="xs" variant="ghost" color="neutral" icon="mingcute:link-line" class="rounded-none no-underline!">{{ link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') }}</NuxtButton>
            </div>
        </article>

        <!-- репозитории на GitHub -->
        <div v-else-if="kind === 'show_repos' && data" key="repos" class="flex flex-col border">
            <a
                v-for="(item, index) in data.items" :key="item.repo" :href="`https://github.com/${item.repo}`" target="_blank"
                class="item flex flex-col gap-1.5 p-3 no-underline! transition-colors hover:bg-elevated" :class="index !== 0 && 'border-t'" :style="{ '--i': index }"
            >
                <span class="flex items-center justify-between gap-3 text-xs leading-5">
                    <span class="flex min-w-0 items-center gap-2"><NuxtIcon name="mingcute:github-line" class="size-4 shrink-0"/><span class="truncate font-bold text-default">{{ item.repo }}</span></span>
                    <span class="flex shrink-0 items-center gap-3 tabular-nums text-dimmed">
                        <span v-if="item.github?.language">{{ item.github.language }}</span>
                        <span class="flex items-center gap-1" :title="t('ai.blocks.stars')"><NuxtIcon name="mingcute:star-line" class="size-3.5"/>{{ item.github?.stars ?? '—' }}</span>
                        <span v-if="item.github?.forks" class="flex items-center gap-1" :title="t('ai.blocks.forks')"><NuxtIcon name="mingcute:git-branch-line" class="size-3.5"/>{{ item.github.forks }}</span>
                    </span>
                </span>
                <span class="text-xs text-dimmed">{{ item.name }}</span>
                <span v-if="item.github?.topics?.length" class="flex flex-wrap gap-1">
                    <NuxtBadge v-for="topic in item.github.topics.slice(0, 6)" :key="topic" :label="topic" size="sm" color="neutral" variant="outline" class="rounded-none"/>
                </span>
            </a>
        </div>

        <!-- сверка с вакансией -->
        <div v-else-if="isMatch && result?.items" key="match" class="flex flex-col border">
            <div class="flex items-center justify-between gap-3 border-b px-3 py-2 text-xs leading-5">
                <span class="min-w-0 truncate font-bold">{{ result.title || t('ai.blocks.match') }}</span>
                <span class="shrink-0 tabular-nums" :class="result.score >= 70 ? 'text-success' : result.score >= 40 ? 'text-warning' : 'text-dimmed'">{{ t('ai.blocks.match_score', { n: result.score }) }}</span>
            </div>
            <ul class="flex flex-col p-3 text-xs leading-5">
                <li v-for="(row, index) in result.items" :key="index" class="item flex items-start gap-2" :style="{ '--i': index }">
                    <NuxtIcon :name="matchIcon(row.status)" class="mt-0.5 size-4 shrink-0" :class="matchColor(row.status)"/>
                    <span class="min-w-0 grow" :class="row.status === 'missing' ? 'text-dimmed' : 'text-default'">{{ row.requirement }}</span>
                    <span class="shrink-0 tabular-nums text-dimmed">{{ row.status === 'match' ? (years(row.years) || t('ai.blocks.match_in_projects')) : row.status === 'partial' ? t('ai.blocks.match_partial') : t('ai.blocks.match_missing') }}</span>
                </li>
            </ul>
            <div v-if="result.projects?.length" class="flex flex-wrap items-center gap-1.5 border-t p-3">
                <span class="text-xs text-dimmed">{{ t('ai.blocks.match_projects') }}</span>
                <NuxtButton
                    v-for="(project, index) in result.projects" :key="project.id" size="xs" variant="outline" color="neutral" class="item rounded-none"
                    :style="{ '--i': index }" @click="openProject(project.id)"
                >{{ project.name }}</NuxtButton>
            </div>
        </div>

        <!-- источники веб-поиска: заголовок и домен, ссылки открываются в новой вкладке -->
        <div v-else-if="isSources && result?.results?.length" key="sources" class="flex flex-col border">
            <div class="flex items-center gap-2 border-b px-3 py-2 text-xs leading-5 text-dimmed">
                <NuxtIcon name="mingcute:search-line" class="size-4 shrink-0"/>
                <span class="truncate">{{ t('ai.blocks.sources', { q: result.query }) }}</span>
            </div>
            <a
                v-for="(source, index) in result.results.slice(0, 4)" :key="source.url" :href="source.url" target="_blank" rel="noopener nofollow"
                class="item flex items-center justify-between gap-3 px-3 py-2 text-xs leading-5 no-underline! transition-colors hover:bg-elevated" :class="index !== 0 && 'border-t'" :style="{ '--i': index }"
            >
                <span class="min-w-0 truncate text-default">{{ source.title }}</span>
                <span class="shrink-0 text-dimmed">{{ domain(source.url) }}</span>
            </a>
        </div>

        <!-- файлы резюме: карточка файла — превью стопкой листов слева, форматы справа -->
        <div v-else-if="isDownloads && result" key="downloads" class="item flex h-32 w-full overflow-hidden border">
            <a :href="downloads[0]!.to" target="_blank" class="deck relative mt-4 ml-5 mr-6 block h-44 w-32 shrink-0" :aria-label="t('ai.blocks.cv_open')">
                <span aria-hidden="true" class="sheet sheet-3"/>
                <span aria-hidden="true" class="sheet sheet-2"/>
                <span class="sheet sheet-1 overflow-hidden">
                    <span v-if="!previewLoaded" class="sk absolute inset-0"/>
                    <img :src="`/api/public/${cvLocale}/cv.png`" alt="" class="size-full object-cover object-top transition-opacity duration-300" :class="previewLoaded ? 'opacity-100' : 'opacity-0'" @load="previewLoaded = true">
                </span>
            </a>
            <div class="flex min-w-0 grow flex-col justify-between gap-3 p-3">
                <div class="flex flex-col gap-0.5 text-xs leading-5">
                    <span class="font-bold text-default">{{ t('ai.blocks.cv_title') }}</span>
                    <span class="text-(--ui-text-comment)"># {{ t('ai.blocks.cv_meta') }}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                    <NuxtButton
                        v-for="(file, index) in downloads" :key="file.format" :to="file.to" external download target="_blank" :icon="file.icon"
                        variant="outline" color="neutral" size="xs" class="item rounded-none no-underline!" :style="{ '--i': index + 1 }"
                        :ui="{ label: 'no-underline!' }"
                    >{{ file.label }}</NuxtButton>
                </div>
            </div>
        </div>

        <!-- заявка: как тикет — статус слева, контакты и сообщение справа -->
        <div v-else-if="isRequest && result?.fields" key="request" class="item flex w-full border">
            <div class="flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 border-r bg-success/5 p-3 text-center">
                <NuxtIcon name="mingcute:check-circle-line" class="size-7 text-success"/>
                <span class="text-xs leading-4 text-success">{{ result.created ? t('ai.blocks.request_saved') : t('ai.blocks.request_updated') }}</span>
            </div>
            <div class="flex min-w-0 grow flex-col gap-3 p-3">
                <div class="flex flex-col gap-0.5 text-xs leading-5">
                    <span class="font-bold text-default">{{ t('ai.blocks.request') }}</span>
                    <span class="text-(--ui-text-comment)"># {{ t('ai.blocks.request_hint') }}</span>
                </div>
                <div v-if="requestContacts.length" class="flex flex-wrap gap-1.5">
                    <component
                        :is="contact.to ? 'a' : 'span'" v-for="(contact, index) in requestContacts" :key="contact.key"
                        :href="contact.to" :target="contact.to?.startsWith('http') ? '_blank' : undefined"
                        class="item flex min-w-0 items-center gap-1.5 border px-2 py-1 text-xs leading-4 text-default no-underline! transition-colors"
                        :class="contact.to && 'hover:border-(--ui-primary) hover:text-(--ui-primary)'" :style="{ '--i': index + 1 }"
                        :aria-label="t(`ai.blocks.${contact.key}`)"
                    ><NuxtIcon :name="contact.icon" class="size-3.5 shrink-0 text-dimmed"/><span class="truncate">{{ contact.value }}</span></component>
                </div>
                <span v-else class="text-xs leading-4 text-(--ui-text-comment)"># {{ t('ai.blocks.request_no_contacts') }}</span>
                <p v-if="result.fields.message" class="item m-0 border-l-2 border-(--ui-primary) pl-3 text-xs leading-5 text-default break-words" :style="{ '--i': requestContacts.length + 1 }">{{ result.fields.message }}</p>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
    /* стопка листов: два листа позади чуть повёрнуты и сдвинуты, при наведении приподнимаются и расходятся веером */
    /* листы белые в любой теме — это бумага, а не интерфейс */
    .sheet { position: absolute; inset: 0; display: block; background: #fff; border: 1px solid var(--ui-border); transition: transform .25s ease; }
    .sheet-1 { z-index: 3; }
    /* колода крупнее карточки и уходит за её нижний край (карточка обрезает overflow) — листы будто выглядывают из папки */
    .sheet-2 { z-index: 2; transform: translate(6px, 4px) rotate(4deg); }
    .sheet-3 { z-index: 1; transform: translate(12px, 8px) rotate(8deg); }
    .deck:hover .sheet-1 { transform: translateY(-6px) rotate(-2deg); }
    .deck:hover .sheet-2 { transform: translate(8px, -2px) rotate(6deg); }
    .deck:hover .sheet-3 { transform: translate(16px, 2px) rotate(12deg); }

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
        .sheet { transition: none; }
    }
</style>
