export default defineNitroPlugin((nitro) => {
    const ai = useAi()
    const factories: Record<string, () => AiProvider> = { deepseek: useDeepseek, opencode: useOpencode }
    const names = ai.order().filter((name) => factories[name])
    const started: AiProvider[] = []

    void (async () => {
        await Promise.all(names.map(async (name) => {
            const provider = factories[name]!()
            try {
                await provider.start()
                ai.register(provider)
                started.push(provider)
            } catch (error) {
                console.warn(`[ai] ${name} is unavailable:`, (error as Error).message)
                ai.report(name, error)
            }
        }))
        await ai.refresh()
    })()

    const timer = setInterval(() => void ai.refresh(), ai.recheck())
    timer.unref()
    nitro.hooks.hook('close', async () => {
        clearInterval(timer)
        await Promise.all(started.map((provider) => provider.stop()))
    })
})
