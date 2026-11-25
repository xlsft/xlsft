import { createDeepSeek } from '@ai-sdk/deepseek'

export const useDeepseek = (): AiProvider => {
    const config = useRuntimeConfig().deepseek
    const apiKey = config.token
    let client: ReturnType<typeof createDeepSeek> | undefined

    return {
        id: 'deepseek',
        toolMode: 'native',

        async start() {
            if (!apiKey.length) throw new Error('NUXT_DEEPSEEK_TOKEN is not set')
            client = createDeepSeek({ apiKey, baseURL: config.url })
        },

        async listModels() {
            // каталог — бесплатный запрос; явный список можно задать через DEEPSEEK_MODELS
            const forced = config.models.split(',').map(id => id.trim()).filter(Boolean)
            if (forced.length) return forced
            const response = await fetch(`${config.url}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000) })
            if (!response.ok) throw new Error(`models: HTTP ${response.status}`)
            const { data } = await response.json() as { data?: { id: string }[] }
            const ids = (data ?? []).map(model => model.id)
            // для короткого диалога берём flash-модели: быстрые и дешёвые; если таких в каталоге нет — остальные, reasoner в конце
            const flash = ids.filter(id => /flash/i.test(id))
            return flash.length ? flash : ids.sort((a, b) => Number(/reasoner/.test(a)) - Number(/reasoner/.test(b)))
        },

        // probe намеренно нет: платный API не пингуем, доступность подтверждают живые ответы и фоллбек на opencode

        createModel(modelId) {
            if (!client) throw new Error('deepseek is not started')
            return client(modelId)
        },

        stop() { /* nothing runs between requests */ },
    }
}
