import type { Font } from "satori"
import path from "path"
import os from "os"
import { promises as fs } from "fs"

declare global {
    var __fonts: Record<string, Font & { file: string }> 
}

export const useSatoriFont = async (name: Font['name'], weight?: Font['weight'], style?: Font['style']): Promise<Font & { file: string }> => {
    const key = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@${encodeURIComponent(weight || 400)}`
    globalThis.__fonts ||= {}
    if (!globalThis.__fonts[key]) {
        const url = (await fetch(key).then(r => r.text())).match(/src: url\((.*?)\)/)?.[1]
        if (!url) throw new Error('Font url not found')
        const data = await fetch(url).then(r => r.arrayBuffer())
        const ext = path.extname(url).split('?')[0] || '.woff2'
        const file = path.join(os.tmpdir(), `${name.replace(/\s+/g, '_')}-${weight || 400}${ext}`)
        await fs.writeFile(file, Buffer.from(data))

        const font: Font & { file: string } = {
            name: name.replace(/\+/g, ' '),
            data,
            weight: weight || 400,
            style: style || 'normal',
            file
        }
        globalThis.__fonts[key] = font
    } 
    return globalThis.__fonts[key]
}