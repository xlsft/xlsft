import { useI18n } from "./useI18n"
import { bot, commands, type ExtendedContext } from ".."
import type { Message } from "grammy/types"

export const defineAction = (
    name: string, callback: 
    (options: { 
        ctx: ExtendedContext, 
        t: ReturnType<typeof useI18n>['t'], 
        locale: ReturnType<typeof useI18n>['locale'], 
        setLocale: ReturnType<typeof useI18n>['setLocale'],
        id: Message['chat']['id'],
    }) => Promise<void>
) => {
    const action = async (ctx: ExtendedContext) => { try {
        const { t, locale, setLocale } = useI18n(ctx)
        const id = ctx.callbackQuery?.message?.message_id!
        await callback({ ctx, t, locale, id, setLocale })
    } catch (error) { console.error(error); commands.start(ctx) } }

    bot.callbackQuery(`action:${name}`, action)
    
    return action
} 