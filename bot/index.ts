import { Bot, InputFile, type Context } from 'grammy'
import { Conversation, conversations, createConversation, type ConversationFlavor } from "@grammyjs/conversations";
import { useSanity } from './utils/useSanity';
import { useI18n } from './utils/useI18n';
import config from '../global.config'
import { useLocalizedBottomMenu, useLocalizedMenu } from './utils/useLocalizedMenu';
import { defineSection } from './utils/defineSection';
import { defineAction } from './utils/defineAction';
import { defineEventResponse } from './utils/defineEventResponse';
import { useExperience } from './utils/useExperience';
import { convert } from 'telegram-markdown-v2';

export type ExtendedContext = ConversationFlavor<Context>

export const bot = new Bot<ExtendedContext>(process.env.TG_TOKEN!); bot.use(conversations())
export const sanity = useSanity()

bot.use(createConversation(async (conversation: Conversation, ctx: Context) => { try {
    if (!ctx.from?.id) await conversation.halt()

    const { t } = useI18n(ctx as ExtendedContext)
    const keyboards = {
        name: useLocalizedBottomMenu(ctx as ExtendedContext, ({ t, markup }) => markup
            .placeholder(t.form.name.label).text(ctx.from?.first_name || 'Анонимно').resized().oneTime(),
        ),
        description: useLocalizedBottomMenu(ctx as ExtendedContext, ({ t, markup }) => markup
            .placeholder(t.form.description.label).oneTime(),
        ),
        contact: useLocalizedBottomMenu(ctx as ExtendedContext, ({ t, markup }) => markup
            .placeholder(t.form.contact.label).requestContact(t.form.contact.button).resized().oneTime(),
        ),
    }
    const otherwise = (ctx: Context) => { ctx.reply(t.form.errors.something_wrong) }

    await ctx.reply(convert(t.form.name.label), { reply_markup: keyboards.name, parse_mode: 'MarkdownV2' });
    const name = (await conversation.waitFor("message:text", { otherwise }))
    
    await ctx.reply(convert(t.form.description.label), { reply_markup: keyboards.description, parse_mode: 'MarkdownV2' });
    const description = await conversation.waitFor("message:text", { otherwise })
    
    await ctx.reply(convert(t.form.contact.label), { reply_markup: keyboards.contact, parse_mode: 'MarkdownV2' })
    const checkpoint = conversation.checkpoint();
    const contact = await conversation.waitFor('message')
    if (!contact.has(':contact') || !contact.has(':text')) conversation.rewind(checkpoint)

    await conversation.external(async () => {
        const me = await bot.api.getMe()
        await bot.api.sendMessage(config.requests.telegram, convert(
            `# New Request! (@${me.username})\n\n**Name**: \`${name.message.text}\`\n**Description**: \`${description.message.text}\``
        ), { parse_mode: 'MarkdownV2' })
        if (contact.message.contact) await bot.api.sendContact(
            config.requests.telegram, 
            contact.message.contact.phone_number, 
            contact.message.contact.first_name
        ); else if (contact.message.text) await bot.api.sendMessage(config.requests.telegram, convert(
            `**Contact**: \`${contact.message.text || 'No contact sent'}\``
        ), { parse_mode: 'MarkdownV2' })
    })
    
    await ctx.reply(convert(t.form.success), { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } })
    await conversation.external(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        commands.start(ctx as ExtendedContext)
    })
} catch (e) { console.error(e) } }, 'contact'))


export const photo = (await (async () => {
    const url = await sanity.fetch<string>(`*[_type == "summary"].image.asset->url`)
    const request = await fetch(url)
    const data = new Uint8Array(await request.arrayBuffer())
    return new InputFile(data)
})())

export const commands = {
    start: async (ctx: ExtendedContext) => {
        const { locale, flag } = useI18n(ctx)
        const data = await sanity.fetch<{ image: string, content: string, skills: { type: string, items: { name: string, priority: number }[] }[] }>(`
        *[_type == "summary"]{
            "content": content[$locale],
            "skills": array::unique(*[_type == "skill"] | order(type asc) { "type": type })[]{
                "type": type,
                "items": *[_type == "skill" && type == ^.type] | order(name asc){
                    name,
                    priority
                }
            },
        }[0]`, { locale })

        defineEventResponse(ctx, `${data.content.replaceAll(/^::.*$/gm, '')}\n${
            Object.entries(Object.fromEntries(data.skills.map((group) => [
                group.type, 
                group.items.sort((a, b) => b.priority - a.priority)
            ])))
            .sort(([, aItems], [, bItems]) => bItems.length - aItems.length)
            .map(([label, items]) => `* **${label}**: __${items.sort((a, b) => b.priority - a.priority).map(v => v.name).join(', ')}__`)
            .join('\n')
        }`, { 
            reply_markup: useLocalizedMenu(ctx, ({ markup, t }) => markup
                .text(t.sections.experience, `section:experience`)
                .text(t.sections.education, `section:education`).row()
                .text(t.sections.projects, `section:project`)
                .text(t.labels.contact_me, `action:contact`).row()
                .url(t.labels.more_about, config.head.url).primary().row()
                .text(`${t.labels.current_locale}: ${flag}`, 'action:localeSwitch')
            )
        })
    }
}

