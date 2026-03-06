import { Bot, InlineKeyboard, type Context } from 'grammy'
import { conversations, createConversation, type ConversationFlavor } from "@grammyjs/conversations";
import { useSanity } from './utils/useSanity';
import { locales, useI18n } from './utils/useI18n';
import { convert } from 'telegram-markdown-v2';
import config from '../global.config'
import { useLocalizedMenu } from './utils/useLocalizedMenu';
import { defineSection } from './utils/defineSection';

export const bot = new Bot<ConversationFlavor<Context>>(process.env.TG_TOKEN!); bot.use(conversations())
export const sanity = useSanity()

export const commands = {
    start: async (ctx: Context) => {
        const { locale } = useI18n(ctx)
        const data = await sanity.fetch<{ image: string, content: string, skills: { type: string, items: { name: string, priority: number }[] }[] }>(`*[_type == "summary"]{
            "image": image.asset->url, 
            "content": content[$locale],
            "skills": array::unique(*[_type == "skill"] | order(type asc) { "type": type })[]{
                "type": type,
                "items": *[_type == "skill" && type == ^.type] | order(name asc){
                    name,
                    priority
                }
            },
        }[0]`, { locale })

        ctx.react('🤝')
        ctx.replyWithPhoto(data.image, { 
            caption: convert(`${data.content.replaceAll(/^::.*$/gm, '')}\n${
                Object.entries(Object.fromEntries(data.skills.map((group) => [
                    group.type, 
                    group.items.sort((a, b) => b.priority - a.priority)
                ])))
                .sort(([, aItems], [, bItems]) => bItems.length - aItems.length)
                .map(([label, items]) => `* **${label}**: __${items.sort((a, b) => b.priority - a.priority).map(v => v.name).join(', ')}__`)
                .join('\n')
            }`),
            reply_markup: useLocalizedMenu(ctx, ({ markup, t }) => markup
                .text(t.sections.experience, `section:experience`)
                .text(t.sections.education, `section:education`).row()
                .text(t.sections.projects, `section:projects`)
                .text(t.labels.contact_me, `section:contact`).row()
                .url(t.labels.more_about, config.head.url).primary()
            ), 
            parse_mode: 'MarkdownV2' 
        })
    }
}

export const sections = {
    experience: defineSection('experience', async ({ ctx, locale }) => {
        const data = await sanity.fetch<{ }[]>(`*[_type == "experience"]{
            id, link,
            "name": name[$locale],
            "logo": logo.dark.asset->url,
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
        } | order(positions[0].duration.from desc)`, { locale })
        ctx.editMessageCaption({
            caption: JSON.stringify(data)
        })
    })
}

bot.command('start', commands.start)


// bot.callbackQuery('section:education', async (ctx) => {
//     const { locale } = useI18n(ctx)
//     const data = await sanity.fetch<{ }[]>(`*[_type == "experience"]{
//         id, link,
//         "name": name[$locale],
//         "logo": logo.dark.asset->url,
//         "about": about[$locale],
//         "positions": positions[]{
//             "name": name[$locale],
//             "description": description[$locale],
//             "skills": skills[]->{
//                 name, type, color, priority
//             } | order(priority desc),
//             duration,
//         } | order(duration.from desc),
//         "footer": footer[$locale],
//     } | order(positions[0].duration.from desc)`, { locale })

//     ctx.reply(JSON.stringify(data))
// })

// bot.callbackQuery('section:projects', async (ctx) => {
//     const { locale } = useI18n(ctx)
//     const data = await sanity.fetch<{ }[]>(``, { locale })
// })
// const projects = await sanity.fetch<string[]>(`*[_type == "project"].id`); projects.forEach((id) => 
// bot.callbackQuery(`section:projects:${id}`, async (ctx) => {
//     const { locale } = useI18n(ctx)
//     const data = await sanity.fetch<{ }[]>(``, { locale })
// }))

// bot.callbackQuery('section:contact', async (ctx) => {
//     const { locale } = useI18n(ctx)
//     const data = await sanity.fetch<{ }[]>(`{
//         "links": {
//             "hh": *[_type == "link" && id == "hh"][0] { "label": label[$locale], to },
//             "github": *[_type == "link" && id == "github"][0] { "label": label[$locale], to },
//             "linkedin": *[_type == "link" && id == "linkedin"][0] { "label": label[$locale], to },
//         },
//     }`, { locale })
// })


bot.start()