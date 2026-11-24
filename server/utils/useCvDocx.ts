import type { H3Event } from 'h3'
import { groq } from '@crumbleerp/clarity'
import { renderAsync } from '@resvg/resvg-js'
import MarkdownIt from 'markdown-it'
import {
    AlignmentType, BorderStyle, CharacterSet, Document, ExternalHyperlink, ImageRun, Packer, Paragraph,
    HeightRule, LineRuleType, UnderlineType, ShadingType, TabStopType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, VerticalMergeType, WidthType,
    type IBorderOptions, type ParagraphChild
} from 'docx'
import locales from '~~/i18n/locales'
import globalConfig from '~~/global.config'

/**
 * CV в .docx на одну страницу в стиле /print: тонкая шапка (фото | о себе | контакты, ниже навыки)
 * и experience.conf с короткими описаниями позиций (descriptionShort).
 * Данные те же, что и раньше, меняется только оформление. Всё рисуется таблицами без сеток —
 * так Word, LibreOffice и Google Docs раскладывают одинаково.
 */

type CvData = {
    summary: { title: string, description: string, content: string, image: string, status: string }
    skills: { type: string, name: string, priority: number }[]
    experience: {
        name: string, link?: string, logo?: string
        positions: { name: string, description?: string, duration: { from: string, to?: string }, skills?: { name: string }[] }[]
    }[]
    links: Record<string, { label: string, to: string } | null>
}

// печатная тема (светлая) из app/assets/css/theme.css
const color = {
    text: '000000', value: '383838', dimmed: '595959', comment: '767676', border: 'C2C2C2', bg: 'FFFFFF',
    // брендовый акцент — из global.config, чтобы не разъезжался с сайтом
    primary: globalConfig.theme.accent.replace('#', '').toUpperCase(), success: '00BC7D', warning: 'FF6900', error: 'FF2056', info: '00B8DB', purple: 'AD46FF',
    amber: 'FE9A00', indigo: '615FFF'
}
const FONT = 'Cascadia Code'

// A4, поля 1.27 см; всё в twip (1/20 pt)
const PAGE = { width: 11906, height: 16838, margin: 454 }
const CONTENT = PAGE.width - PAGE.margin * 2
// строка-зазор из крошечного текста: в абзацах с минимальным интервалом даёт отступ меньше строки
const GAP = 6
const SIZE = { body: 14, small: 12, command: 14, heading: 15, role: 15 } // полупункты
const LINE = 240 // межстрочный, 240 = одинарный

const md = new MarkdownIt()

const SETTINGS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + '<w:embedTrueTypeFonts/><w:displayBackgroundShape/><w:evenAndOddHeaders w:val="false"/>'
    + '<w:compat><w:compatSetting w:val="15" w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word"/></w:compat>'
    + '</w:settings>'

// --- примитивы ---

type RunStyle = { color?: string, bold?: boolean, italics?: boolean, size?: number, fill?: string, raise?: number }
const run = (text: string, style: RunStyle = {}) => new TextRun({ text, font: FONT, size: style.size ?? SIZE.body, color: style.color ?? color.value, bold: style.bold, italics: style.italics, position: style.raise ? `${style.raise}pt` : undefined, shading: style.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: style.fill } : undefined })
// ссылки — акцентным синим с подчёркиванием, как ссылки на сайте
const link = (text: string, href: string, style: RunStyle = {}) => new ExternalHyperlink({ link: href, children: [new TextRun({
    text, font: FONT, size: style.size ?? SIZE.body, color: color.primary, bold: style.bold,
    underline: { type: UnderlineType.SINGLE, color: color.primary }, position: style.raise ? `${style.raise}pt` : undefined,
})] })
/** Pages добавляет отступ между абзацами, игнорируя spacing; строки внутри одного абзаца (через перенос) идут плотно */
// у переноса — размер абзаца: без него Pages считает высоту по шрифту по умолчанию, и первая строка отходит дальше остальных
// tiny — номера строк-зазоров: перенос в конце такой строки тоже крошечный, иначе он растянет её до обычной высоты
const lines = (rows: ParagraphChild[][], size = SIZE.small, tiny: Set<number> = new Set()) => rows.flatMap((row, index) =>
    index ? [new TextRun({ text: '', break: 1, size: tiny.has(index - 1) ? GAP : size, font: FONT }), ...row] : row)
