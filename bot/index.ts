import { Bot, type Context } from 'grammy'
import { conversations, createConversation, type ConversationFlavor } from "@grammyjs/conversations";
import { Menu } from "@grammyjs/menu";

export const bot = new Bot<ConversationFlavor<Context>>(process.env.TG_TOKEN!)

bot.use(conversations())

const menu = new Menu('index')
    .text('A', (ctx) => ctx.reply("You pressed A!")).row()
    .text("B", (ctx) => ctx.reply("You pressed B!"));
bot.on('message', async (ctx) => {
    console.log(ctx.from?.language_code)
})

bot.start()