<script setup lang="ts">
    const { t, locale } = useI18n()
    const props = defineProps<{ data: IndexQuery, noTags?: boolean }>()
    const router = useRouter()

    // грузим все проекты один раз и фильтруем локально: счётчики тегов считаются из тех же данных, переключение мгновенное
    const { data: projects } = await useClarityDynamicQuery<ProjectsQuery>(groq`*[_type == "project"] {
        id, tags, repo, priority,
        "name": name[$locale],
        "logo": { "dark": logo.dark.asset->url, "light": logo.light.asset->url },
        "description": description[$locale],
        "images": images[].asset->url,
        "bg": bg.hex
    } | order(priority desc)`)

    const countTags = (list: ProjectsQuery) => list.reduce((counts, project) => {
        for (const tag of project.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1)
        return counts
    }, new Map<string, number>())
    const allTags = computed(() => [...countTags(projects.value || []).keys()])

    // терминальный фильтр: строка ввода — единственный источник состояния, и набранные, и кликнутые теги
    // живут в ней одинаково. Принимает `fe`, `--tag fe`, `--tag=fe`, `-T fe`; каждый тег сужает выборку (AND).
    // `--help`/`-H` печатает однострочную справку, прочие `-…` — ошибка, как у настоящего ls
    const inputEl = ref<HTMLInputElement>()
    const input = ref('')
    const focused = ref(false)

    // своя блочная каретка вместо нативной: одна и та же в фокусе и без него, шрифт моноширинный — позиция в ch
    const caret = reactive({ index: 0, scroll: 0 })
    const syncCaret = () => {
        const el = inputEl.value
        if (!el || document.activeElement !== el) return
        caret.index = el.selectionEnd ?? el.value.length
        caret.scroll = el.scrollLeft
    }
    onMounted(() => document.addEventListener('selectionchange', syncCaret))
    onBeforeUnmount(() => document.removeEventListener('selectionchange', syncCaret))
    // без фокуса каретка стоит в конце введённого, как в настоящем терминале
    const caretStyle = computed(() => ({
        left: `calc(${focused.value ? caret.index : input.value.length}ch - ${focused.value ? caret.scroll : 0}px)`
    }))
    const FLAG = /^(?:--tag|-T)$/
    const HELP = /^(?:--help|-H)$/
    const OPTIONS = ['--tag', '--help']
    const SEPARATOR = /^(?:\s+|=)$/
    const isOption = (token: string) => token.startsWith('-')
    const tokens = computed(() => input.value.split(/(\s+|=)/).filter(Boolean))
    const typedValues = computed(() => tokens.value.filter(token => !SEPARATOR.test(token) && !isOption(token)))
    const activeTags = computed(() => [...new Set(typedValues.value.filter(value => allTags.value.includes(value)))])

    // Enter проверяет и недописанный последний токен; любое редактирование снова откладывает его проверку
    const submitted = ref(false)
    watch(input, () => { submitted.value = false })

    const filteredProjects = computed(() => (projects.value || [])
        .filter(project => activeTags.value.every(tag => project.tags?.includes(tag))))

    // токен, который сейчас набирается: последний, если после него нет пробела и это не готовый флаг
    const partial = computed(() => {
        const last = tokens.value.at(-1)
        return last && !SEPARATOR.test(last) && !FLAG.test(last) && !HELP.test(last) ? last : ''
    })

    // завершённые токены (за ними уже пробел) проверяются сразу, недописанный — только по Enter
    const checked = computed(() => {
        const list = tokens.value.filter(token => !SEPARATOR.test(token))
        return submitted.value || !partial.value ? list : list.slice(0, -1)
    })
    const isBadOption = (token: string) => isOption(token) && !FLAG.test(token) && !HELP.test(token)
    // `clear` — встроенная команда, а не тег
    const isUnknownTag = (token: string) => !isOption(token) && !allTags.value.includes(token) && input.value.trim() !== 'clear'
    const help = computed(() => checked.value.some(token => HELP.test(token)))

    // первая ошибка в духе GNU ls: неизвестная опция, флаг без значения (по Enter), неизвестный тег
    const error = computed(() => {
        const badOption = checked.value.find(isBadOption)
        if (badOption) return `ls: ${t('labels.terminal_bad_option')} '${badOption}'`
        const last = tokens.value.filter(token => !SEPARATOR.test(token)).at(-1)
        if (submitted.value && last && FLAG.test(last)) return `ls: ${t('labels.terminal_requires_arg', { option: last })}`
        const unknown = checked.value.filter(isUnknownTag)
        if (unknown.length) return `ls: ${unknown.join(', ')}: ${t('labels.terminal_not_found')}`
        return ''
    })

    // меню дополнений в духе zsh: теги, которые ещё что-то оставят в выборке, отфильтрованные по набранному префиксу
    const matchingCounts = computed(() => countTags(filteredProjects.value))
    const menu = computed(() => [...matchingCounts.value]
        .filter(([tag]) => !activeTags.value.includes(tag) && tag.startsWith(partial.value.startsWith('-') ? '' : partial.value.toLowerCase()))
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count })))

    // что подставит Tab: сначала дописываем сам флаг (`-` → `--tag`, `--h` → `--help`), потом значение тега
    const completion = computed(() => {
        if (isOption(partial.value)) return OPTIONS.find(option => option.startsWith(partial.value) && option !== partial.value)
        return partial.value ? menu.value[0]?.tag : undefined
    })
    // полупрозрачный хвост автокомплита прямо за курсором
    const ghost = computed(() => completion.value?.slice(partial.value.length) || '')

    // подсветка синтаксиса: сам input прозрачный, поверх лежит его раскрашенная копия
    // ошибочные токены красятся красным только когда уже проверены, чтобы не мигать красным посреди набора
    const highlighted = computed(() => {
        const bad = new Set(checked.value.filter(token => isBadOption(token) || isUnknownTag(token)))
        return tokens.value.map(text => ({
            text,
            class: SEPARATOR.test(text) ? ''
                : FLAG.test(text) || HELP.test(text) ? 'text-primary'
                : allTags.value.includes(text) ? 'text-success'
                : text === 'clear' ? 'text-warning'
                : bad.has(text) ? 'text-error'
                : 'text-default'
        }))
    })

    const focusInput = () => nextTick(() => {
        const el = inputEl.value
        if (!el) return
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
    })

    // клик по пункту меню делает то же, что набор с Tab: дописывает `--tag <тег>` в строку
    const pick = (tag: string) => {
        const base = partial.value && !partial.value.startsWith('-')
            ? input.value.slice(0, input.value.length - partial.value.length)
            : input.value
        const head = base.trimEnd()
        const needsFlag = !FLAG.test(head.split(/\s+/).at(-1) || '')
        input.value = `${head ? head + ' ' : ''}${needsFlag ? '--tag ' : ''}${tag} `
        focusInput()
    }

    function toggleTag(tag: string) {
        const selected = activeTags.value.includes(tag)
            ? activeTags.value.filter(value => value !== tag)
            : [...activeTags.value, tag]
        input.value = selected.map(value => `--tag ${value} `).join('')
    }

    const run = () => {
        const command = input.value.trim()
        if (command === 'clear') { input.value = ''; return }
        submitted.value = true
    }

    const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Tab' && completion.value) {
            // без подсказки Tab работает как обычно и уводит фокус дальше
            event.preventDefault()
            if (isOption(completion.value)) input.value = input.value.slice(0, input.value.length - partial.value.length) + completion.value + ' '
            else pick(completion.value)
        } else if (event.key === 'Enter') {
            event.preventDefault()
            run()
        } else if (event.key === 'Escape') {
            input.value = ''
        }
    }

    const pad = (value: number) => String(value).padStart(2, '0')

    // доминантный цвет каждого логотипа (считается на сервере и кэшируется) — им красится сетка плитки при наведении
    const { data: logoColors } = await useAsyncData('project-logo-colors', async () => {
        const logos = [...new Set((projects.value || []).flatMap(p => [p.logo?.dark, p.logo?.light]).filter(Boolean) as string[])]
        const entries = await Promise.all(logos.map(async (src) => {
            const { color } = await $fetch<{ color: string | null }>('/api/logo-color', { query: { src } }).catch(() => ({ color: null }))
            return [src, color] as const
        }))
        return Object.fromEntries(entries) as Record<string, string | null>
    }, { watch: [projects] })

    const sortedProjects = computed(() => [...filteredProjects.value].sort((a: any, b: any) => b.priority - a.priority))

    const open = (id: string) => router.push(`/${locale.value}/projects/${id}`)