// межстрочный интервал точный (1.3 от кегля абзаца): «авто» Pages считает по метрикам Cascadia Code — выходит ~1.5
type ParaOptions = {
    after?: number, before?: number, align?: (typeof AlignmentType)[keyof typeof AlignmentType], indent?: { left?: number, hanging?: number },
    keepNext?: boolean, size?: number, auto?: boolean, rightTab?: number, factor?: number,
    // минимальный интервал: высота каждой строки — по её собственному тексту (нужно для строк-зазоров)
    atLeast?: boolean
}
const para = (children: ParagraphChild[], options: ParaOptions = {}) => new Paragraph({
    children,
    alignment: options.align,
    indent: options.indent,
    keepNext: options.keepNext,
    tabStops: options.rightTab ? [{ type: TabStopType.RIGHT, position: options.rightTab }] : undefined,
    spacing: options.atLeast
        ? { before: options.before ?? 0, after: options.after ?? 0, line: 20, lineRule: LineRuleType.AT_LEAST }
        : options.auto
        // абзацы с картинками — «авто», иначе точная высота строки обрежет логотип
        ? { before: options.before ?? 0, after: options.after ?? 0, line: 240, lineRule: LineRuleType.AUTO }
        : { before: options.before ?? 0, after: options.after ?? 0, line: Math.round((options.size ?? SIZE.body) * 10 * (options.factor ?? 1.3)), lineRule: LineRuleType.EXACT },
    // размер знака абзаца — иначе Pages считает высоту строки по шрифту по умолчанию
    run: { size: options.size ?? SIZE.small },
})

const none: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: 'auto' }
const line = (tint = color.border): IBorderOptions => ({ style: BorderStyle.SINGLE, size: 6, color: tint })
type Sides = Partial<Record<'top' | 'bottom' | 'left' | 'right', IBorderOptions>>
const borders = (sides: Sides = {}) => ({
    top: sides.top ?? none, bottom: sides.bottom ?? none, left: sides.left ?? none, right: sides.right ?? none,
})

type CellOptions = {
    width: number, children: (Paragraph | Table)[], borders?: Sides, fill?: string,
    margins?: { top?: number, bottom?: number, left?: number, right?: number }, align?: (typeof VerticalAlign)[keyof typeof VerticalAlign], span?: number, rowSpan?: number
}
const cell = (options: CellOptions) => options

// абзац-заглушка минимальной высоты: пустой <w:p/> Pages/Quick Look рисуют 12pt и раздувают строку
const blank = () => new Paragraph({ children: [], run: { size: 2 }, spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT } })

/**
 * Таблица без внутренних линий. docx пишет каждой ячейке свои tcBorders (по умолчанию none),
 * а они перекрывают рамку таблицы — поэтому рамку таблицы раздаём крайним ячейкам сами.
 */
const table = (columns: number[], rows: CellOptions[][], options: { borders?: Sides, cantSplit?: boolean, rowHeights?: (number | undefined)[] } = {}) => {
    const outer = options.borders ?? {}
    // объединение по вертикали собираем сами (restart/continue): ячейки-продолжения, которые docx дописывает
    // для rowSpan, содержат пустой <w:p/>, и Pages из-за него раздувает каждую строку
    const occupied: { left: number, spec: CellOptions, rows: number, start: number }[] = columns.map(() => ({ left: 0, spec: null as any, rows: 0, start: 0 }))
    return new Table({
        width: { size: columns.reduce((a, b) => a + b, 0), type: WidthType.DXA },
        columnWidths: columns,
        layout: TableLayoutType.FIXED,
        borders: { ...borders(), insideHorizontal: none, insideVertical: none },
        // поля по умолчанию для всей таблицы: Pages/Quick Look берут их вместо полей ячеек и добавляют воздух в каждую строку
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        rows: rows.map((row, rowIndex) => {
            const cells: TableCell[] = []
            let column = 0
            const edges = (spec: CellOptions, start: number, end: number, lastRow: boolean) => {
                const own = spec.borders ?? {}
                return {
                    top: (rowIndex === 0 && outer.top) || own.top || none,
                    bottom: (lastRow && outer.bottom) || own.bottom || none,
                    left: (start === 0 && outer.left) || own.left || none,
                    right: (end >= columns.length && outer.right) || own.right || none,
                }
            }
            // ячейки-продолжения для колонок, занятых объединением сверху
            const flushMerged = () => {
                while (column < columns.length && occupied[column]!.left > 0) {
                    const merge = occupied[column]!
                    const span = merge.spec.span ?? 1
                    merge.left--
                    const lastRow = rowIndex === merge.start + merge.rows - 1
                    cells.push(new TableCell({
                        width: { size: merge.spec.width, type: WidthType.DXA },
                        verticalMerge: VerticalMergeType.CONTINUE,
                        columnSpan: merge.spec.span,
                        borders: { ...edges(merge.spec, column, column + span, rowIndex === rows.length - 1 || lastRow), top: none },
                        children: [blank()],
                    }))
                    for (let index = column; index < column + span; index++) occupied[index]!.left = merge.left
                    column += span
                }
            }
            for (const spec of row) {
                flushMerged()
                const start = column
                const span = spec.span ?? 1
                const rowSpan = spec.rowSpan ?? 1
                column += span
                if (rowSpan > 1) for (let index = start; index < start + span; index++) occupied[index] = { left: rowSpan - 1, spec, rows: rowSpan, start: rowIndex }
                cells.push(new TableCell({
                    width: { size: spec.width, type: WidthType.DXA },
                    borders: { ...edges(spec, start, column, rowIndex + rowSpan - 1 === rows.length - 1), ...(rowSpan > 1 ? { bottom: none } : {}) },
                    shading: spec.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: spec.fill } : undefined,
                    margins: { top: 0, bottom: 0, left: 0, right: 0, ...spec.margins },
                    verticalAlign: spec.align ?? VerticalAlign.TOP,
                    columnSpan: spec.span,
                    verticalMerge: rowSpan > 1 ? VerticalMergeType.RESTART : undefined,
                    children: spec.children,
                }))
            }
            flushMerged()
            const height = options.rowHeights?.[rowIndex]
            return new TableRow({ cantSplit: options.cantSplit, children: cells, height: height ? { value: height, rule: HeightRule.ATLEAST } : undefined })
        }),
    })
}

