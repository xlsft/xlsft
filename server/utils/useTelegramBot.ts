import { Bot } from 'grammy'
import { SocksProxyAgent as Proxy } from 'socks-proxy-agent'

/** Один Telegram-бот на воркер: им пользуются заявки из AI-чата. */
export const useTelegramBot = () => {
    const cached = (globalThis as any).__tgBot as Bot | undefined
    if (cached) return cached
    if (!process.env.TG_TOKEN) return undefined
    const agent = process.env.SOCKS_PROXY ? new Proxy(process.env.SOCKS_PROXY) : undefined
    const bot = new Bot(process.env.TG_TOKEN, { client: { baseFetchConfig: { agent, compress: true } } })
    ;(globalThis as any).__tgBot = bot
    return bot
}
