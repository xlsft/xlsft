import { Bot, type Context } from 'grammy'

export const token = useRuntimeConfig().tg_token
export const bot = new Bot(token)