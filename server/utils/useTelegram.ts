import { Bot } from 'grammy'
import { SocksProxyAgent as Proxy } from 'socks-proxy-agent'

export interface Telegram {
    bot?: Bot
    chat: number
}

export const useTelegram = (): Telegram => {
    const config = useRuntimeConfig().telegram
    const holder = globalThis as { __telegram?: Bot }
    if (!holder.__telegram && config.token.length) {
        const agent = config.proxy.length ? new Proxy(config.proxy) : undefined
        holder.__telegram = new Bot(config.token, { client: { baseFetchConfig: { agent, compress: true } } })
    }
    return { bot: holder.__telegram, chat: config.chat }
}
