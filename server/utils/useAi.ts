import type { LanguageModel } from 'ai'

export interface AiModelContext { system: string }

export interface AiProvider {
    id: string
    /** native — инструменты исполняем мы (AI SDK tools); mcp — провайдер ходит в наш MCP-сервер сам. */
    toolMode: 'native' | 'mcp'
    /** Поднять всё нужное провайдеру (процессы, клиенты). Бросает, если провайдер недоступен. */
    start(): Promise<void>
    /** Кандидаты в модели — id в рамках провайдера. */
    listModels(): Promise<string[]>
    /** Проверка рабочей модели; бросает, если модель непригодна для ассистента. Не нужна провайдерам, у которых каждый запрос стоит денег: их проверяют живые ответы. */
    probe?(modelId: string): Promise<void>
    createModel(modelId: string, context: AiModelContext): LanguageModel
    stop(): Promise<void> | void
}

export interface AiModelState {
    provider: string
    id: string
    ok: boolean
    /** Модель хоть раз реально ответила (пробой или живым запросом). */
    verified: boolean
    latencyMs?: number
    checkedAt: number
    failures: number
    error?: string
    /** После сбоя модель не трогаем до этого момента. */
    retryAt?: number
}

interface RegistryStore { providers: Map<string, AiProvider>, models: Map<string, AiModelState>, refreshing?: Promise<void>, lastRefresh: number, cooldowns: Map<string, number>, startErrors: Map<string, string> }

// на воркер; HMR в dev не должен плодить процессы
const store: RegistryStore = ((globalThis as any).__aiRegistry ??= { providers: new Map(), models: new Map(), lastRefresh: 0, cooldowns: new Map(), startErrors: new Map() })

// каждая проверка — настоящий запрос к модели и тратит бесплатный лимит, поэтому проверяем скупо:
// каталог читаем всегда (он бесплатный), а «пингуем» не больше одной модели за цикл
const FAIL_COOLDOWN_MS = 10 * 60_000
const QUOTA_COOLDOWN_MS = 60 * 60_000
const isQuotaError = (error: unknown) => /quota|usage limit|rate.?limit|429/i.test(String((error as Error)?.message ?? error))

const keyOf = (provider: string, id: string) => `${provider}/${id}`

export interface Ai {
    register: (provider: AiProvider) => void
    report: (id: string, error: unknown) => void
    refresh: () => Promise<void>
    candidates: () => Promise<{ provider: AiProvider, id: string }[]>
    success: (provider: string, id: string) => void
    failure: (provider: string, id: string, error: unknown) => void
    status: () => {
        lastRefresh: number
        refreshing: boolean
        cooldowns: Record<string, number>
        providers: string[]
        startErrors: Record<string, string>
        models: AiModelState[]
    }
    recheck: () => number
    order: () => string[]
}

