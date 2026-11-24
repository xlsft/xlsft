import { groq } from '@crumbleerp/clarity'
import removeMarkdown from 'remove-markdown'
import locales from '~~/i18n/locales/index'

// тот же вывод, что OrganismsTerminalProfile на главной: команда, fastfetch с фото, readme и stack.tsv

type ProfileData = {
    summary: { title: string, description: string, content: string, image: string, status: string }
    skills: { type: string, name: string, priority: number }[]
    experience: { name: string, positions: { duration: { from: string, to?: string } }[] }[]
    links: Record<string, { label: string, to: string } | null>
}

// цвета тем из app/assets/css/theme.css (tailwind v4 палитра в hex)
const palette = {
    error: '#ff2056', warning: '#ff6900', success: '#00bc7d', info: '#00b8db',
    primary: '#2b7fff', purple: '#ad46ff', amber: '#fe9a00', indigo: '#615fff', emerald: '#00bc7d', rose: '#ff2056', cyan: '#00b8db'
}
const themes = {
    dark: { bg: '#000000', text: '#ffffff', border: '#404040', value: '#c7c7c7', comment: '#767676', dimmed: '#9e9e9e' },
    light: { bg: '#ffffff', text: '#000000', border: '#c2c2c2', value: '#383838', comment: '#767676', dimmed: '#595959' }
}
// цвета строк fastfetch — по кругу, как .nf .row:nth-child(6n + k)
const rowColors = [palette.error, palette.warning, palette.success, palette.info, palette.primary, palette.purple]

// satori-html не декодирует HTML-сущности (&amp; выводится как есть) — поэтому не экранируем, а убираем то, что ломает разметку
const esc = (value: unknown) => String(value ?? '').replace(/[<>]/g, '').replace(/"/g, '”')
const bareUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
const css = (style: Record<string, string | number>) => Object.entries(style)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)}:${value}`).join(';')

/**
 * Абзац с жирными фрагментами. Satori не переносит строку внутри смешанного inline-текста,
 * поэтому раскладываем по словам во flex-wrap; слово может состоять из нескольких кусков
 * разного начертания («decisions**,**» → жирное слово + обычная запятая без пробела).
 */
const paragraph = (source: string, regular: string, bold: string, gap: string) => {
    const words: { text: string, bold: boolean }[][] = [[]]
    source.split(/\*\*(.+?)\*\*/).forEach((run, index) => {
        const isBold = index % 2 === 1
        const text = removeMarkdown(run, { stripListLeaders: false, gfm: true })
        text.split(/(\s+)/).forEach((piece) => {
            if (!piece) return
            if (/^\s+$/.test(piece)) { if (words.at(-1)!.length) words.push([]); return }
            words.at(-1)!.push({ text: piece, bold: isBold })
        })
    })
    return `<div style="${css({ display: 'flex', flexWrap: 'wrap', columnGap: gap })}">${words.filter(word => word.length).map(word =>
        `<div style="display:flex">${word.map(part =>
            `<span style="${css(part.bold ? { color: bold, fontWeight: 700 } : { color: regular })}">${esc(part.text)}</span>`).join('')}</div>`
    ).join('')}</div>`
}

const icon = (body: string, color: string, size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${body.replaceAll('currentColor', color)}</svg>`

