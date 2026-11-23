import { createDeepSeek } from '@ai-sdk/deepseek'

/**
 * Провайдер DeepSeek Platform (платный API, дешёвый): основной для ассистента.
 * Нативный function calling, поэтому инструменты исполняем сами (useAssistantTools.ts).
 * Ключ — DEEPSEEK_PLATFORM_TOKEN; без него провайдер просто не включается.
 */

const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'

export const createDeepseekProvider = (): AiProvider => {
    const apiKey = process.env.DEEPSEEK_PLATFORM_TOKEN
    let client: ReturnType<typeof createDeepSeek> | undefined

    return {
        id: 'deepseek',
        toolMode: 'native',

        async start() {
            if (!apiKey) throw new Error('DEEPSEEK_PLATFORM_TOKEN is not set')
            client = createDeepSeek({ apiKey, baseURL: BASE_URL })
        },

        async listModels() {
            // каталог — бесплатный запрос; явный список можно задать через DEEPSEEK_MODELS
            const forced = process.env.DEEPSEEK_MODELS?.split(',').map(id => id.trim()).filter(Boolean)
            if (forced?.length) return forced
            const response = await fetch(`${BASE_URL}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000) })
            if (!response.ok) throw new Error(`models: HTTP ${response.status}`)
            const { data } = await response.json() as { data?: { id: string }[] }
            const ids = (data || []).map(model => model.id)
            // для короткого диалога берём flash-модели: быстрые и дешёвые; если таких в каталоге нет — остальные, reasoner в конце
            const flash = ids.filter(id => /flash/i.test(id))
            return flash.length ? flash : ids.sort((a, b) => Number(/reasoner/.test(a)) - Number(/reasoner/.test(b)))
        },

        // probe намеренно нет: платный API не пингуем, доступность подтверждают живые ответы и фоллбек на opencode

        createModel(modelId) {
            if (!client) throw new Error('deepseek is not started')
            return client(modelId)
        },

        stop() {},
    }
}
