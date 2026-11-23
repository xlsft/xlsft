import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { generateText } from 'ai'
import { createOpencode } from 'ai-sdk-provider-opencode-sdk'

/**
 * Провайдер opencode: бесплатные модели через OpenCode CLI.
 * Поднимаем свой изолированный `opencode serve` (отдельные config/data, агент без файловых и shell-инструментов,
 * единственный доступный инструмент — MCP-сервер приложения /api/mcp) и ходим в него пакетом ai-sdk-provider-opencode-sdk.
 * Список моделей берём из `opencode models`: каталог бесплатных моделей меняется часто.
 */

const BIN = process.env.OPENCODE_BIN || 'opencode'
const PROVIDER_PREFIX = 'opencode/'
const PROBE_TIMEOUT_MS = 45_000

const freePort = () => new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { const { port } = server.address() as { port: number }; server.close(() => resolve(port)) })
})

const waitForMcp = async (url: string) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
        if (await fetch(url, { method: 'POST', signal: AbortSignal.timeout(2000) }).then(() => true, () => false)) return
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
    throw new Error('MCP endpoint is not reachable')
}

export const createOpencodeProvider = (): AiProvider => {
    const root = process.env.AI_OPENCODE_HOME || join(tmpdir(), `xlsft-opencode-${process.pid}`)
    const env = {
        ...process.env,
        XDG_CONFIG_HOME: join(root, 'config'), XDG_DATA_HOME: join(root, 'data'),
        XDG_STATE_HOME: join(root, 'state'), XDG_CACHE_HOME: join(root, 'cache'),
        OPENCODE_PASSWORD: randomBytes(16).toString('hex'),
    }
    let child: ChildProcess | undefined
    let opencode: ReturnType<typeof createOpencode> | undefined
    let serverUrl = ''
    let authHeaders: Record<string, string> = {}

    const mcpUrl = () => process.env.AI_MCP_URL || `http://127.0.0.1:${process.env.NITRO_PORT || process.env.PORT || 3000}/api/mcp`

    return {
        id: 'opencode',
        toolMode: 'mcp',

        async start() {
            const secret = useAiMcpSecret()
            if (!secret) throw new Error('AI_MCP_SECRET is not set')

            await rm(root, { recursive: true, force: true })
            await Promise.all(['config/opencode', 'data', 'state', 'cache', 'work'].map(dir => mkdir(join(root, dir), { recursive: true })))
            // Только MCP-сервер с инструментами ассистента. Кастомный агент и запрет встроенных инструментов
            // нельзя: бесплатные модели OpenCode отвечают «Free usage limit reached» на нештатный набор инструментов.
            // Безопасность держится на изоляции: пустая рабочая папка, отдельные config/data и approval на опасные действия
            // (запросы разрешений мы никогда не подтверждаем).
            await writeFile(join(root, 'config/opencode/opencode.json'), JSON.stringify({
                $schema: 'https://opencode.ai/config.json',
                autoupdate: false, snapshots: false, share: 'disabled',
                mcp: { servers: { cv: { type: 'remote', url: mcpUrl(), headers: { Authorization: `Bearer ${secret}` }, oauth: false } } },
            }, null, 2))

            // opencode подключается к MCP при старте и не повторяет попытку, поэтому запускаем его,
            // только когда сервер приложения уже принимает запросы
            await waitForMcp(mcpUrl())

            const port = await freePort()
            child = spawn(BIN, ['serve', '--hostname', '127.0.0.1', '--port', String(port)], { env, cwd: join(root, 'work'), stdio: ['ignore', 'pipe', 'pipe'] })
            child.stderr?.on('data', chunk => process.env.AI_DEBUG && console.warn('[opencode]', String(chunk).trim()))
            child.once('exit', code => { child = undefined; console.warn(`[ai] opencode exited (${code})`) })

            const baseUrl = serverUrl = `http://127.0.0.1:${port}`
            const headers = authHeaders = { Authorization: `Basic ${Buffer.from(`opencode:${env.OPENCODE_PASSWORD}`).toString('base64')}` }
            // ждём готовности сервера
            for (let attempt = 0; attempt < 60; attempt += 1) {
                if (!child) throw new Error('opencode serve exited during startup')
                if (await fetch(`${baseUrl}/api/info`, { headers, signal: AbortSignal.timeout(1000) }).then(r => r.ok, () => false)) break
                if (attempt === 59) throw new Error('opencode serve did not become ready')
                await new Promise(resolve => setTimeout(resolve, 500))
            }
            opencode = createOpencode({ baseUrl, clientOptions: { headers } })
        },

        async listModels() {
            // каталог моделей сервера подгружается не сразу после старта — ждём, пока он наполнится
            for (let attempt = 0; attempt < 20; attempt += 1) {
                const response = await fetch(`${serverUrl}/api/model`, { headers: authHeaders, signal: AbortSignal.timeout(5000) }).then(r => r.json(), () => undefined) as
                    { data?: { modelID: string, providerID: string, capabilities?: { tools?: boolean, output?: string[] } }[] } | undefined
                // только модели с инструментами и текстовым выводом; бесплатные в анонимном режиме — все, что отдаёт сервер
                const models = (response?.data || [])
                    .filter(model => model.providerID === 'opencode' && model.capabilities?.tools && model.capabilities.output?.includes('text'))
                    .map(model => `${PROVIDER_PREFIX}${model.modelID}`)
                if (models.length) return models
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
            return []
        },

        async probe(modelId) {
            if (!opencode) throw new Error('opencode is not started')
            // модель должна не просто ответить, а вызвать инструмент MCP — иначе ассистент ей не воспользуется
            const result = await generateText({
                model: opencode(modelId, { systemPrompt: 'Run exactly this code with the execute tool and nothing else: return await tools.cv.ping(); Then reply with the single word: done.' }),
                prompt: 'Run the health check now.',
                abortSignal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
            })
            const ponged = result.steps.some(step => step.toolResults.some(item => JSON.stringify(item.output).includes('pong')))
            if (!ponged) throw new Error(`model did not call MCP tools: ${result.finishReason} ${JSON.stringify(result.providerMetadata?.opencode?.error || result.steps.flatMap(step => step.toolResults.map(item => item.output))).slice(0, 200)} ${result.text.slice(0, 100)}`)
        },

        createModel(modelId, context) {
            if (!opencode) throw new Error('opencode is not started')
            return opencode(modelId, { systemPrompt: context.system })
        },

        async stop() {
            await opencode?.dispose?.()
            child?.kill('SIGTERM')
            await rm(root, { recursive: true, force: true }).catch(() => {})
        },
    }
}
