import { timingSafeEqual } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

/** MCP-сервер с инструментами ассистента */
export default defineEventHandler(async (event) => {
    const secret = useAiMcpSecret()
    const given = (getRequestHeader(event, 'authorization') || '').replace(/^Bearer\s+/i, '')
    const valid = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret))
    if (!valid) throw createError({ status: 401, message: 'Unauthorized' })

    const server = createAiMcpServer()
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
    event.node.res.on('close', () => { void transport.close(); void server.close() })
    await server.connect(transport)
    await transport.handleRequest(event.node.req, event.node.res, event.method === 'POST' ? await readBody(event) : undefined)
    event._handled = true
})
