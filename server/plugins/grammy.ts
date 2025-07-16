import { Bot, InlineKeyboard, Keyboard, type Context } from 'grammy'
import { type Conversation, type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";
import { bot } from '~/utils/bot';
import { form } from '~/utils/form';
import { ParseMode } from 'grammy/types';

const options: { parse_mode: ParseMode, link_preview_options: Record<PropertyKey, boolean> } = { parse_mode: 'HTML', link_preview_options: { prefer_large_media: true, show_above_text: true } }

const main = async (ctx: Context) => {
    await ctx.reply(
        `<a href="https://xlsft.ru/og_image.png">\u00A0</a>\n<b>👋 Привет!</b>\n\nХотите связаться со мной по любому вопросу? Отправьте ваши контактные данные, и я обязательно вернусь к вам с ответом!`, 
        { reply_markup: new InlineKeyboard().text('Заполнить форму', 'form').row().url('Перейти на сайт', 'https://xlsft.ru'), ...options }
    )
}

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
    await ctx.reply(`<b>🎯 Начнем!</b>\n\nНазвание вашей компании или ваше имя:`, { reply_markup: keyboards[0], ...options });
    const name = (await conversation.waitFor("message:text", { otherwise: errors[0] }))
    await name.react('❤')
    await ctx.reply(`<b>😊 Приятно познакомиться, ${name.message.text}, продолжим</b>\n\nРасскажите о компании или о себе:`, { reply_markup: keyboards[1], ...options });
    const description = await conversation.waitFor("message:text", { otherwise: errors[1] })
    await description.react('👀')
    await ctx.reply(`<b>📞 Интересно..., и последнее</b>\n\nКонтакт(ы) для обратной связи:`, { reply_markup: keyboards[2], ...options })
    const checkpoint = conversation.checkpoint();
    const contact = await conversation.waitFor('message')
    if (!contact.has(':contact') || !contact.has(':text')) conversation.rewind(checkpoint)
    await contact.react('👀')
    await conversation.external(() => form({ 
        name: name.message.text, 
        description: description.message.text, 
        contact: contact.message.contact ? `<contact/>${JSON.stringify(contact.message.contact)}` : (contact.message.text || 'Нет контакта')
    }, 'TG'))
    await ctx.reply(`<b>🎉 Круто! Спасибо за уделенное время!</b>\n\nЯ уже получил вашу заявку, и скоро с вами свяжусь)\nВозвращаю вас в главное меню!`, { ...options })
    await conversation.external(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        main(ctx)
    })
} catch (e) { console.log(e) } }


export default defineNitroPlugin(() => {
    bot.use(conversations())
    bot.use(createConversation(conversation, 'form'))
    bot.command('start', main)
    bot.command('form', async (ctx) => await ctx.conversation.enter("form"))
    bot.command('list', list)
    bot.callbackQuery("form", async (ctx) => await ctx.conversation.enter("form"))
    
    bot.start()
})
