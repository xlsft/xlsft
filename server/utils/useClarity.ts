import { createClient, type Client } from '@crumbleerp/clarity'

/**
 * Серверный аналог useClarity: модуль регистрирует composable только
 * для app-контекста, поэтому в server/ создаём клиент из runtimeConfig.
 * Клиент — лёгкий держатель конфига, мемоизируем на воркер.
 */
export const useClarity = (): Client => {
    const cached = (globalThis as any).__clarityClient as Client | undefined
    if (cached) return cached

    const config = useRuntimeConfig()
    const client = createClient({
        ...(config.public.clarity as object),
        token: (config.clarity as any)?.token
    })
    ;(globalThis as any).__clarityClient = client
    return client
}
