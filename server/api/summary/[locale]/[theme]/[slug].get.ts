import { tws } from 'tailwind-to-style'
import locales from '~~/i18n/locales/index'

import MarkdownIt from 'markdown-it'
import MarkdownItMDCPlugin from 'markdown-it-mdc'

const md = new MarkdownIt().use(MarkdownItMDCPlugin)

export function tw(strings: TemplateStringsArray, ...values: any[]) {
    const str = strings.reduce((acc, s, i) => acc + s + (values[i] || ''), '')
    return tws(str)
}

export default defineEventHandler(async (event) => {

    const config = useRuntimeConfig().public.config
    const [ locale, theme ] = [
        getRouterParam(event, 'locale'), 
        getRouterParam(event, 'theme')
    ]
    if (!locale || !config.globals.locales.includes(locale)) return createError({ status: 400, message: 'Locale is undefined' })
    if (!theme || !config.globals.themes.includes(theme)) return createError({ status: 400, message: 'Theme is undefined' })

    const client = useSanity()
    const data = await client.fetch<Pick<IndexQuery & SeoQuery, 'summary' | 'skills' | 'experience' | 'seo'>>(groq`{
        "summary": *[_type == "summary"][0]{ 
            "title": title[$locale], 
            "description": description[$locale], 
            "content": content[$locale], 
            "image": image.asset->url,
            "status": status[$locale], 
        },
        "skills": array::unique(*[_type == "skill"] | order(type asc) { "type": type })[]{
            "type": type,
            "items": *[_type == "skill" && type == ^.type] | order(name asc){
                name,
                color,
                priority
            }
        },
        "experience": *[_type == "experience"]{
            id, link,
            "name": name[$locale],
            "logo": logo[$theme].asset->url,
            "about": about[$locale],
            "positions": positions[]{
                "name": name[$locale],
                "description": description[$locale],
                "skills": skills[]->{
                    name, type, color, priority
                } | order(priority desc),
                duration,
            } | order(duration.from desc),
            "footer": footer[$locale],
        } | order(positions[0].duration.from desc),
        "seo": *[_type == "summary"][0]{
            "title": title[$locale],
            "description": description[$locale]
        }, 
    }`, { locale, theme })

    const vars = {
        background: config.theme.background[theme as keyof typeof config.theme.background],
        borderColor: config.theme.border[theme as keyof typeof config.theme.border],
        color: config.theme.font[theme as keyof typeof config.theme.font],
        accent: config.theme.accent
    }

    const style = /*css*/`
        * {
            border-color: ${vars.borderColor};
            outline-color: ${vars.borderColor};
            color: ${vars.color}
        }

        #summary div[endpoint] {
            display: flex;
            padding: 16px;
            border: 1px solid ${vars.borderColor};
            opacity: 50%;
        }
    `

    return useSatori(event, /*html*/`<style>${style}</style>
        <div style="${tw`flex flex-col w-full h-full border relative`}">
            <div style="${tw`flex w-full h-24 border-b overflow-hidden`}">
                <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="tile-lines-in-motion" patternUnits="userSpaceOnUse" width="120" height="120">
                            <path d="M9 0h2v20H9V0zm25.134.84l1.732 1-10 17.32-1.732-1 10-17.32zm-20 20l1.732 1-10 17.32-1.732-1 10-17.32zM58.16 4.134l1 1.732-17.32 10-1-1.732 17.32-10zm-40 40l1 1.732-17.32 10-1-1.732 17.32-10zM80 9v2H60V9h20zM20 69v2H0v-2h20zm79.32-55l-1 1.732-17.32-10L82 4l17.32 10zm-80 80l-1 1.732-17.32-10L2 84l17.32 10zm96.546-75.84l-1.732 1-10-17.32 1.732-1 10 17.32zm-100 100l-1.732 1-10-17.32 1.732-1 10 17.32zM38.16 24.134l1 1.732-17.32 10-1-1.732 17.32-10zM60 29v2H40v-2h20zm19.32 5l-1 1.732-17.32-10L62 24l17.32 10zm16.546 4.16l-1.732 1-10-17.32 1.732-1 10 17.32zM111 40h-2V20h2v20zm3.134.84l1.732 1-10 17.32-1.732-1 10-17.32zM40 49v2H20v-2h20zm19.32 5l-1 1.732-17.32-10L42 44l17.32 10zm16.546 4.16l-1.732 1-10-17.32 1.732-1 10 17.32zM91 60h-2V40h2v20zm3.134.84l1.732 1-10 17.32-1.732-1 10-17.32zm24.026 3.294l1 1.732-17.32 10-1-1.732 17.32-10zM39.32 74l-1 1.732-17.32-10L22 64l17.32 10zm16.546 4.16l-1.732 1-10-17.32 1.732-1 10 17.32zM71 80h-2V60h2v20zm3.134.84l1.732 1-10 17.32-1.732-1 10-17.32zm24.026 3.294l1 1.732-17.32 10-1-1.732 17.32-10zM120 89v2h-20v-2h20zm-84.134 9.16l-1.732 1-10-17.32 1.732-1 10 17.32zM51 100h-2V80h2v20zm3.134.84l1.732 1-10 17.32-1.732-1 10-17.32zm24.026 3.294l1 1.732-17.32 10-1-1.732 17.32-10zM100 109v2H80v-2h20zm19.32 5l-1 1.732-17.32-10 1-1.732 17.32 10zM31 120h-2v-20h2v20z" fill="${vars.accent}" fill-opacity="1" fill-rule="evenodd"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#tile-lines-in-motion)" />
                </svg>
            </div>
            <div style="${tw`flex gap-8 p-8 w-full items-start justify-between`}">
                <div id="summary" style="${tw`gap-2 flex flex-col grow max-w-[60%]`}">
                    ${md.render(data.summary.content).replaceAll('response-block', 'div')}
                    <div style="${tw`flex flex-col gap-1`}">
                        ${Object.entries(Object.fromEntries(data.skills.map((group) => [
                            group.type, 
                            group.items.sort((a, b) => b.priority - a.priority)
                        ]))).sort(([, aItems], [, bItems]) => bItems.length - aItems.length).map(([label, items]) => /*html*/`
                            <div style="${tw`flex flex-wrap gap-2 items-center`}; order:-${items.map((v: any) => v.name).join('').length}">
                                <span style="${tw`text-xs opacity-50 w-full`}">${label}</span>
                                ${items.map(item => /*html*/`
                                    <span style="${tw`font-bold flex items-center text-xs px-2 py-1 gap-1 !bg-[${item.color}]/50 border !border-[${item.color}]`}">
                                        ${item.name}
                                    </span>
                                `.trim()).join('\n')}
                            </div>
                        `).join('\n')}
                    </div>
                </div>
                <img src="${data.summary.image}" style="${tw`w-[30%]`}">
            </div>
            <div style="${tw`font-bold flex items-center text-nowrap px-3 py-2 text-base gap-2 text-[${vars.color}] bg-[${vars.accent}] w-fit absolute bottom-8 right-8`}">
                ${locales[locale as keyof typeof locales].labels.contact_me}
            </div>
        </div>
    `)
})