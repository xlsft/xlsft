import { describe, expect, it, vi } from 'vitest'
import { build } from '../server/requests/build'
import { recipients, render, who } from '../server/requests/render'
import type { RequestData, RequestProvider } from '../server/requests/types'

const provider = <Name extends string>(name: Name, options: { enabled?: boolean, fail?: boolean } = {}) => {
    const calls: { action: string, request: RequestData }[] = []
    const record = (action: string) => async (request: RequestData) => {
        calls.push({ action, request })
        if (options.fail) throw new Error(`${name} is down`)
    }
    const value: RequestProvider<Name> = { name, enabled: options.enabled ?? true, create: record('create'), patch: record('patch') }
    return { value, calls }
}

const request: RequestData = { id: 's1', fields: { name: 'Anna', email: 'anna@example.com' } }

describe('build', () => {
    it('sends to every provider by default', async () => {
        const a = provider('a')
        const b = provider('b')
        const result = await build([a.value, b.value]).create(request)
        expect(result).toEqual([{ provider: 'a', ok: true }, { provider: 'b', ok: true }])
        expect([a.calls, b.calls]).toEqual([[{ action: 'create', request }], [{ action: 'create', request }]])
    })

    it('narrows to the named providers', async () => {
        const a = provider('a')
        const b = provider('b')
        await build([a.value, b.value]).instance('b').patch({ ...request, changed: ['email'] })
        expect(a.calls).toHaveLength(0)
        expect(b.calls).toEqual([{ action: 'patch', request: { ...request, changed: ['email'] } }])
    })

    it('throws on an unknown provider', () => {
        expect(() => build<string>([provider('a').value]).instance('nope')).toThrow('unknown provider nope')
    })

    it('skips disabled providers and isolates failures', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const off = provider('off', { enabled: false })
        const down = provider('down', { fail: true })
        const up = provider('up')
        const result = await build([off.value, down.value, up.value]).create(request)
        expect(result).toEqual([
            { provider: 'off', ok: false, error: 'disabled' },
            { provider: 'down', ok: false, error: 'down is down' },
            { provider: 'up', ok: true },
        ])
        expect(off.calls).toHaveLength(0)
        expect(up.calls).toHaveLength(1)
    })
})

describe('recipients', () => {
    it('takes an array or a comma-separated string', () => {
        expect(recipients(['a@x.co', ' b@x.co '])).toEqual(['a@x.co', 'b@x.co'])
        expect(recipients('a@x.co, b@x.co')).toEqual(['a@x.co', 'b@x.co'])
        expect(recipients('')).toEqual([])
        expect(recipients(undefined)).toEqual([])
    })
})

describe('render', () => {
    it('names the visitor by the first known contact', () => {
        expect(who({ name: 'Anna', email: 'a@b.co' })).toBe('Anna')
        expect(who({ telegram: 'anna' })).toBe('anna')
        expect(who({})).toBe('website visitor')
    })

    it('lists contacts, the message and marks changed fields', () => {
        const text = render({ name: 'Anna', telegram: 'anna', message: 'Need a site' }, 'https://cv.xlsft.com', ['telegram'])
        expect(text).toBe([
            'Name: Anna',
            'Email: -',
            'Phone: -',
            '* Telegram: @anna (https://t.me/anna)',
            '',
            'Message:',
            'Need a site',
            '',
            '* changed in this update',
            '',
            'Source: AI chat on https://cv.xlsft.com',
        ].join('\n'))
    })
})
