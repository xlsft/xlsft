import * as z from 'zod'
import { Bot } from 'grammy'

import MessagesAdminRequest from '#server/bot/messages/admin/request'

export default defineEventHandler(async (event) => {

    const config = useRuntimeConfig().public.config

    if (!process.env.TG_TOKEN) throw createError({ status: 500, message: 'Telegram token is not set' })
    if (!config.requests.telegram) throw createError({ status: 500, message: 'Response user is not set' })

    const body = z.object({
        name: z.string('Name is required'),
        email: z.string('Email should be a string').optional(),
        phone: z.string('Phone should be a string').optional(),
        telegram: z.string('Telegram should be a string').optional(),
        description: z.string('Description should be a string').optional(),
        token: z.string('Captcha response is required')
    }).parse(await readBody(event))

    const captcha = useCaptcha()
    if (!body.token || !captcha.verify(body.token)) throw createError({ status: 400, message: 'Captcha token is invalid' })

    const bot = new Bot(process.env.TG_TOKEN)

    const message = await bot.api.sendMessage(config.requests.telegram, MessagesAdminRequest(body), { parse_mode: 'HTML' })
    
    return { message }
})