export const useAi = (): Ai => {
    const config = useRuntimeConfig()
    const recheck = (): number => config.ai.recheck * 60_000
    const order = (): string[] => config.ai.providers
    const register = (provider: AiProvider): void => { store.providers.set(provider.id, provider); store.startErrors.delete(provider.id) }
    const report = (id: string, error: unknown): void => { store.startErrors.set(id, String((error as Error)?.message ?? error)) }

    const paused = (providerId: string) => Date.now() < (store.cooldowns.get(providerId) ?? 0)
    const eligible = (state: AiModelState) => !paused(state.provider) && (state.ok || (state.retryAt ?? 0) <= Date.now())
    /** Лучшие кандидаты: проверенные и быстрые вперёд, затем меньше сбоев. */
    const ranked = (providerId: string) => [...store.models.values()]
        .filter(state => state.provider === providerId && eligible(state))
        .sort((a, b) => Number(b.verified) - Number(a.verified) || a.failures - b.failures || (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity))

    const probeOne = async (provider: AiProvider, state: AiModelState) => {
        const startedAt = Date.now()
        try {
            await provider.probe!(state.id)
            store.models.set(keyOf(provider.id, state.id), { ...state, ok: true, verified: true, latencyMs: Date.now() - startedAt, checkedAt: Date.now(), failures: 0, error: undefined, retryAt: undefined })
        } catch (error) {
            // исчерпанный лимит — не вина модели: замолкаем на час, чтобы не жечь его дальше
            if (isQuotaError(error)) { store.cooldowns.set(provider.id, Date.now() + QUOTA_COOLDOWN_MS); return }
            store.models.set(keyOf(provider.id, state.id), { ...state, ok: false, checkedAt: Date.now(), failures: state.failures + 1, error: String((error as Error)?.message ?? error).slice(0, 300), retryAt: Date.now() + FAIL_COOLDOWN_MS })
        }
    }

    /** Обновить каталог моделей (бесплатно) и проверить лучшую из ещё не подтверждённых. Параллельные вызовы схлопываются. */
    const refresh = () => store.refreshing ??= (async () => {
        try {
            for (const id of order()) {
                const provider = store.providers.get(id)
                if (!provider) continue
                let models: string[]
                try { models = await provider.listModels() } catch (error) {
                    console.warn(`[ai] ${id}: model list failed`, (error as Error)?.message)
                    report(id, `model list failed: ${(error as Error)?.message}`)
                    continue
                }
                for (const [key, state] of store.models) if (state.provider === id && !models.includes(state.id)) store.models.delete(key)
                for (const model of models) {
                    const key = keyOf(id, model)
                    if (!store.models.has(key)) store.models.set(key, { provider: id, id: model, ok: true, verified: false, checkedAt: 0, failures: 0 })
                }
                // фоллбеки не пингуем, пока основной провайдер жив: каждая проверка тратит их лимит
                const primaryAlive = order().slice(0, order().indexOf(id)).some(earlier => ranked(earlier).length)
                if (paused(id) || primaryAlive) continue
                const target = ranked(id)[0]
                if (target && provider.probe) await probeOne(provider, target)
            }
        } finally {
            store.lastRefresh = Date.now()
            store.refreshing = undefined
        }
    })()

    /** Кандидаты по порядку провайдеров (первый — основной, остальные — фоллбеки), у каждого — лучшая модель. */
    const candidates = async (): Promise<{ provider: AiProvider, id: string }[]> => {
        if (!store.lastRefresh) await refresh()
        else if (Date.now() - store.lastRefresh > recheck() * 2) void refresh()
        const result: { provider: AiProvider, id: string }[] = []
        for (const providerId of order()) {
            const provider = store.providers.get(providerId)
            const best = provider && ranked(providerId)[0]
            if (provider && best) result.push({ provider, id: best.id })
        }
        return result
    }

    /** Модель ответила на живой запрос. */
    const success = (provider: string, id: string) => {
        const state = store.models.get(keyOf(provider, id))
        if (state && !state.verified) store.models.set(keyOf(provider, id), { ...state, ok: true, verified: true, checkedAt: Date.now(), failures: 0 })
    }

    /** Живой запрос провалился: лимит — общая пауза, иначе модель выпадает из ротации до retryAt. */
    const failure = (provider: string, id: string, error: unknown) => {
        if (isQuotaError(error)) { store.cooldowns.set(provider, Date.now() + QUOTA_COOLDOWN_MS); return }
        const state = store.models.get(keyOf(provider, id))
        if (!state) return
        store.models.set(keyOf(provider, id), { ...state, ok: false, failures: state.failures + 1, checkedAt: Date.now(), retryAt: Date.now() + FAIL_COOLDOWN_MS, error: String((error as Error)?.message ?? error).slice(0, 300) })
    }

    const status = () => ({ lastRefresh: store.lastRefresh, refreshing: !!store.refreshing, cooldowns: Object.fromEntries(store.cooldowns), providers: [...store.providers.keys()], startErrors: Object.fromEntries(store.startErrors), models: [...store.models.values()] })

    return { register, report, refresh, candidates, success, failure, status, recheck, order }
}
