import * as z from 'zod'
import { Bot } from 'grammy'
import { SocksProxyAgent as Proxy } from "socks-proxy-agent";

const agent = process.env.SOCKS_PROXY ? new Proxy(process.env.SOCKS_PROXY) : undefined
const bot = process.env.TG_TOKEN ? new Bot(process.env.TG_TOKEN, {
    client: { baseFetchConfig: { agent, compress: true } }
}) : undefined

const requestRateLimit = useRateLimit('request', 5, 60_000)

const bodySchema = z.object({
    name: z.string('Name is required'),
    email: z.string('Email should be a string').optional(),
    phone: z.string('Phone should be a string').optional(),
    telegram: z.string('Telegram should be a string').optional(),
    description: z.string('Description should be a string').optional(),
    token: z.string('Captcha response is required')
})

export default defineEventHandler(async (event) => {

    requestRateLimit(event)

    const config = useRuntimeConfig().public.config

    if (!bot) throw createError({ status: 500, message: 'Telegram token is not set' })
    if (!config.requests.telegram) throw createError({ status: 500, message: 'Response user is not set' })

    const body = await readValidatedBody(event, (body) => bodySchema.parse(body))

    const captcha = useCaptcha()
    if (!body.token || !await captcha.verify(body.token)) throw createError({ status: 400, message: 'Captcha token is invalid' })

    const message = await bot.api.sendMessage(config.requests.telegram, /*html*/`<strong>New Request! (${config.head.url})</strong>

<strong>Name</strong>: <code>${body.name || '-'}</code>
<strong>Email</strong>: <code>${body.email || '-'}</code>
<strong>Phone</strong>: <code>${body.phone || '-'}</code>
<strong>Telegram</strong>: <code>${body.telegram || '-'}</code>
<strong>Description</strong>: <blockquote>${body.description || '-'}</blockquote>`, { parse_mode: 'HTML' })

    return { message }
})
