import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

let queue: Promise<unknown> = Promise.resolve()
const profile = path.join(os.tmpdir(), 'cv-libreoffice-profile')

export const useLibreoffice = (): { convert: (docx: Buffer, format: 'pdf' | 'png') => Promise<Buffer> } => {
    const bin = useRuntimeConfig().libreoffice.bin

    function convert(docx: Buffer, format: 'pdf' | 'png'): Promise<Buffer> {
        const task = queue.then(async () => {
            const work = await fs.mkdtemp(path.join(os.tmpdir(), 'cv-pdf-'))
            try {
                const input = path.join(work, 'cv.docx')
                await fs.writeFile(input, docx)
                await run(bin, [
                    `-env:UserInstallation=file://${profile}`,
                    '--headless', '--norestore', '--nologo',
                    '--convert-to', format, '--outdir', work, input,
                ], { timeout: 90_000 })
                return await fs.readFile(path.join(work, `cv.${format}`))
            } catch (error: any) {
                throw createError({ status: 500, message: `${format.toUpperCase()} conversion failed: ${[error?.stderr, error?.message].find(Boolean) ?? error}` })
            } finally {
                await fs.rm(work, { recursive: true, force: true })
            }
        })
        queue = task.catch(() => undefined)
        return task
    }

    return { convert }
}
