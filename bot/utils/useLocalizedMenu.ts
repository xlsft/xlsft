import { InlineKeyboard, Keyboard, type Context } from "grammy";
import { useI18n } from "./useI18n";
import type { ExtendedContext } from "..";

export const useLocalizedMenu = (
    ctx: ExtendedContext, callback: 
    (options: { 
        ctx: ExtendedContext, 
        t: ReturnType<typeof useI18n>['t'], 
        locale: ReturnType<typeof useI18n>['locale'], 
        markup: InlineKeyboard 
    }) => InlineKeyboard
) => {
    const { t, locale } = useI18n(ctx)
    const keyboard = new InlineKeyboard(); callback({ ctx, t, markup: keyboard, locale })
    return keyboard
}


export const useLocalizedBottomMenu = (
    ctx: ExtendedContext, callback: 
    (options: { 
        ctx: ExtendedContext, 
        t: ReturnType<typeof useI18n>['t'], 
        locale: ReturnType<typeof useI18n>['locale'], 
        markup: Keyboard 
    }) => Keyboard
) => {
    const { t, locale } = useI18n(ctx)
    const keyboard = new Keyboard(); callback({ ctx, t, markup: keyboard, locale })
    return keyboard
}