/**
 * Таблица шрифтов: Cascadia Code со встроенными начертаниями. Если встроенный шрифт не подхватился,
 * Word подбирает замену по altName/panose/family/pitch — указываем моноширинный Courier New
 */
const fontTableXml = (regularKey: string, boldKey: string) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:fonts xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + `<w:font w:name="${FONT}"><w:altName w:val="Courier New"/><w:panose1 w:val="020B0609020000020004"/><w:charset w:val="00"/><w:family w:val="modern"/><w:pitch w:val="fixed"/>`
    + `<w:embedRegular r:id="rId1" w:fontKey="{${regularKey}}"/><w:embedBold r:id="rId2" w:fontKey="{${boldKey}}"/></w:font>`
    + '<w:font w:name="Courier New"><w:panose1 w:val="02070309020205020404"/><w:charset w:val="00"/><w:family w:val="modern"/><w:pitch w:val="fixed"/></w:font>'
    + '</w:fonts>'

// --- markdown → runs/абзацы (жирный, курсив, ссылки, код) ---

const inlineRuns = (source: string, base: RunStyle = {}): ParagraphChild[] => {
    const tokens = md.parseInline(source, {})[0]?.children ?? []
    const out: ParagraphChild[] = []
    let bold = 0, italics = 0, href: string | null = null
    for (const token of tokens) {
        const style = { ...base, bold: base.bold || bold > 0 || undefined, italics: italics > 0 || undefined, color: bold > 0 && !base.color ? color.text : base.color }
        if (token.type === 'strong_open') bold++
        else if (token.type === 'strong_close') bold--
        else if (token.type === 'em_open') italics++
        else if (token.type === 'em_close') italics--
        else if (token.type === 'link_open') href = token.attrGet('href')
        else if (token.type === 'link_close') href = null
        else if (token.type === 'softbreak' || token.type === 'hardbreak') out.push(run(' ', style))
        else if (token.type === 'text' || token.type === 'code_inline') {
            out.push(href ? link(token.content, href, { ...style, color: color.primary }) : run(token.content, style))
        }
    }
    return out
}

/** Кусок текста со стилем — для ручного переноса строк */
type Segment = { text: string, style: RunStyle, href?: string }
const inlineSegments = (source: string, base: RunStyle = {}): Segment[] => {
    const tokens = md.parseInline(source, {})[0]?.children ?? []
    const out: Segment[] = []
    let bold = 0, italics = 0, href: string | null = null
    for (const token of tokens) {
        const style: RunStyle = { ...base, bold: base.bold || bold > 0 || undefined, italics: italics > 0 || undefined, color: bold > 0 && !base.color ? color.text : base.color }
        if (token.type === 'strong_open') bold++
        else if (token.type === 'strong_close') bold--
        else if (token.type === 'em_open') italics++
        else if (token.type === 'em_close') italics--
        else if (token.type === 'link_open') href = token.attrGet('href')
        else if (token.type === 'link_close') href = null
        else if (token.type === 'softbreak' || token.type === 'hardbreak') out.push({ text: ' ', style })
        else if (token.type === 'text' || token.type === 'code_inline')
            out.push(href ? { text: token.content, style: { ...style, color: color.primary }, href } : { text: token.content, style })
    }
    return out
}

