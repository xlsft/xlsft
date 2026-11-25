import type { RequestProvider, RequestResult, Requests } from './types'

/** Sends a request to every given provider at once; one failing provider does not stop the others. */
export const build = <Name extends string>(providers: RequestProvider<Name>[]): Requests<Name> => {
    const run = async (action: (provider: RequestProvider<Name>) => Promise<void>): Promise<RequestResult[]> => Promise.all(providers.map(async (provider) => {
        if (!provider.enabled) return { provider: provider.name, ok: false, error: 'disabled' }
        try {
            await action(provider)
            return { provider: provider.name, ok: true }
        } catch (error) {
            const message = (error as Error)?.message ?? String(error)
            console.error(`[requests] ${provider.name} failed:`, message)
            return { provider: provider.name, ok: false, error: message }
        }
    }))

    return {
        create: async request => run(provider => provider.create(request)),
        patch: async request => run(provider => provider.patch(request)),
        instance: (...names) => {
            const unknown = names.filter(name => !providers.some(provider => provider.name === name))
            if (unknown.length) throw new Error(`requests: unknown provider ${unknown.join(', ')}`)
            return build(providers.filter(provider => names.includes(provider.name)))
        },
    }
}
