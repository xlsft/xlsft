<script setup lang="ts">
    const { t, locale } = useI18n()
    const props = defineProps<{ data: IndexQuery, noTags?: boolean }>()
    const router = useRouter()

    // грузим все проекты один раз и фильтруем локально: счётчики тегов считаются из тех же данных, переключение мгновенное
    const { data: projects } = await useClarityDynamicQuery<ProjectsQuery>(groq`*[_type == "project"] {
        id, tags, repo, priority,
        "name": name[$locale],
        "logo": logo[$theme].asset->url,
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
    // живут в ней одинаково. Принимает `fe`, `--tag fe`, `--tag=fe`, `-t fe`; каждый тег сужает выборку (AND)
    const inputEl = ref<HTMLInputElement>()
    const input = ref('')
    const focused = ref(false)
    const error = ref('')
    watch(input, () => { error.value = '' })

    const FLAG = /^(?:--tag|-t)$/
    const SEPARATOR = /^(?:\s+|=)$/
    const tokens = computed(() => input.value.split(/(\s+|=)/).filter(Boolean))
    const typedValues = computed(() => tokens.value.filter(token => !SEPARATOR.test(token) && !FLAG.test(token)))
    const activeTags = computed(() => [...new Set(typedValues.value.filter(value => allTags.value.includes(value)))])

    const filteredProjects = computed(() => (projects.value || [])
        .filter(project => activeTags.value.every(tag => project.tags?.includes(tag))))

    // токен, который сейчас набирается: последний, если после него нет пробела и это не готовый флаг
    const partial = computed(() => {
        const last = tokens.value.at(-1)
        return last && !SEPARATOR.test(last) && !FLAG.test(last) ? last : ''
    })

    // меню дополнений в духе zsh: теги, которые ещё что-то оставят в выборке, отфильтрованные по набранному префиксу
    const matchingCounts = computed(() => countTags(filteredProjects.value))
    const menu = computed(() => [...matchingCounts.value]
        .filter(([tag]) => !activeTags.value.includes(tag) && tag.startsWith(partial.value.startsWith('-') ? '' : partial.value.toLowerCase()))
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count })))

    // что подставит Tab: сначала дописываем сам флаг, потом значение тега
    const completion = computed(() => {
        if (partial.value.startsWith('-')) return '--tag'.startsWith(partial.value) && partial.value !== '--tag' ? '--tag' : undefined
        return partial.value ? menu.value[0]?.tag : undefined
    })
    // полупрозрачный хвост автокомплита прямо за курсором
    const ghost = computed(() => completion.value?.slice(partial.value.length) || '')

    // подсветка синтаксиса: сам input прозрачный, поверх лежит его раскрашенная копия
    const highlighted = computed(() => tokens.value.map(text => ({
        text,
        class: SEPARATOR.test(text) ? ''
            : FLAG.test(text) ? 'text-primary'
            : allTags.value.includes(text) ? 'text-success'
            : text === 'clear' ? 'text-warning'
            : 'text-default'
    })))

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
        const unknown = typedValues.value.filter(value => !allTags.value.includes(value))
        if (unknown.length) error.value = `ls: ${unknown.join(', ')}: ${t('labels.terminal_not_found')}`
    }

    const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Tab' && completion.value) {
            // без подсказки Tab работает как обычно и уводит фокус дальше
            event.preventDefault()
            if (completion.value === '--tag') input.value = input.value.slice(0, input.value.length - partial.value.length) + '--tag '
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
        const logos = [...new Set((projects.value || []).map(p => p.logo).filter(Boolean))]
        const entries = await Promise.all(logos.map(async (src) => {
            const { color } = await $fetch<{ color: string | null }>('/api/logo-color', { query: { src } }).catch(() => ({ color: null }))
            return [src, color] as const
        }))
        return Object.fromEntries(entries) as Record<string, string | null>
    }, { watch: [projects] })

    const sortedProjects = computed(() => [...filteredProjects.value].sort((a: any, b: any) => b.priority - a.priority))

    // мозаика повторяется блоками по 6 карточек; grid-flow-dense укладывает их без дыр:
    // [1×4] [2×2] / [1×3] [1×3] / [1×3] [2×2]
    const big = 'sm:col-span-2 lg:col-span-1 lg:row-span-4'
    const wide = 'lg:col-span-2 lg:row-span-2'
    const tall = 'lg:row-span-3'
    const small = 'lg:row-span-2'
    const full = 'sm:col-span-2 lg:col-span-3 lg:row-span-2'
    const blockSpans = [big, wide, tall, tall, tall, wide]
    // неполный последний блок: свои раскладки по остатку, чтобы прямоугольник закрывался без пустых ячеек
    const tailSpans: Record<number, string[]> = {
        1: [full],
        2: [tall, 'lg:col-span-2 lg:row-span-3'],
        3: [big, wide, wide],
        4: [big, wide, small, small],
        5: [big, wide, small, small, full]
    }
    const tileSpan = (index: number, total: number) => {
        const tail = total % 6
        const tailStart = total - tail
        return tail && index >= tailStart ? tailSpans[tail]![index - tailStart] : blockSpans[index % 6]
    }

    const open = (id: string) => router.push(`/${locale.value}/projects/${id}`)

</script>

<template>
    <section class="flex flex-col relative" v-if="projects?.length" :aria-label="t('sections.projects')">
        <h2 class="px-6 py-4 text-xl! font-bold sm:hidden">
            ~/Projects
        </h2>
        <!-- фильтр в виде команды терминала: ввод с подсветкой синтаксиса, Tab дополняет, ниже меню дополнений -->
        <div class="flex items-center justify-between gap-0 border-b border-default max-sm:flex-col max-sm:items-stretch sm:gap-4 sm:p-4 lg:px-8 lg:py-6">
            <div v-if="allTags.length && !props.noTags" class="hidden min-w-0 flex-1 flex-col gap-3 sm:flex">
                <div class="flex items-center gap-3 text-base cursor-text!" @click="focusInput">
                    <span class="shrink-0 text-dimmed">~/Projects</span>
                    <span class="shrink-0 text-primary" aria-hidden="true">$</span>
                    <span class="shrink-0">ls</span>
                    <label class="relative flex min-w-0 flex-1 items-center">
                        <span class="sr-only">{{ t('labels.terminal_input') }}</span>
                        <span aria-hidden="true" class="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre">
                            <span v-for="(segment, index) in highlighted" :key="index" :class="segment.class">{{ segment.text }}</span>
                            <span class="opacity-40">{{ ghost }}</span>
                            <span v-if="!focused && !input" class="h-5 w-2.5 bg-inverted animate-pulse"/>
                            <!-- плейсхолдер-подсказка, какой аргумент писать; исчезает с первым символом -->
                            <span v-if="!input" class="text-primary opacity-35" :class="!focused && 'ml-1'">--tag</span>
                        </span>
                        <input
                            ref="inputEl"
                            v-model="input"
                            type="text"
                            spellcheck="false"
                            autocomplete="off"
                            autocapitalize="off"
                            class="w-full border-0 bg-transparent p-0 text-transparent caret-(--ui-text) outline-none cursor-text!"
                            @focus="focused = true"
                            @blur="focused = false"
                            @keydown="onKeydown"
                        >
                    </label>
                </div>
                <p v-if="error" class="text-sm text-error" role="alert">{{ error }}</p>
                <div v-if="menu.length" class="flex flex-wrap items-center gap-1 text-sm">
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
        <!-- без отступов: карточки стыкуются в одну сетку, общий 1px-бордер даёт outline каждой карточки поверх gap-px -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[8rem] lg:grid-flow-dense gap-px">
            <article
                v-for="(project, index) in sortedProjects"
                :key="project.id"
                tabindex="0"
                role="link"
                :aria-label="project.name"
                :class="[
                    'group/tile relative flex flex-col min-w-0 bg-default outline-1 outline-solid outline-(--ui-border) transition-colors',
                    'hover:z-10 hover:outline-primary focus-visible:z-10 focus-visible:outline-primary cursor-nw-resize! *:cursor-nw-resize!',
                    tileSpan(index, sortedProjects.length)
                ]"
                @click="open(project.id)"
                @keydown.enter="open(project.id)"
            >
                <!-- фон плитки рисуется классами: ровная сетка, при наведении — цвета логотипа; поверх — прозрачный логотип из поля logo -->
                <div class="relative grow min-h-0 overflow-clip max-lg:aspect-video flex items-center justify-center p-8">
                    <div
                        aria-hidden="true"
                        :style="{ '--logo-color': logoColors?.[project.logo] || 'var(--ui-text)' }"
                        class="absolute inset-0 opacity-20 transition-opacity duration-300 [--grid-line:var(--ui-border)] group-hover/tile:[--grid-line:var(--logo-color)] group-focus-visible/tile:[--grid-line:var(--logo-color)] group-hover/tile:opacity-50 group-focus-visible/tile:opacity-50 bg-[linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] bg-size-[24px_24px] bg-center"
                    />
                    <MoleculesScreenshotsDeck v-if="project.images?.length" :images="project.images" :name="project.name" :bg="project.bg"/>
                    <img
                        v-if="project.logo"
                        :src="project.logo"
                        alt=""
                        loading="lazy"
                        class="relative max-h-[55%] max-w-[70%] object-contain grayscale transition-all duration-300 group-hover/tile:grayscale-0 group-hover/tile:scale-110 group-focus-visible/tile:grayscale-0"
                    >
                </div>
                <div class="flex flex-col border-t border-default bg-default px-6 py-4 transition-colors group-hover/tile:border-primary group-focus-visible/tile:border-primary">
                    <div class="flex items-center justify-between gap-3">
                        <h3 class="text-sm! font-bold truncate">{{ project.name }}</h3>
                        <span aria-hidden="true" class="text-dimmed transition-colors group-hover/tile:text-primary group-focus-visible/tile:text-primary">↗</span>
                    </div>
                    <div class="grid grid-rows-[1fr] lg:grid-rows-[0fr] lg:group-hover/tile:grid-rows-[1fr] lg:group-focus-visible/tile:grid-rows-[1fr] transition-[grid-template-rows] duration-300">
                        <div class="min-h-0 overflow-hidden">
                            <div class="flex flex-col gap-3 pt-2">
                                <MDC :value="project.description" class="md *:m-0! *:text-xs! *:leading-4! text-dimmed"/>
                                <div class="flex flex-wrap gap-1">
                                    <NuxtBadge v-for="tag in project.tags" :key="tag" variant="outline" color="neutral" size="sm">{{ tag }}</NuxtBadge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        </div>
    </section>
</template>
