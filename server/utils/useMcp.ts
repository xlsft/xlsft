import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod'

export interface Mcp {
    secret: string
    server: () => McpServer
}

const text = (value: unknown): { content: { type: 'text', text: string }[] } => ({ content: [{ type: 'text', text: JSON.stringify(value) }] })

export const useMcp = (): Mcp => {
    const secret = useRuntimeConfig().ai.secret
    const locale = z.enum(['ru', 'en']).describe('Language of the visitor (ru or en)')
    const session = z.uuid().describe('Visitor session id from the system prompt (copy it exactly)')

    function server(): McpServer {
        const instance = new McpServer({ name: 'cv', version: '1.0.0' })
        instance.registerTool('ping', { description: 'Health check. Returns "pong".' }, async () => text({ pong: true }))
        for (const spec of tools) {
            instance.registerTool(spec.name, {
                description: spec.description,
                inputSchema: { ...spec.needsSession ? { session } : {}, ...spec.needsLocale ? { locale } : {}, ...spec.input },
            }, async ({ locale: language, session: id, ...args }: Record<string, unknown>) => text(await spec.run({ locale: (language ?? 'ru') as 'ru' | 'en', session: String(id ?? '') }, args)))
        }
        return instance
    }

    return { secret, server }
}
