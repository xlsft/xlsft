import { Bot, InlineKeyboard, Keyboard, type Context } from 'grammy'
import { type Conversation, type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";
import { bot } from '~/utils/bot';
import { form } from '~/utils/form';
import { ParseMode } from 'grammy/types';
import { db } from '../db/client';
import { TelegramAuthUser } from '../../types/telegram.types'
import { eq, or, sql } from 'drizzle-orm';
import { user } from '../db/schema/user.schema';

const options: { parse_mode: ParseMode, link_preview_options: Record<PropertyKey, boolean> } = { parse_mode: 'HTML', link_preview_options: { prefer_large_media: true, show_above_text: true } }

const main = async (ctx: Context) => {
    await ctx.reply(
        /*html*/`<a href="https://xlsft.ru/og_image.png">\u00A0</a>\n<b>👋 Привет!</b>\n\nХотите связаться со мной по любому вопросу? Отправьте ваши контактные данные, и я обязательно вернусь к вам с ответом!`, 
        { reply_markup: new InlineKeyboard().text('Заполнить форму', 'form').row().url('Перейти на сайт', 'https://xlsft.ru'), ...options }
    )
}

const login = async (ctx: Context) => { try {
    const [ _, uuid ] = ctx.match?.toString().split('--') as [string, string]
    const id = ctx.from?.id|| -1
    const name = `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim().slice(0, 64)
    const exists = (await db.select().from(user).where(or(eq(user.uuid, uuid), eq(user.id, id)))).at(0)
    ctx.reply(`✅ Вы успешно авторизованны`)
    if (!exists) return await db.insert(user).values({
        uuid, id, name
    }).returning(); else {
        const updated = (await db.update(user).set({ name, uuid, id }).where(or(eq(user.uuid, uuid), eq(user.id, id))).returning()).at(0)
        return updated
    }
} catch (e) { ctx.reply(`⛔ Ошибка авторизации`); console.error(e) } }

const list = async (ctx: Context) => {
    if (ctx.from?.id !== Number(useRuntimeConfig().tg_user)) return
    await ctx.reply('Список всех заявок', { reply_markup: new InlineKeyboard().url('Открыть', `https://xlsft.ru/api/list?token=${useRuntimeConfig().tg_token}`)})
}

const conversation = async (conversation: Conversation, ctx: Context) => { try {
    const keyboards = [
        new Keyboard().placeholder('Как к вам можно обращаться?').text(ctx.from?.first_name || 'Анонимно').resized().oneTime(),
        new Keyboard().placeholder('Напишите сюда любую информацию которую вы считаете интересной)').oneTime(),
        new Keyboard().placeholder('Введите любой удобный вам способ обратной связи').requestContact('Отправить контакт').resized().oneTime()
    ]
    const errors = [
        (ctx: Context) => { ctx.react('😡'); ctx.reply('Нужно отправить ваше имя, ничего другого)\nПопробуйте еще раз!') },
        (ctx: Context) => { ctx.react('😡'); ctx.reply('Интересно) Но было бы интересней послушать о вас и(или) о вашей компании.\nПопробуйте еще раз!') },
        (ctx: Context) => { ctx.react('😡'); ctx.reply('Кажется с помощью этого я не смогу с вами связаться.\nПопробуйте еще раз!') },
    ]
    await ctx.reply(/*html*/`<b>🎯 Начнем!</b>\n\nНазвание вашей компании или ваше имя:`, { reply_markup: keyboards[0], ...options });
    const name = (await conversation.waitFor("message:text", { otherwise: errors[0] }))
    await name.react('❤')
    await ctx.reply(/*html*/`<b>😊 Приятно познакомиться, ${name.message.text}, продолжим</b>\n\nРасскажите о компании или о себе:`, { reply_markup: keyboards[1], ...options });
    const description = await conversation.waitFor("message:text", { otherwise: errors[1] })
    await description.react('👀')
    await ctx.reply(/*html*/`<b>📞 Интересно..., и последнее</b>\n\nКонтакт(ы) для обратной связи:`, { reply_markup: keyboards[2], ...options })
    const checkpoint = conversation.checkpoint();
    const contact = await conversation.waitFor('message')
    if (!contact.has(':contact') || !contact.has(':text')) conversation.rewind(checkpoint)
    await contact.react('👀')
    await conversation.external(() => form({ 
        name: name.message.text, 
        description: description.message.text, 
        contact: contact.message.contact ? `<contact/>${JSON.stringify(contact.message.contact)}` : (contact.message.text || 'Нет контакта')
    }, 'TG'))
    await ctx.reply(/*html*/`<b>🎉 Круто! Спасибо за уделенное время!</b>\n\nЯ уже получил вашу заявку, и скоро с вами свяжусь)\nВозвращаю вас в главное меню!`, { ...options })
    await conversation.external(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        main(ctx)
    })
} catch (e) { console.error(e) } }


export default defineNitroPlugin(() => {
    console.log(`Nitro preset: `, process.env.NITRO_PRESET)
    if (process.env.NITRO_PRESET) return
    bot.use(conversations())
    bot.use(createConversation(conversation, 'form'))
    bot.command('start', (ctx) => {
        const type = ctx.match
        if (!type) main(ctx)
        else if (type.startsWith('start')) main(ctx)
        else if (type.startsWith('login')) login(ctx) 
        else main(ctx)
    })
    bot.command('form', async (ctx) => await ctx.conversation.enter("form"))
    bot.command('list', list)
    bot.callbackQuery("form", async (ctx) => await ctx.conversation.enter("form"))
    
    bot.start()
})
