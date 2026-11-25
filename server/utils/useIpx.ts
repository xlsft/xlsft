import { createHash } from 'node:crypto'
import { createIPX, ipxHttpStorage } from 'ipx'
import type { H3Event } from 'h3'
import type { IPXStorage } from 'ipx'

/**
 * IPX поверх CMS-картинок: оригинал с S3 качается один раз на диск (`ipx` storage),
 * дальше все размеры и форматы режутся из локальной копии.
 */
export const useIpx = (): { process: (event: H3Event) => Promise<Buffer> } => {
    const http = ipxHttpStorage({ domains: useRuntimeConfig().ipx.domains })
    const sources = useStorage('ipx')
    const pending = new Map<string, Promise<ArrayBuffer | undefined>>()

    async function source(id: string): Promise<ArrayBuffer | undefined> {
        const key = createHash('sha1').update(id).digest('hex')
        const stored = await sources.getItemRaw<Buffer>(key)
        if (stored) return new Uint8Array(stored).buffer

        const running = pending.get(key) ?? (async (): Promise<ArrayBuffer | undefined> => {
            const data = await http.getData(id)
            if (data) await sources.setItemRaw(key, Buffer.from(data))
            return data
        })().finally(() => pending.delete(key))
        pending.set(key, running)
        return running
    }

    const storage: IPXStorage = { name: 'ipx:cms', getMeta: id => http.getMeta(id), getData: source }
    const ipx = createIPX({ storage, httpStorage: storage })

    async function process(event: H3Event): Promise<Buffer> {
        const [modifiers = '', ...segments] = (getRouterParam(event, '_') ?? '').split('/')
        const id = decodeURIComponent(segments.join('/'))
        if (!modifiers || !id) throw createError({ statusCode: 400, statusMessage: 'IPX_BAD_PATH' })

        const options = modifiers === '_'
            ? {}
            : Object.fromEntries(modifiers.split('&').map((pair) => {
                const [key = '', ...values] = pair.split('_')
                return [key, decodeURIComponent(values.join('_'))]
            }))

        const { data, format } = await ipx(id, options).process()
        setHeader(event, 'content-type', format ? `image/${format}` : 'application/octet-stream')
        return Buffer.from(data)
    }

    return { process }
}