/**
 * Ручной перенос по словам на заданное число символов. Шрифт моноширинный (Cascadia Code, в Pages — Courier New),
 * поэтому ширина строки — это число символов. Нужен, чтобы значения шли одним абзацем через переносы
 * (Pages ставит лишний отступ между абзацами), а ключи слева стояли ровно напротив своих строк.
 */
const wrapSegments = (segments: Segment[], width: number, indent = 0): Segment[][] => {
    const words: Segment[][] = [[]]
    for (const segment of segments) for (const piece of segment.text.split(/(\s+)/)) {
        if (!piece) continue
        if (/^\s+$/.test(piece)) { if (words.at(-1)!.length) words.push([]); continue }
        words.at(-1)!.push({ ...segment, text: piece })
    }
    const lines: Segment[][] = [[]]
    let length = 0
    for (const word of words.filter(word => word.length)) {
        const size = word.reduce((sum, part) => sum + part.text.length, 0)
        const limit = lines.length === 1 ? width : width - indent
        if (length && length + 1 + size > limit) {
            lines.push(indent ? [{ text: '\u00A0'.repeat(indent), style: {} }] : [])
            length = 0
        }
        if (length) { lines.at(-1)!.push({ text: ' ', style: word[0]!.style }); length++ }
        lines.at(-1)!.push(...word)
        length += size
    }
    return lines
}
const segmentRuns = (segments: Segment[], base: RunStyle = {}): ParagraphChild[] =>
    segments.map(segment => segment.href ? link(segment.text, segment.href, { ...base, ...segment.style }) : run(segment.text, { ...base, ...segment.style }))

type Block = { kind: 'paragraph' | 'list' | 'quote' | 'heading', items: string[] }
/** Разбор markdown на блоки верхнего уровня: абзац, список (по пунктам), цитата, заголовок */
const blocks = (source: string): Block[] => {
    const result: Block[] = []
    const tokens = md.parse(source.replace(/^::.*$/gm, ''), {})
    let depth = 0
    let current: Block | null = null
    for (const token of tokens) {
        if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') { if (!depth) result.push(current = { kind: 'list', items: [] }); depth++ }
        else if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') { depth--; if (!depth) current = null }
        else if (token.type === 'blockquote_open') { if (!depth) result.push(current = { kind: 'quote', items: [] }); depth++ }
        else if (token.type === 'blockquote_close') { depth--; if (!depth) current = null }
        else if (token.type === 'heading_open' && !depth) result.push(current = { kind: 'heading', items: [] })
        else if (token.type === 'paragraph_open' && !depth) result.push(current = { kind: 'paragraph', items: [] })
        else if (token.type === 'inline' && current) current.items.push(token.content)
    }
    return result.filter(block => block.items.length)
}

// --- картинки ---

const pngSize = (buffer: Buffer) => ({ width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) })
const jpegSize = (buffer: Buffer) => {
    let offset = 2
    while (offset < buffer.length) {
        const marker = buffer[offset + 1]!
        const length = buffer.readUInt16BE(offset + 2)
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
            return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
        offset += 2 + length
    }
    return null
}

/** Картинка в PNG/JPEG с размерами: SVG растеризуем, остальное — как есть, если формат понятен Word */
const toRaster = async (src: string, height: number) => {
    const { buffer, type } = await fetchImage(src)
    if (type === 'image/svg+xml') {
        const image = await renderAsync(buffer, { fitTo: { mode: 'height', value: height * 4 }, background: 'rgba(0,0,0,0)' })
        return { data: image.asPng(), type: 'png' as const, width: image.width, height: image.height }
    }
    if (type === 'image/png') return { data: buffer, type: 'png' as const, ...pngSize(buffer) }
    if (type === 'image/jpeg') { const size = jpegSize(buffer); return size ? { data: buffer, type: 'jpg' as const, ...size } : null }
    return null
}

// прозрачный PNG 1×1 — распорка высотой с логотип, чтобы первая строка во всех колонках была одной высоты
const SPACER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=', 'base64')

const bareUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

// --- сборка ---

