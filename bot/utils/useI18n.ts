import type { ExtendedContext } from '..';
import config from '../../global.config'
import locales from '../../i18n/locales/index'
import type { User } from "grammy/types";

declare global {
    var __locales: Record<User['id'], 'en' | 'ru'>
}

const localesFlags = {
    ru: '🇷🇺',
    en: '🇺🇸'
}

export const useI18n = (ctx: ExtendedContext) => { globalThis.__locales ||= {}

    let code = globalThis.__locales[ctx.from?.id || 0] || ctx.from?.language_code as 'en' || 'ru'; 
    if (!config.globals.locales.includes(code)) code = 'en'
    if (!globalThis.__locales[ctx.from?.id || 0]) globalThis.__locales[ctx.from?.id || 0] = code
    return {
        t: locales[code],
        locale: code,
        flag: localesFlags[code],
        setLocale: (code: 'en' | 'ru') => globalThis.__locales[ctx.from?.id || 0] = code
    }
}

export { locales }