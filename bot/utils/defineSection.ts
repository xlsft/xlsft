import type { Context } from "grammy"
import { useI18n } from "./useI18n"
import { bot, commands } from ".."
import type { Message } from "grammy/types"

export const defineSection = (
    name: string, callback: 
    (options: { 
        ctx: Context, 
        t: ReturnType<typeof useI18n>['t'], 
        locale: ReturnType<typeof useI18n>['locale'], 
        id: Message['chat']['id']
    }) => Promise<void>
) => {
    const section = async (ctx: Context) => { try {
        const { t, locale } = useI18n(ctx)
        const id = ctx.message?.chat.id!
        if (!ctx.message?.chat.id) throw new Error(`Old message ${id} not found`)
        await callback({ ctx, t, locale, id })
    } catch (error) { console.error(error); commands.start(ctx) } }

    bot.callbackQuery(`section:${name}`, section)
    
    return section
} 