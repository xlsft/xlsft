/**
 * REST client of the Twenty CRM: requests from the chat land there as opportunities on the kanban.
 * Without a token the client is disabled and requests stay in storage until it is set.
 */

const TIMEOUT_MS = 15_000

export interface Twenty {
    enabled: boolean
    create: (object: string, body: object) => Promise<string>
    update: (object: string, id: string, body: object) => Promise<void>
}

export const useTwenty = (): Twenty => {
    const config = useRuntimeConfig().twenty

    const request = async <T>(method: 'POST' | 'PATCH', path: string, body: object): Promise<T> => $fetch<T, string>(`/rest/${path}`, {
        baseURL: config.url,
        method,
        body,
        headers: { authorization: `Bearer ${config.token}` },
        timeout: TIMEOUT_MS,
    })

    return {
        enabled: Boolean(config.url.length && config.token.length),
        create: async (object, body) => {
            const response = await request<{ data: Record<string, { id: string }> }>('POST', object, body)
            const record = Object.values(response.data)[0]
            if (!record?.id) throw new Error(`twenty: no id in the ${object} response`)
            return record.id
        },
        update: async (object, id, body) => {
            await request('PATCH', `${object}/${id}`, body)
        },
    }
}
