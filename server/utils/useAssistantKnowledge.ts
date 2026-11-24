import type { AssistantData } from './useAssistantData'

/**
 * «Знания» ассистента поверх данных резюме: поиск по тексту, стаж по технологии и сверка с вакансией.
 * Всё считается из тех же данных CMS, без внешних сервисов — ответы детерминированы и не стоят токенов на контекст.
 */

const clip = (value: string, length: number) => value.length > length ? `${value.slice(0, length).trimEnd()}…` : value

/** Markdown/MDC → плоский текст для поиска и сниппетов. */
const plain = (value?: string) => (value || '')
    .replace(/^::.*$/gm, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>|~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// ─── технологии ────────────────────────────────────────────────────────────────

const ALIASES: Record<string, string> = {
    js: 'javascript', ts: 'typescript', postgres: 'postgresql', pg: 'postgresql', k8s: 'kubernetes',
    golang: 'go', py: 'python', mongo: 'mongodb', tailwindcss: 'tailwind', vue3: 'vue', nuxt3: 'nuxt', nuxt4: 'nuxt'
}

/** «Vue.js», «vue», «VueJS» → «vue»; «Node.js» → «node». */
export const normalizeTech = (value: string) => {
    const base = value.toLowerCase().replace(/[\s._\-]/g, '')
    if (ALIASES[base]) return ALIASES[base]
    const stripped = base.length > 3 ? base.replace(/js$/, '') : base
    return ALIASES[stripped] ?? stripped
}

/** Все технологии из данных: нормализованное имя → как оно записано в CMS. */
const knownTechs = (data: AssistantData) => {
    const names = new Map<string, string>()
    const add = (name?: string) => { if (name && !names.has(normalizeTech(name))) names.set(normalizeTech(name), name) }
    data.skills.forEach(group => group.items.forEach(item => add(item.name)))
    data.experience.forEach(company => company.positions.forEach(position => position.skills?.forEach(add)))
    data.projects.forEach(project => project.stack?.forEach(add))
    return names
}

const monthIndex = (value: string) => { const [year, month] = value.split('-').map(Number); return year! * 12 + (month || 1) - 1 }
const nowMonth = () => { const now = new Date(); return now.getFullYear() * 12 + now.getMonth() }

/** Сумма месяцев по объединению интервалов (параллельные позиции не считаются дважды). */
const unionMonths = (ranges: [number, number][]) => {
    const sorted = [...ranges].sort((a, b) => a[0] - b[0])
    let total = 0, start = -Infinity, end = -Infinity
    for (const [from, to] of sorted) {
        if (from > end) { if (end > start) total += end - start; start = from; end = to }
        else end = Math.max(end, to)
    }
    if (end > start) total += end - start
    return total
}

export const techExperience = (data: AssistantData, tech: string) => {
    const key = normalizeTech(tech)
    const known = knownTechs(data)
    const has = (list?: string[]) => !!list?.some(item => normalizeTech(item) === key)

    const positions = data.experience.flatMap(company => company.positions
        .filter(position => has(position.skills) && position.from)
        .map(position => ({ company: company.name, position: position.name, from: position.from.slice(0, 7), to: position.to?.slice(0, 7) || null })))
    const months = unionMonths(positions.map(p => [monthIndex(p.from), p.to ? monthIndex(p.to) + 1 : nowMonth() + 1]))
    const projects = data.projects.filter(project => has(project.stack) || project.tags?.some(tag => normalizeTech(tag) === key)).map(project => project.id)
    const inSkills = data.skills.some(group => has(group.items.map(item => item.name)))

    return {
        tech: known.get(key) ?? tech,
        known: known.has(key) || projects.length > 0,
        years: Math.round(months / 12 * 10) / 10,
        inSkills,
        positions,
        projects
    }
}

// ─── поиск ─────────────────────────────────────────────────────────────────────

type Doc = { ref: string, title: string, text: string }

const documents = (data: AssistantData): Doc[] => [
    ...(data.summary?.content ? plain(data.summary.content).split(/(?<=[.!?])\s+(?=\S)/).reduce<string[]>((chunks, sentence) => {
        // абзацы «о себе» режем на куски ~400 символов, чтобы сниппет был про найденное
        const last = chunks.at(-1)
        if (last && last.length + sentence.length < 400) chunks[chunks.length - 1] = `${last} ${sentence}`
        else chunks.push(sentence)
        return chunks
    }, []).map((text, i) => ({ ref: `about:${i}`, title: data.summary.title || 'About', text })) : []),
    ...data.experience.flatMap(company => [
        ...(company.about ? [{ ref: `experience:${company.id}`, title: company.name, text: plain(company.about) }] : []),
        ...company.positions.map(position => ({
            ref: `experience:${company.id}`,
            title: `${company.name} — ${position.name}`,
            text: [plain(position.description), position.skills?.length ? `Stack: ${position.skills.join(', ')}` : ''].filter(Boolean).join(' ')
        }))
    ]),
    ...data.projects.map(project => ({
        ref: `project:${project.id}`,
        title: project.name,
        text: [plain(project.description), project.stack?.length ? `Stack: ${project.stack.join(', ')}` : '', project.tags?.length ? `Tags: ${project.tags.join(', ')}` : '', project.status || ''].filter(Boolean).join(' ')
    }))
]

const STOP = new Set(['the', 'and', 'for', 'with', 'what', 'did', 'does', 'has', 'have', 'any', 'его', 'что', 'как', 'был', 'есть', 'или', 'для', 'при', 'над', 'ли', 'он', 'с', 'в', 'на', 'по', 'и'])

/** Грубый стемминг: русские и английские окончания срезаем до префикса, этого хватает для резюме. */
const stems = (query: string) => [...new Set(query.toLowerCase().split(/[^\p{L}\p{N}+#]+/u)
    .filter(word => word.length >= 2 && !STOP.has(word))
    .map(word => word.length > 5 ? word.slice(0, Math.max(5, word.length - 2)) : word))]

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Совпадение только с начала слова: «бот» находит «боты», но не «работа». */
const wordPattern = (term: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}`, 'iu')
const startsWord = (text: string, term: string) => wordPattern(term).test(text)

export const searchCv = (data: AssistantData, query: string, limit = 5) => {
    const terms = stems(query)
    if (!terms.length) return []
    const need = Math.max(1, Math.round(terms.length * 0.6))
    return documents(data)
        .map(doc => {
            const hits = terms.filter(term => startsWord(`${doc.title} ${doc.text}`, term))
            const titleHits = terms.filter(term => startsWord(doc.title, term)).length
            return { doc, hits, score: hits.length + titleHits * 0.5 }
        })
        .filter(entry => entry.hits.length >= need)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ doc, hits }) => {
            // сниппет — окно вокруг первого совпадения в тексте
            const at = Math.max(0, doc.text.search(wordPattern(hits[0]!)))
            const from = Math.max(0, at - 80)
            return { ref: doc.ref, title: doc.title, snippet: `${from > 0 ? '…' : ''}${clip(doc.text.slice(from), 260)}` }
        })
}

// ─── вакансия ──────────────────────────────────────────────────────────────────

export type VacancyRequirement = { requirement: string, status: 'match' | 'partial' | 'missing', tech?: string, years?: number, refs?: string[] }

export const matchVacancy = (data: AssistantData, requirements: string[]) => {
    const known = knownTechs(data)
    const items: VacancyRequirement[] = requirements.map(raw => {
        const requirement = clip(raw.trim(), 80)
        // технология может стоять внутри фразы: «опыт с Vue 3 от 2 лет»
        const candidates = [requirement, ...requirement.split(/[\s,/()+;:]+/)].map(normalizeTech).filter(Boolean)
        const key = candidates.find(candidate => known.has(candidate))
        if (key) {
            const experience = techExperience(data, known.get(key)!)
            return { requirement, status: 'match', tech: experience.tech, years: experience.years || undefined, refs: experience.projects.slice(0, 3).map(id => `project:${id}`) }
        }
        const hits = searchCv(data, requirement, 2)
        return hits.length ? { requirement, status: 'partial', refs: hits.map(hit => hit.ref) } : { requirement, status: 'missing' }
    })

    // проекты, где совпавших технологий больше всего
    const matched = new Set(items.filter(item => item.tech).map(item => normalizeTech(item.tech!)))
    const projects = data.projects
        .map(project => ({ id: project.id, name: plain(project.name), overlap: (project.stack ?? []).filter(item => matched.has(normalizeTech(item))).length }))
        .filter(project => project.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 3)
        .map(({ id, name }) => ({ id, name }))

    const score = items.length ? Math.round(items.reduce((sum, item) => sum + (item.status === 'match' ? 1 : item.status === 'partial' ? 0.5 : 0), 0) / items.length * 100) : 0
    return { score, items, projects }
}

// ─── GitHub ────────────────────────────────────────────────────────────────────

/** Звёзды и темы репозитория; кэш на час, при ошибке — null (блок просто покажет репозиторий без цифр). */
export const useGithubStats = defineCachedFunction(async (repo: string) => {
    try {
        const token = process.env.GITHUB_TOKEN
        const response = await $fetch<{ stargazers_count: number, forks_count: number, topics?: string[], language?: string, pushed_at?: string }>(`https://api.github.com/repos/${repo}`, {
            headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            timeout: 5000
        })
        return { stars: response.stargazers_count, forks: response.forks_count, topics: response.topics ?? [], language: response.language ?? null, pushed: response.pushed_at?.slice(0, 10) ?? null }
    } catch { return null }
}, { maxAge: 3600, swr: true, staleMaxAge: 86400, group: 'chat', name: 'github-stats', getKey: (repo: string) => repo.replace(/[^\w.-]/g, '_') })
