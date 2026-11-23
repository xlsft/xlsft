/**
 * Подключает ИИ-провайдеры (порядок и список — global.config.ts → ai.providers) и запускает периодическую
 * проверку доступности их моделей. Всё в фоне, чтобы не задерживать старт сервера: opencode нужен уже работающий /api/mcp.
 * Провайдер, который не поднялся (нет ключа, нет бинарника), остаётся неактивным — работают остальные.
 */
const factories: Record<string, () => AiProvider> = {
    deepseek: createDeepseekProvider,
    opencode: createOpencodeProvider,
}

export default defineNitroPlugin((nitro) => {
    const registry = useAiRegistry()
    const names = (useRuntimeConfig().public.config.ai.providers as string[]).filter(name => factories[name])
    const started: AiProvider[] = []

    void (async () => {
        await Promise.all(names.map(async (name) => {
            const provider = factories[name]!()
            try {
                await provider.start()
                registerAiProvider(provider)
                started.push(provider)
            } catch (error) {
                console.warn(`[ai] ${name} is unavailable:`, (error as Error)?.message)
                reportAiProviderError(name, error)
            }
        }))
        await registry.refresh()
    })()

    const timer = setInterval(() => void registry.refresh(), registry.recheckMs())
    timer.unref()
    nitro.hooks.hook('close', async () => {
        clearInterval(timer)
        await Promise.all(started.map(provider => provider.stop()))
    })
})
