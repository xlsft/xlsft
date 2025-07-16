import os from 'os'
import { execSync } from 'child_process'
import build from '../build.json'

export const health = () => {
    const cpus = os.cpus()
    const total = Math.round(os.totalmem() / 1024 / 1024)
    const free = Math.round(os.freemem() / 1024 / 1024)
    const uptime = os.uptime()
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)
    
    let disk = 'unavailable'
    try {
        const stdout = execSync('df -k /', { encoding: 'utf8' })
        const lines = stdout.trim().split('\n')
        const parts = lines[1].split(/\s+/)
        const used = Math.round(parseInt(parts[2]) / 1024 / 1024)
        const size = Math.round(parseInt(parts[1]) / 1024 / 1024)
        disk = `${used} / ${size} gb`
    } catch (err) { disk = 'error' }

    return JSON.stringify({
        now: new Date().toISOString(),
        cpu: `${cpus[0].model} at ${cpus[0].speed} mhz`,
        memory: `${total - free} / ${total} mb`,
        uptime: `${days}:${hours}:${minutes}:${seconds}`,
        os: `${os.platform()} ${os.release()} (${os.arch()})`,
        disk,
        build: `xlsft.ru (${build.v}-${build.b}) ${build.d}`
    })
}