export const actions = {
    localeSwitch: defineAction('localeSwitch', async ({ ctx, locale, setLocale }) => {
        if (locale === 'en') setLocale('ru')
        else if (locale === 'ru') setLocale('en')
        commands.start(ctx)
    }),
    back: defineAction('back', async ({ ctx }) => commands.start(ctx)),
    backExperience: defineAction('back:experience', async ({ ctx }) => sections.experience(ctx)),
    backProject: defineAction('back:project', async ({ ctx }) => sections.project(ctx)),
    contact: defineAction('contact', async ({ ctx }) => await ctx.conversation.enter("contact"))
}

export const sections = {
    experience: defineSection('experience', async ({ ctx, locale, t }) => {
        const data = await sanity.fetch<{ id: string, link: string, name: string, positions: { duration: { from: string, to?: string } }[] }[]>(`
        *[_type == "experience"]{
            id, link,
            "name": name[$locale],
            "positions": positions[]{
                duration,
            } | order(duration.from desc)
        } | order(positions[0].duration.from desc)`, { locale })

        defineEventResponse(ctx, ` **${t.labels.total_positions_duration}:** __${useExperience(ctx, 
            data.at(-1)?.positions.at(-1)?.duration.from!,
            data.at(0)?.positions.at(0)?.duration.to
        ).duration()}__`, {
            reply_markup: useLocalizedMenu(ctx, ({ markup, t }) => {
                data.forEach((item) => {
                    markup.text(`${item.name} (${useExperience(ctx, 
                        item.positions.at(-1)?.duration.from!,
                        item.positions[0]?.duration.to,
                    ).duration()})`, `section:experience:${item.id}`).row()
                })
                markup.text(t.labels.back, 'action:back').danger()
                return markup
            })
        })
    }),
    project: defineSection('project', async ({ ctx, locale, t }) => {
        const data = await sanity.fetch<{ id: string, priority: number, name: string  }[]>(`
        *[_type == "project"] {
            id, priority,
            "name": name[$locale],
        } | order(priority desc)`, { locale })


        defineEventResponse(ctx, `# ${t.sections.projects}`, {
            reply_markup: useLocalizedMenu(ctx, ({ markup, t }) => {
                data.forEach((item) => {
                    markup.url(`${item.name}`, `${config.head.url}/projects/${item.id}`).row()
                })

                markup.text(t.labels.back, 'action:back').danger()
                return markup
            })
        })
    }),
    education: defineSection('education', async ({ ctx, locale, t }) => {
        const data = await sanity.fetch<{ id: string, year: number, level: string, specialization: string, name: string, faculty: string  }[]>(`
        *[_type == "education"] {
            id, year,
            "level": level[$locale],
            "specialization": specialization[$locale],
            "name": name[$locale],
            "faculty": faculty[$locale],
        } | order(year desc)`, { locale })


        defineEventResponse(ctx, `# ${t.sections.education}
            
        ${data.map(education => `
            ${education.name} __/ ${education.faculty} / ${education.year}__
            ${education.level}, ${education.specialization}
        `.trim()).join('\n\n')}
        `, {
            reply_markup: useLocalizedMenu(ctx, ({ markup, t }) => {
                markup.text(t.labels.back, 'action:back').danger()
                return markup
            })
        })
    }),
}

const experiences = await sanity.fetch<string[]>(`*[_type == "experience"].id`); experiences.forEach((id) => 
defineSection(`experience:${id}`, async ({ ctx, locale, t }) => {
    const data = await sanity.fetch<{
        link: string, about: string, name: string,
        positions: { 
            name: string, description: string, 
            duration: { from: string, to?: string },
            skills: { name: string, type: string, priority: number }[]
        }[]
    }>(`
    *[_type == "experience" && id == $id]{
        link,
        "about": aboutShort[$locale],
        "name": name[$locale],
        "positions": positions[]{
            "name": name[$locale],
            "description": descriptionShort[$locale],
            "skills": skills[]->{
                name, type, priority
            } | order(priority desc),
            duration,
        } | order(duration.from desc)
    }[0]`, { locale, id })
    defineEventResponse(ctx, `
        # ${data.name}
        ${data.positions.map(position => `
            ${position.name} __/ ${useExperience(ctx, position.duration.from, position.duration.to).period()}__
            
            ${position.description}
        `.trim()).join('\n\n')}
    `, {
        reply_markup: useLocalizedMenu(ctx, ({ markup, t }) => markup
            .url(data.link, data.link).row()
            .url(t.labels.more_about, config.head.url)
            .text(t.labels.back, 'action:back:experience').danger().row()
        )
    })
}))

bot.command('start', commands.start)
bot.command('contact', actions.contact)

bot.start()