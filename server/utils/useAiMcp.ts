import * as z from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

/**
 * Инструменты ассистента для OpenCode: он исполняет их сам, ходя в этот MCP-сервер,
 * а AI SDK лишь «наблюдает» вызовы и результаты. Секрет — общий между процессом приложения и локальным opencode.
 */
export const useAiMcpSecret = () => process.env.AI_MCP_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-mcp-secret' : undefined)

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })
const localeSchema = z.enum(['ru', 'en']).describe('Language of the visitor (ru or en)')
const sessionSchema = z.uuid().describe('Visitor session id from the system prompt (copy it exactly)')

export const createAiMcpServer = () => {
    const server = new McpServer({ name: 'cv', version: '1.0.0' })

    server.registerTool('ping', { description: 'Health check. Returns "pong".' }, async () => text({ pong: true }))

    // те же инструменты, что и нативные; локаль и сессию здесь передаёт сама модель
    for (const spec of assistantToolSpecs) {
        server.registerTool(spec.name, {
            description: spec.description,
            inputSchema: { ...(spec.needsSession ? { session: sessionSchema } : {}), ...(spec.needsLocale ? { locale: localeSchema } : {}), ...spec.input }
        }, async ({ locale, session, ...args }: any) => text(await spec.run({ locale: locale ?? 'ru', session }, args)))
    }

    return server
}