export const useCvDocx = async (event: H3Event) => {
    const locale = getRouterParam(event, 'locale') as keyof typeof locales
    if (!locale || !(locale in locales)) throw createError({ status: 400, message: 'Locale is undefined' })
    const t = locales[locale]
    const config = useRuntimeConfig().public.config

    const data = await useClarity().fetch<CvData>(groq`{
        "summary": *[_type == "summary"][0]{
            "title": title[$locale],
            "description": description[$locale],
            "content": content[$locale],
            "image": image.asset->url,
            "status": status[$locale],
        },
        "skills": *[_type == "skill"] | order(type asc, name asc) { type, name, priority },
        "experience": *[_type == "experience"]{
            link,
            "name": name[$locale],
            "positions": positions[]{
                "name": name[$locale],
                "description": descriptionShort[$locale],
                "skills": skills[]->{ name, priority } | order(priority desc),
                duration,
            } | order(duration.from desc),
            "logo": logo.light.asset->url,
        } | order(positions[0].duration.from desc),
        "links": {
            "hh": *[_type == "link" && id == "hh"][0] { "label": label[$locale], to },
            "github": *[_type == "link" && id == "github"][0] { "label": label[$locale], to },
            "linkedin": *[_type == "link" && id == "linkedin"][0] { "label": label[$locale], to },
        },
    }`, { locale })

    const summary = data.summary
    const experience = data.experience ?? []
    const total = (from?: string, to?: string) => from ? useExperience(event, from, to) : null
    const range = (from: string, to?: string) => useExperience(event, from, to).period().split(' / ')[0]!

    // шапка в docx тонкая: опыт важнее карточки кандидата
    const titleMatch = (summary.title || '').match(/^(.*?)\s*\(([^()]+)\)\s*$/)
    const identity = titleMatch ? { role: titleMatch[1]!, user: titleMatch[2]! } : { role: summary.title || '', user: '' }
    const groups = Object.entries(Object.groupBy(data.skills ?? [], skill => skill.type))
        .map(([type, items]) => ({ type, items: [...items!].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)) }))
        .filter(group => group.items.length)
        .sort((a, b) => b.items.length - a.items.length)
    const uptime = total(experience.at(-1)?.positions?.at(-1)?.duration?.from, experience.at(0)?.positions?.at(0)?.duration?.to)?.duration() ?? ''
    const links = Object.values(data.links ?? {}).filter(item => !!item?.to) as { label: string, to: string }[]
    const small = { size: SIZE.small }

    // картинки грузим параллельно: фото и логотипы
    const [photo, logos, [regular, bold]] = await Promise.all([
        summary.image ? toRaster(summary.image, 200).catch(() => null) : null,
        Promise.all(experience.map(company => company.logo ? toRaster(company.logo, 28).catch(() => null) : null)),
        Promise.all([useSatoriFont('Cascadia Code', 400), useSatoriFont('Cascadia Code', 700)]),
    ])

    // Pages не умеет вложенные таблицы (превращает их в текст), поэтому каждый блок — одна плоская таблица
    const children: (Paragraph | Table)[] = []

    // | фото | имя, роль, опыт, одна строка о себе | контакты |
    // | stack: категория навыки · категория навыки … |
    // фото квадратом на всю ячейку; высота строки шапки — по фото, ширина ячейки — фото плюс поля, которые Pages добавляет сам
    const photoPx = 72
    const photoWidth = photo ? photoPx * 15 + 120 : 0
    const contactsWidth = 3000
    const aboutWidth = CONTENT - photoWidth - contactsWidth
    const contacts = [
        ...(config.head.url ? [{ label: t.profile.web, to: config.head.url }] : []),
        ...links,
    ]
    const headRow: CellOptions[] = [
        // высота строки задаётся фото (см. height ниже)
        ...(photo ? [cell({ width: photoWidth, align: VerticalAlign.TOP, borders: { right: line() }, children: [
            new Paragraph({
                children: [new ImageRun({ type: photo.type, data: photo.data, transformation: { width: photoPx, height: photoPx } })],
                spacing: { before: 0, after: 0, line: photoPx * 15, lineRule: LineRuleType.EXACT },
            }),
        ] })] : []),
        cell({ width: aboutWidth, align: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 200, right: 200 }, children: [
            para(lines([
                [
                    run(identity.user || identity.role, { color: color.text, bold: true, size: SIZE.heading }),
                    ...(identity.user ? [run(`  ${identity.role}`, { color: color.text, size: SIZE.body })] : []),
                ],
                [
                    ...(uptime ? [run(`# ${t.sections.experience.toLowerCase()}: ${uptime}`, { ...small, color: color.primary })] : []),
                    ...(summary.status ? [run(`  # ${summary.status}`, { ...small, color: color.comment })] : []),
                ],
                ...(summary.description ? [inlineRuns(summary.description, small)] : []),
            ]), { size: SIZE.heading }),
        ] }),
        cell({ width: contactsWidth, align: VerticalAlign.CENTER, borders: { left: line() }, margins: { top: 80, bottom: 80, left: 200, right: 200 }, children:
            [para(lines(contacts.map(item => [run(`${item.label.toLowerCase()} `, { ...small, color: color.comment }), link(bareUrl(item.to), item.to, small)])), { size: SIZE.small })],
        }),
    ]
    // навыки и категории через одинаковые двойные пробелы, без разделителей
    const gap = () => run('  ', small)
    const skillsRow: CellOptions[] = [cell({ width: CONTENT, span: photo ? 3 : 2, borders: { top: line() }, margins: { top: 60, bottom: 60, left: 200, right: 200 }, children: [
        para(groups.flatMap((group, index) => [
            ...(index ? [gap()] : []),
            run(group.type, { ...small, color: color.warning }),
            ...group.items.flatMap(skill => [gap(), run(skill.name, small)]),
        ]), { size: SIZE.small }),
    ] })]
    children.push(table([...(photo ? [photoWidth] : []), aboutWidth, contactsWidth], [headRow, ...(groups.length ? [skillsRow] : [])],
        { borders: { top: line(), bottom: line() }, rowHeights: [photo ? photoPx * 15 : undefined] }))

    // ~/experience $ echo "($DURATION)" && cat experience.conf
    if (experience.length) {
        children.push(table([CONTENT], [[cell({ width: CONTENT, margins: { top: 80, bottom: 80, left: 240, right: 240 }, children: [
            para([run('~/experience', { color: color.text, bold: true, size: SIZE.heading }), run('  $', { color: color.primary, size: SIZE.command }),
                run(' echo', { color: color.text, size: SIZE.command }), run(' "($DURATION)"', { color: color.info, size: SIZE.command }),
                run(' &&', { color: color.dimmed, size: SIZE.command }), run(' cat', { color: color.text, size: SIZE.command }), run(' experience.conf', { color: color.success, size: SIZE.command }), run(`  (${uptime})`, { color: color.comment, size: SIZE.command })], { keepNext: true, size: SIZE.heading }),
        ] })]], { borders: { bottom: line() } }))

        // колонки: номер в рамке (объединён по вертикали) | ключ | = | значение | период; отступы — полями ячеек
        const numberCol = 760, keyWidth = 1500, eqWidth = 260, periodWidth = 2800
        const valueWidth = CONTENT - numberCol - keyWidth - eqWidth - periodWidth
        const columns = [numberCol, keyWidth, eqWidth, valueWidth, periodWidth]

        // строка содержимого — набор ячеек на 4 колонки контента (ключ, =, значение, период)
        type Content = CellOptions[]

        experience.forEach((company, companyIndex) => {
            const period = total(company.positions.at(-1)?.duration.from, company.positions.at(0)?.duration.to)
            const count = company.positions.length
            const companyTotal = count > 1
                ? `${useNumberCase(count, t.positions.one, t.positions.two, t.positions.more)}, ${period?.duration()}`
                : period?.duration() ?? ''
            const logo = logos[companyIndex]

            const content: Content[] = []
            // ширина колонки значений в символах (моноширинный шрифт, 0.6em на символ)
            const chars = Math.floor((valueWidth + periodWidth - 240) / (SIZE.body * 6)) - 1
            // строка компании — первой строкой той же строки таблицы, что и поля позиции (отдельная строка таблицы в Pages = лишний зазор):
            // логотип в колонке ключей, ссылка и стаж в колонке значений, период прижат вправо табуляцией
            const logoPx = 10
            const periodText = period ? range(company.positions.at(-1)!.duration.from, company.positions.at(0)!.duration.to) : ''
            const headKey: ParagraphChild[] = logo
                ? [new ImageRun({ type: logo.type, data: logo.data, transformation: { height: logoPx, width: Math.round(logoPx * logo.width / logo.height) } })]
                : []
            const spacer = (width = 1) => new ImageRun({ type: 'png', data: SPACER, transformation: { width, height: logoPx } })
            // текст строки поднимаем к середине логотипа: (высота логотипа в pt − высота строчных букв) / 2
            const raise = logo ? 1 : 0
            const headLength = (logo ? 0 : company.name.length + 2) + (company.link ? bareUrl(company.link).length + 2 : 0) + `# ${companyTotal}`.length
            const headValue: ParagraphChild[] = [
                ...(logo ? [] : [run(company.name, { color: color.text, bold: true }), run('  ')]),
                ...(company.link ? [link(bareUrl(company.link), company.link, { raise }), run('  ', { raise })] : []),
                run(`# ${companyTotal}`, { color: color.comment, raise }),
                // период прижимаем вправо пробелами: шрифт моноширинный, а табуляцию в ячейках Pages игнорирует
                run(' '.repeat(Math.max(2, chars - headLength - periodText.length)), { raise }),
                run(periodText, { color: color.text, raise }),
                // распорка в конце строки — чтобы не давать отступа слева
                ...(logo ? [spacer()] : []),
            ]

            // всё под строкой компании — одна строка таблицы: ключи, «=» и значения идут тремя абзацами с переносами строк.
            // Pages игнорирует поля ячеек и добавляет свой отступ к каждой строке таблицы и каждому абзацу, поэтому их минимум.
            // Длинные значения переносим сами, добавляя ключам пустые строки — так всё стоит строка в строку
            // строка таблицы на позицию: одну огромную строку Pages не разрывает между страницами
            type Entry = { key: string, eq: boolean, lines: Segment[][], keyColor?: string, keyRuns?: ParagraphChild[], eqRuns?: ParagraphChild[], valueRuns?: ParagraphChild[], gap?: boolean }
            let entries: Entry[] = []
            const add = (key: string, segments: Segment[], eq = true, indent = 0) => entries.push({ key, eq, lines: wrapSegments(segments, chars, indent) })
            const tight = { atLeast: true }
            const flush = () => {
                if (!entries.length) return
                const gapRun = () => [new TextRun({ text: '', size: GAP, font: FONT })]
                const tiny = new Set<number>()
                entries.reduce((line, entry) => { if (entry.gap) tiny.add(line); return line + entry.lines.length }, 0)
                const keyLines = entries.flatMap(entry => entry.gap ? [gapRun()] : entry.lines.map((_, index) => !index && entry.keyRuns ? entry.keyRuns : [run(index ? '' : entry.key, { color: entry.keyColor ?? color.dimmed })]))
                const eqLines = entries.flatMap(entry => entry.gap ? [gapRun()] : entry.lines.map((_, index) => !index && entry.eqRuns ? entry.eqRuns : [run(index || !entry.eq ? '' : '=', { color: color.border })]))
                const valueLines = entries.flatMap(entry => entry.gap ? [gapRun()] : entry.valueRuns ? [entry.valueRuns] : entry.lines.map(line => segmentRuns(line)))
                content.push([
                    cell({ width: keyWidth, children: [para(lines(keyLines, SIZE.body, tiny), tight)] }),
                    cell({ width: eqWidth, children: [para(lines(eqLines, SIZE.body, tiny), tight)] }),
                    cell({ width: valueWidth + periodWidth, span: 2, children: [para(lines(valueLines, SIZE.body, tiny), tight)] }),
                ])
                entries = []
            }
            // описание компании в docx не выводим — место нужнее опыту
            entries.push({ key: '', eq: false, lines: [[]], keyRuns: headKey, eqRuns: logo ? [spacer(4)] : undefined, valueRuns: headValue })
            // небольшой зазор под строкой компании
            entries.push({ key: '', eq: false, lines: [[]], gap: true })

            company.positions.forEach((position, positionIndex) => {
                const current = !position.duration.to
                const positionRange = range(position.duration.from, position.duration.to)
                const positionDuration = useExperience(event, position.duration.from, position.duration.to).duration()

                // каждая позиция своей строкой
                if (positionIndex) flush()
                // [[position]] — первой строкой в колонке ключей, пометка «текущая» — в колонке значений
                // period отдельной строкой не выводим — он есть в строке компании; если позиций несколько, период позиции — комментарием здесь
                // «текущая» не пишем: «— настоящее время» в периоде говорит то же самое
                const marker = company.positions.length > 1 ? `# ${positionRange}, ${positionDuration}` : ''
                // [[position]] нужен, только когда позиций несколько
                if (company.positions.length > 1) entries.push({ key: '[[position]]', eq: false, keyColor: current ? color.primary : color.dimmed, lines: [marker ? [{ text: marker, style: { color: color.comment } }] : []] })
                add('role', [{ text: position.name, style: { color: color.text, bold: true } }])

                // описание: первый абзац — summary, список — scope (первое жирное — подключ), цитата — result
                let summaryUsed = false
                for (const block of blocks(position.description ?? '')) {
                    if (block.kind === 'list') block.items.forEach((item, index) => {
                        const sub = item.match(/^\*\*(.+?)\*\*\s*(.*)$/s)
                        if (!sub) return add(index ? '' : 'scope', inlineSegments(item), !index)
                        const subKey = sub[1]!.padEnd(Math.max(14, sub[1]!.length + 2), '\u00A0')
                        add(index ? '' : 'scope', [{ text: subKey, style: { color: color.text } }, ...inlineSegments(sub[2]!)], !index, subKey.length)
                    })
                    else if (block.kind === 'quote') block.items.forEach((item, index) => add(index ? '' : 'result', inlineSegments(item, { color: color.text, bold: true }), !index))
                    else block.items.forEach((item) => { add(summaryUsed ? '' : 'summary', inlineSegments(item), !summaryUsed); summaryUsed = true })
                }
                if (position.skills?.length) add('stack', [
                    { text: '[', style: { color: color.comment } },
                    ...position.skills.flatMap((skill, i) => i ? [{ text: ',', style: { color: color.comment } }, { text: ` ${skill.name}`, style: {} }] : [{ text: skill.name, style: {} }]),
                    { text: ']', style: { color: color.comment } },
                ])
            })

            // подпись компании (награды и т.п.) в docx не выводим
            flush()

            // номер компании слева в объединённой по вертикали ячейке (рамки абзаца Pages не рисует)
            const number = String(experience.length - companyIndex - 1).padStart(2, '0')
            const companyRows = content.map((cells, index): CellOptions[] => {
                const edge = { top: index === 0 ? 50 : 0, bottom: index === content.length - 1 ? 50 : 0 }
                const withEdge = cells.map((spec, cellIndex) => ({ ...spec, margins: {
                    ...spec.margins,
                    top: (spec.margins?.top ?? 0) + edge.top,
                    bottom: (spec.margins?.bottom ?? 0) + edge.bottom,
                    right: (spec.margins?.right ?? 0) + (cellIndex === cells.length - 1 ? 240 : 0),
                } }))
                return index === 0 ? [
                    cell({ width: numberCol, rowSpan: content.length, margins: { top: 70, left: 240, right: 200 }, children: [
                        para([run(number, { color: color.comment, size: SIZE.small })], { size: SIZE.small }),
                    ] }),
                    ...withEdge,
                ] : withEdge
            })
            children.push(table(columns, companyRows, { borders: { bottom: line() } }))
        })
    }

    const document = new Document({
        creator: config.head.author,
        title: summary.title,
        description: summary.description,
        // имена без пробелов — это имена файлов в word/fonts; в документ оба начертания подключаются одним семейством в fontTable ниже
        fonts: [
            { name: 'CascadiaCode-Regular', data: Buffer.from(regular.data as ArrayBuffer), characterSet: CharacterSet.ANSI },
            { name: 'CascadiaCode-Bold', data: Buffer.from(bold.data as ArrayBuffer), characterSet: CharacterSet.ANSI },
        ],
        styles: {
            default: { document: { run: { font: FONT, size: SIZE.small, color: color.value }, paragraph: { spacing: { before: 0, after: 0, line: LINE } } } },
            // Normal задаём явно: пустые абзацы, которые docx сам дописывает в ячейки-продолжения объединений (vMerge),
            // Pages/Quick Look рисуют по Normal — с его 12pt каждая строка таблицы раздувалась
            paragraphStyles: [{ id: 'Normal', name: 'Normal', run: { font: FONT, size: SIZE.small, color: color.value }, paragraph: { spacing: { before: 0, after: 0, line: LINE } } }],
        },
        sections: [{
            properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin } } },
            children,
        }],
    })

    setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    // docx кладёт шрифт в word/fonts, но не включает embedTrueTypeFonts — без флага Word и LibreOffice его игнорируют.
    // fontTable переписываем: одно семейство с обычным и жирным начертанием и моноширинная замена,
    // если программа встроенные шрифты не читает (Pages, Google Docs)
    const [regularKey, boldKey] = (document as any).FontTable.fontOptionsWithKey.map((font: { fontKey: string }) => font.fontKey)
    return Packer.toBuffer(document, false, [
        { path: 'word/settings.xml', data: SETTINGS_XML },
        { path: 'word/fontTable.xml', data: fontTableXml(regularKey, boldKey) },
    ])
}
