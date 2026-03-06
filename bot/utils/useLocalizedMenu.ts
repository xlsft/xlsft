import { InlineKeyboard, type Context } from "grammy";
import { useI18n } from "./useI18n";

export const useLocalizedMenu = (
    ctx: Context, callback: 
    (options: { 
        ctx: Context, 
        t: ReturnType<typeof useI18n>['t'], 
        locale: ReturnType<typeof useI18n>['locale'], 
        markup: InlineKeyboard 
    }) => InlineKeyboard
) => {
    const { t, locale } = useI18n(ctx)
    const keyboard = new InlineKeyboard(); callback({ ctx, t, markup: keyboard, locale })
    return keyboard
}