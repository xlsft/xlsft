import { PROJECTS_FLAG, PROJECTS_HELP, PROJECTS_OPTIONS, PROJECTS_SEPARATOR } from './const'

export const useProjectsStore = defineStore('projects', () => {
    const { t } = useI18n()

    const items = ref<ProjectsQuery>([])
    const state = ref<{ input?: string, submitted?: boolean, focus?: number }>({})

    const methods = {
        option: (token: string): boolean => token.startsWith('-'),
        invalid: (token: string): boolean => methods.option(token) && !PROJECTS_FLAG.test(token) && !PROJECTS_HELP.test(token),
        unknown: (token: string): boolean => !methods.option(token) && !tags.value.includes(token) && text.value.trim() !== 'clear',
        count(list: ProjectsQuery): Map<string, number> {
            return list.reduce((counts, project) => {
                for (const tag of project.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
                return counts
            }, new Map<string, number>())
        },
        pad: (value: number): string => String(value).padStart(2, '0'),
        focus(): void {
            state.value.focus = Date.now()
        },
        type(value?: string): void {
            state.value.input = value?.length ? value : undefined
            state.value.submitted = undefined
        },
        pick(tag: string): void {
            const base = partial.value && !partial.value.startsWith('-') ? text.value.slice(0, text.value.length - partial.value.length) : text.value
            const head = base.trimEnd()
            const flag = !PROJECTS_FLAG.test(head.split(/\s+/).at(-1) ?? '')
            methods.type(`${head ? `${head} ` : ''}${flag ? '--tag ' : ''}${tag} `)
            methods.focus()
        },
        toggle(tag: string): void {
            const selected = active.value.includes(tag) ? active.value.filter((value) => value !== tag) : [...active.value, tag]
            methods.type(selected.map((value) => `--tag ${value} `).join(''))
        },
        complete(): boolean {
            if (!completion.value) return false
            if (methods.option(completion.value)) methods.type(`${text.value.slice(0, text.value.length - partial.value.length)}${completion.value} `)
            else methods.pick(completion.value)
            return true
        },
        run(): void {
            if (text.value.trim() === 'clear') methods.type()
            else state.value.submitted = true
        },
    }

    const text = computed<string>(() => state.value.input ?? '')
    const tags = computed<string[]>(() => [...methods.count(items.value).keys()])
    const tokens = computed<string[]>(() => text.value.split(/(\s+|=)/).filter(Boolean))
    const active = computed<string[]>(() => [...new Set(tokens.value.filter((token) => !PROJECTS_SEPARATOR.test(token) && !methods.option(token) && tags.value.includes(token)))])
    const filtered = computed<ProjectsQuery>(() => items.value.filter((project) => active.value.every((tag) => project.tags?.includes(tag))))
    const sorted = computed<ProjectsQuery>(() => [...filtered.value].sort((a, b) => b.priority - a.priority))
    const counts = computed<Map<string, number>>(() => methods.count(filtered.value))
    const partial = computed<string>(() => {
        const last = tokens.value.at(-1)
        return last && !PROJECTS_SEPARATOR.test(last) && !PROJECTS_FLAG.test(last) && !PROJECTS_HELP.test(last) ? last : ''
    })
    const checked = computed<string[]>(() => {
        const list = tokens.value.filter((token) => !PROJECTS_SEPARATOR.test(token))
        return state.value.submitted || !partial.value ? list : list.slice(0, -1)
    })
    const help = computed<boolean>(() => checked.value.some((token) => PROJECTS_HELP.test(token)))
    const error = computed<string | undefined>(() => {
        const option = checked.value.find(methods.invalid)
        if (option) return `ls: ${t('labels.terminal_bad_option')} '${option}'`
        const last = tokens.value.filter((token) => !PROJECTS_SEPARATOR.test(token)).at(-1)
        if (state.value.submitted && last && PROJECTS_FLAG.test(last)) return `ls: ${t('labels.terminal_requires_arg', { option: last })}`
        const unknown = checked.value.filter(methods.unknown)
        return unknown.length ? `ls: ${unknown.join(', ')}: ${t('labels.terminal_not_found')}` : undefined
    })
    const menu = computed<{ tag: string, count: number }[]>(() => [...counts.value]
        .filter(([tag]) => !active.value.includes(tag) && tag.startsWith(partial.value.startsWith('-') ? '' : partial.value.toLowerCase()))
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count })))
    const completion = computed<string | undefined>(() => methods.option(partial.value)
        ? PROJECTS_OPTIONS.find((option) => option.startsWith(partial.value) && option !== partial.value)
        : partial.value ? menu.value[0]?.tag : undefined)
    const line = computed<string>(() => {
        const bad = new Set(checked.value.filter((token) => methods.invalid(token) || methods.unknown(token)))
        return tokens.value.map((token) => {
            const code = PROJECTS_SEPARATOR.test(token) ? 'o'
                : PROJECTS_FLAG.test(token) || PROJECTS_HELP.test(token) ? 'p'
                    : tags.value.includes(token) ? 's'
                        : token === 'clear' ? 'w'
                            : bad.has(token) ? 'e' : 'o'
            return `\0${code}${token}`
        }).join('')
    })

    return { items, state, text, tags, active, sorted, counts, partial, help, error, menu, completion, line, ...methods }
})
