import { describe, expect, it } from 'vitest'
import { plain } from '../app/lib/markdown'
import { themes, tokens } from '../app/lib/og'
import { uuid } from '../app/lib/uuid'

describe('plain', () => {
    it('strips markdown', () => {
        expect(plain('**bold** and [link](https://example.com)')).toBe('bold and link')
    })

    it('keeps escaped characters', () => {
        expect(plain('\\*\\*\\* not bold')).toBe('*** not bold')
    })

    it('returns an empty string for undefined', () => {
        expect(plain(undefined)).toBe('')
    })
})

describe('tokens', () => {
    const colors = themes.dark

    it('splits CommonHighlight syntax into colored tokens', () => {
        const result = tokens('plain \0dpath\0eerror', colors)
        expect(result.map((token) => token.text)).toEqual(['plain ', 'path', 'error'])
        expect(result[0]?.color).toBe(colors.text)
        expect(result[1]?.color).toBe(colors.dimmed)
    })

    it('drops empty tokens', () => {
        expect(tokens('\0s', colors)).toEqual([])
    })
})

describe('uuid', () => {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

    it('generates a v4 uuid', () => {
        expect(uuid()).toMatch(pattern)
    })

    it('falls back to getRandomValues without randomUUID', () => {
        const original = crypto.randomUUID
        Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
        try {
            expect(uuid()).toMatch(pattern)
        } finally {
            Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
        }
    })
})