</script>

<template>
    <section class="flex flex-col relative" v-if="projects?.length" :aria-label="t('sections.projects')">
        <h2 class="px-6 py-4 text-xl! font-bold sm:hidden">
            ~/projects
        </h2>
        <!-- фильтр в виде команды терминала: ввод с подсветкой синтаксиса, Tab дополняет, ниже меню дополнений -->
        <div class="flex items-center justify-between gap-0 border-b border-default max-sm:flex-col max-sm:items-stretch sm:gap-4 sm:p-4 lg:px-8 lg:py-6">
            <div v-if="allTags.length && !props.noTags" class="hidden min-w-0 flex-1 flex-col gap-3 sm:flex">
                <div class="flex items-center gap-3 text-base cursor-text!" @click="focusInput">
                    <span class="shrink-0 text-dimmed">~/projects</span>
                    <span class="shrink-0 text-primary" aria-hidden="true">$</span>
                    <span class="shrink-0">ls</span>
                    <label class="relative flex min-w-0 flex-1 items-center">
                        <span class="sr-only">{{ t('labels.terminal_input') }}</span>
                        <span aria-hidden="true" class="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre">
                            <span v-for="(segment, index) in highlighted" :key="index" :class="segment.class">{{ segment.text }}</span>
                            <span class="opacity-40">{{ ghost }}</span>
                            <!-- плейсхолдер-подсказка, какой аргумент писать (как хвост автокомплита); исчезает с первым символом.
                                 Отступ в 1ch — место под каретку -->
                            <span v-if="!input" class="ml-[1ch] opacity-40">--tag</span>
                            <!-- без фокуса каретка видна только в пустой строке, в фокусе — всегда; символ под ней инвертируется -->
                            <span
                                v-if="focused || !input"
                                class="absolute top-1/2 h-5 w-[1ch] -translate-y-1/2 bg-white mix-blend-difference animate-pulse"
                                :style="caretStyle"
                            />
                        </span>
                        <input
                            ref="inputEl"
                            v-model="input"
                            type="text"
                            spellcheck="false"
                            autocomplete="off"
                            autocapitalize="off"
                            class="w-full border-0 bg-transparent p-0 text-transparent caret-transparent outline-none cursor-text!"
                            @focus="focused = true"
                            @blur="focused = false"
                            @keydown="onKeydown"
                        >
                    </label>
                </div>
                <!-- строка вывода под командой всегда занимает одну строку фиксированной высоты:
                     ошибка/меню появляются и исчезают, а шапка секции не прыгает -->
                <div class="flex h-6 shrink-0 items-center gap-3 overflow-x-auto overflow-y-hidden whitespace-nowrap text-sm *:[font-feature-settings:'calt'_0]">
                    <p v-if="error" class="shrink-0 text-error" role="alert">{{ error }}</p>
                    <p v-else-if="help" class="shrink-0 text-dimmed" role="status">{{ t('labels.terminal_help') }}</p>
                    <div v-else-if="menu.length" class="flex shrink-0 items-center gap-1">
                        <button
                            v-for="item in menu"
                            :key="item.tag"
                            type="button"
                            :class="[
                                'flex items-baseline gap-1.5 px-2 py-0.5 transition-colors',
                                item.tag === completion ? 'bg-inverted text-inverted' : 'text-success hover:bg-(--ui-border)/40'
                            ]"
                            @click.stop="pick(item.tag)"
                        >
                            {{ item.tag }}<span :class="['text-xs', item.tag === completion ? 'opacity-60' : 'text-dimmed']">{{ pad(item.count) }}</span>
                        </button>
                    </div>
                </div>
            </div>
            <div v-if="allTags.length && !props.noTags" class="grid grid-cols-[repeat(auto-fit,minmax(4rem,1fr))] border-t border-default bg-(--ui-border) gap-px sm:hidden">
                <button
                    v-for="tag in allTags"
                    :key="tag"
                    type="button"
                    :aria-pressed="activeTags.includes(tag)"
                    :disabled="!matchingCounts.has(tag)"
                    class="flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 bg-default px-1 text-sm leading-tight text-default disabled:text-dimmed focus-visible:-outline-offset-2 aria-pressed:bg-inverted aria-pressed:text-inverted"
                    @click="toggleTag(tag)"
                >
                    {{ tag }}<span class="text-xs leading-none tabular-nums opacity-65">{{ pad(matchingCounts.get(tag) ?? 0) }}</span>
                </button>
            </div>
            <OrganismsContactButton class="ml-auto shrink-0 max-sm:hidden!"/>
        </div>
        <MoleculesProjectsGrid :projects="sortedProjects" :logo-colors @open="open"/>
    </section>
</template>