export default defineCachedBinaryHandler(async (event) => {

    const config = useRuntimeConfig().public.config
    const [ locale, theme ] = [
        getRouterParam(event, 'locale'),
        getRouterParam(event, 'theme')
    ]
    // throw, а не return: иначе объект ошибки уйдёт в бинарный кэш как тело ответа
    if (!locale || !config.globals.locales.includes(locale)) throw createError({ status: 400, message: 'Locale is undefined' })
    if (!theme || !config.globals.themes.includes(theme)) throw createError({ status: 400, message: 'Theme is undefined' })

    const timing = useServerTiming(event)
    const client = useClarity()
    // только то, что реально рисуется на картинке
    const data = await timing('cms', () => client.fetch<ProfileData>(groq`{
        "summary": *[_type == "summary"][0]{
            "title": title[$locale],
            "description": description[$locale],
            "content": content[$locale],
            "image": image.asset->url,
            "status": status[$locale],
        },
        "skills": *[_type == "skill"] | order(type asc, name asc) { type, name, priority },
        "experience": *[_type == "experience"]{
            "name": name[$locale],
            "positions": positions[]{ duration } | order(duration.from desc),
        } | order(positions[0].duration.from desc),
        "links": {
            "hh": *[_type == "link" && id == "hh"][0] { "label": label[$locale], to },
            "github": *[_type == "link" && id == "github"][0] { "label": label[$locale], to },
            "linkedin": *[_type == "link" && id == "linkedin"][0] { "label": label[$locale], to },
        },
    }`, { locale }))

    const t = locales[locale as keyof typeof locales]
    const c = themes[theme as keyof typeof themes]
    const summary = data.summary

    // --- данные fastfetch, как в TerminalProfile.vue ---
    const titleMatch = (summary.title || '').match(/^(.*?)\s*\(([^()]+)\)\s*$/)
    const identity = titleMatch ? { role: titleMatch[1]!, user: titleMatch[2]! } : { role: summary.title || '', user: '' }

    const groups = Object.entries(Object.groupBy(data.skills ?? [], skill => skill.type))
        .map(([type, items]) => ({ type, items: [...items!].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)) }))
        .filter(group => group.items.length)
        // как на главной: по убыванию числа навыков, при равенстве — по алфавиту
        .sort((a, b) => b.items.length - a.items.length)
    const packages = groups.reduce((total, group) => total + group.items.length, 0)
    const shell = groups.find(group => group.type === 'frontend')?.items.slice(0, 3).map(skill => skill.name).join(', ')

    const experience = data.experience ?? []
    const host = experience.filter(company => company.positions?.some(position => !position.duration?.to)).map(company => company.name).join(', ')
    const from = experience.at(-1)?.positions?.at(-1)?.duration?.from
    const uptime = from ? useExperience(event, from, experience.at(0)?.positions?.at(0)?.duration?.to).duration() : ''

    const links = Object.values(data.links ?? {}).filter(link => !!link?.to) as { label: string, to: string }[]

    const content = summary.content?.trim() || ''
    const heading = content.match(/^# +([^\n]+)(?:\n|$)/)
    const bio = {
        heading: heading?.[1]!.trim() || summary.title,
        // MDC-блоки (::response-block) оставляем только текстом
        body: (content.slice(heading?.[0].length ?? 0).trim() || summary.description || '').replace(/^::.*$/gm, '').trim()
    }

    // --- размеры: картинка 1200px, это ~1.2× от десктопной вёрстки главной ---
    const pad = 40
    const font = { command: 19, row: 19, rowLine: 34, bio: 17, bioLine: 28, heading: 22, table: 17, tableLine: 33 }
    const charGap = '0.586em' // ширина пробела в Cascadia Code
    const photoCell = 420

    const rows = [
        identity.user && { key: t.profile.user, value: `<span style="color:${c.text}">${esc(identity.user)}</span>`, icon: terminalIcons.user },
        identity.role && { key: t.profile.role, value: esc(identity.role), icon: terminalIcons.role },
        host && { key: t.profile.host, value: esc(host), icon: terminalIcons.host },
        uptime && { key: t.profile.uptime, value: esc(uptime), icon: terminalIcons.uptime },
        packages && { key: t.profile.packages, value: `${packages}<span style="margin-left:${charGap};color:{row}">[−] stack.tsv</span>`, icon: terminalIcons.packages },
        shell && { key: t.profile.shell, value: esc(shell), icon: terminalIcons.shell },
        summary.status && { key: t.profile.status, value: esc(summary.status), icon: terminalIcons.status },
        config.head.url && { key: t.profile.web, value: esc(bareUrl(config.head.url)), icon: terminalIcons.web },
        links.length && { key: t.profile.links, value: `<span style="color:${c.comment}">${links.map(link => esc(link.label.toLowerCase())).join(', ')}</span>`, icon: terminalIcons.links },
    ].filter(Boolean) as { key: string, value: string, icon: string }[]
    const keyWidth = Math.max(...rows.map(row => row.key.length)) * font.row * 0.586

    // ⇥ в Cascadia Code нет, а фолбэк-шрифтов у satori нет — рисуем стрелку с упором сами
    const tab = `<div style="display:flex;align-items:center;margin:0 ${charGap};height:${font.tableLine}px"><svg width="11" height="11" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M1 6H10M7 3L10 6L7 9M11 2.5V9.5" stroke="${c.border}" stroke-width="1.3" fill="none"/></svg></div>`
    const swatches = [c.border, palette.emerald, palette.amber, palette.rose, palette.cyan, palette.primary, palette.indigo, c.text]

    const commandLine = `
        <div style="display:flex;align-items:center;font-size:${font.command}px;color:${c.text}">
            <span style="color:${c.dimmed}">~/</span>
            <span style="color:${palette.primary};margin-left:${charGap}">$</span>
            <span style="margin-left:${charGap}">fastfetch</span>
            <span style="color:${c.dimmed};margin-left:${charGap}">&&</span>
            <span style="margin-left:${charGap}">cat</span>
            <span style="color:${palette.success};margin-left:${charGap}">readme.md</span>
            ${groups.length ? `
                <span style="color:${c.dimmed};margin-left:${charGap}">&&</span>
                <span style="margin-left:${charGap}">bat</span>
                <span style="color:${palette.success};margin-left:${charGap}">stack.tsv</span>` : ''}
        </div>`

    // клетка под фото — SVG-паттерн: satori надёжнее рисует его, чем повторяющиеся градиенты
    // высота ячейки зависит от правой колонки — рисуем с запасом, лишнее срежет overflow:hidden
    const grid = `
        <div style="display:flex;position:absolute;top:0;left:0">
            <svg width="${photoCell}" height="1200" viewBox="0 0 ${photoCell} 1200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="grid" patternUnits="userSpaceOnUse" width="29" height="29" x="${(photoCell % 29) / 2}" y="0">
                        <path d="M0 0.5H29M0.5 0V29" stroke="${c.border}" stroke-width="1" fill="none"/>
                    </pattern>
                </defs>
                <rect width="${photoCell}" height="1200" fill="url(#grid)" opacity="0.6"/>
            </svg>
        </div>`

    const fetchBlock = `
        <div style="display:flex;border-bottom:1px solid ${c.border}">
            ${summary.image ? `
                <div style="display:flex;position:relative;width:${photoCell}px;flex-shrink:0;align-items:center;justify-content:center;padding:${pad}px;border-right:1px solid ${c.border};overflow:hidden">
                    ${grid}
                    <img src="${esc(summary.image)}" style="width:${photoCell - pad * 2}px;height:${photoCell - pad * 2}px;position:relative;object-fit:cover;border:1px solid ${c.border}"/>
                </div>` : ''}
            <div style="display:flex;flex-direction:column;justify-content:center;flex-grow:1;padding:${pad}px ${pad + 8}px">
                <div style="display:flex;flex-direction:column;position:relative;margin-top:16px;border:1px solid ${c.border};padding:28px 28px 18px">
                    <div style="display:flex;position:absolute;top:-${font.rowLine / 2}px;left:20px;padding:0 10px;background:${c.bg};font-weight:700;font-size:${font.row}px;line-height:${font.rowLine}px">
                        <span style="color:${palette.primary}">root</span><span style="color:${c.text}">@</span><span style="color:${palette.primary}">xlsft</span>
                    </div>
                    ${rows.map((row, index) => {
                        const color = rowColors[index % rowColors.length]!
                        return `
                        <div style="display:flex;align-items:center;font-size:${font.row}px;line-height:${font.rowLine}px">
                            ${icon(row.icon, color, 22)}
                            <span style="display:flex;width:${keyWidth}px;margin-left:16px;color:${color}">${esc(row.key.toLowerCase())}</span>
                            <span style="display:flex;margin-left:16px;color:${c.value}">${row.value.replace('{row}', color)}</span>
                        </div>`
                    }).join('')}
                </div>
                <div style="display:flex;margin-top:24px">
                    ${swatches.map(color => `<div style="display:flex;width:29px;height:14px;background:${color}"></div>`).join('')}
                </div>
            </div>
        </div>`

    const about = `
        <div style="display:flex;flex-direction:column;padding:28px ${pad}px 34px;border-bottom:1px solid ${c.border}">
            <span style="font-size:${font.heading}px;line-height:32px;font-weight:700;color:${c.text};margin-bottom:8px">${esc(bio.heading)}</span>
            <div style="display:flex;flex-direction:column;gap:${font.bioLine / 2}px;font-size:${font.bio}px;line-height:${font.bioLine}px;max-width:1060px">
                ${bio.body.split(/\n\s*\n/).filter(Boolean).map(text => paragraph(text.replace(/\n/g, ' '), c.value, c.text, charGap)).join('')}
            </div>
        </div>`

    const gutter = pad + 40
    const tableRow = (line: number, category: string, items: string, header = false) => `
        <div style="display:flex;font-size:${font.table}px;line-height:${font.tableLine}px">
            <span style="display:flex;justify-content:flex-end;width:${gutter}px;flex-shrink:0;padding-right:18px;color:${c.comment};border-right:1px solid ${c.border}">${line}</span>
            <span style="display:flex;width:${28 + 150}px;flex-shrink:0;padding-left:28px;color:${header ? c.comment : palette.warning}"><span>${category}</span>${tab}</span>
            <div style="display:flex;flex-wrap:wrap;flex:1 1 0;min-width:0;padding-right:${pad}px;color:${header ? c.comment : c.value}">${items}</div>
        </div>`

    const stack = groups.length ? `
        <div style="display:flex;flex-direction:column;position:relative">
            <div style="display:flex;position:absolute;top:0;bottom:0;left:0;width:${gutter}px;border-right:1px solid ${c.border}"></div>
            <div style="display:flex;flex-direction:column;padding:22px 0 26px">
                ${tableRow(1, 'category', 'items', true)}
                ${groups.map((group, index) => tableRow(index + 2, esc(group.type),
                    group.items.map((skill, i) => `<div style="display:flex"><span>${esc(skill.name)}</span>${i < group.items.length - 1 ? tab : ''}</div>`).join(''))).join('')}
            </div>
        </div>` : ''

    return useSatori(event, /*html*/`
        <div style="display:flex;flex-direction:column;width:100%;background:${c.bg};border:1px solid ${c.border};font-family:'Cascadia Code'">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:26px ${pad}px;border-bottom:1px solid ${c.border}">
                ${commandLine}
                <div style="display:flex;padding:9px 18px;background:${palette.primary};color:${c.bg};font-size:${font.command}px;font-weight:700">${esc(t.labels.contact_me)}</div>
            </div>
            ${fetchBlock}
            ${about}
            ${stack}
        </div>
    `, timing)
}, {
    maxAge: 3600,
    getKey: (event) => {
        const query = getQuery(event)
        return [
            'og:v2',
            getRouterParam(event, 'locale') || 'unknown',
            getRouterParam(event, 'theme') || 'unknown',
            getRouterParam(event, 'slug') || 'unknown',
            String(query.width || '')
        ].join(':')
    }
})
