import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

// soffice держит блокировку профиля, поэтому конвертации идут по одной; профиль переиспользуем — первый запуск самый долгий
let queue: Promise<unknown> = Promise.resolve()
const profile = path.join(os.tmpdir(), 'cv-libreoffice-profile')

/**
 * docx → pdf или png (первая страница — для превью) через LibreOffice (soffice --headless). Бинарь — LIBREOFFICE_BIN или soffice из PATH.
 * Шрифт Cascadia Code должен быть установлен в системе (в Docker ставится в Dockerfile.app):
 * встроенные в docx шрифты LibreOffice в headless-режиме не подхватывает.
 */
export const useDocxConvert = (docx: Buffer, format: 'pdf' | 'png'): Promise<Buffer> => {
    const task = queue.then(async () => {
        const work = await fs.mkdtemp(path.join(os.tmpdir(), 'cv-pdf-'))
        try {
            const input = path.join(work, 'cv.docx')
            await fs.writeFile(input, docx)
            await run(process.env.LIBREOFFICE_BIN || 'soffice', [
                `-env:UserInstallation=file://${profile}`,
                '--headless', '--norestore', '--nologo',
                '--convert-to', format, '--outdir', work, input,
            ], { timeout: 90_000 })
            return await fs.readFile(path.join(work, `cv.${format}`))
        } catch (error: any) {
            throw createError({ status: 500, message: `${format.toUpperCase()} conversion failed: ${error?.stderr || error?.message || error}` })
        } finally {
            await fs.rm(work, { recursive: true, force: true })
        }
    })
    // ошибка одной конвертации не должна ломать очередь
    queue = task.catch(() => {})
    return task
}

export const useDocxToPdf = (docx: Buffer) => useDocxConvert(docx, 'pdf')
