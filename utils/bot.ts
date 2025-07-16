import { Bot, type Context } from 'grammy'
import { type ConversationFlavor } from "@grammyjs/conversations";

export const token = useRuntimeConfig().tg_token
export const bot = new Bot<ConversationFlavor<Context>>(token)