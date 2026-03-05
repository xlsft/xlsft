import type { Context } from "grammy";
import config from '../../global.config'
import locales from '../../i18n/locales/index'

export const useI18n = (ctx: Context) => {
    let code: 'en' | 'ru' = ctx.from?.language_code as 'en' || 'ru'; if (!config.globals.locales.includes(code)) code = 'en'

    return {
        t: locales[code],
        locale: code
    }
}