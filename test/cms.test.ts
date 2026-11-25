import { afterEach, describe, expect, it, vi } from 'vitest'
import { invalidate, key, normalize, request } from '../app/stores/cms/cache'
import type { CmsFetcher, CmsParams } from '../app/stores/cms/types'

interface Call { query: string, params: CmsParams }

const fetcher = (answer: (call: Call) => unknown): { fetch: CmsFetcher, calls: Call[] } => {
    const calls: Call[] = []
    const fetch = (<T>(query: string, params: CmsParams): Promise<T> => {
        calls.push({ query, params })
        return Promise.resolve(answer({ query, params }) as T)
    }) as CmsFetcher
    return { fetch, calls }
}

afterEach(() => {
    invalidate()
    vi.useRealTimers()
})

describe('normalize', () => {
    it('collapses whitespace outside of strings', () => {
        expect(normalize('*[ _type  ==\n  "a  b" ]  { name }')).toBe('*[ _type == "a  b" ] { name }')
    })
})

describe('key', () => {
    it('does not depend on the order of params', () => {
        expect(key('q', { a: 1, b: 2 })).toBe(key('q', { b: 2, a: 1 }))
    })

    it('differs by params', () => {
        expect(key('q', { a: 1 })).not.toBe(key('q', { a: 2 }))
    })
})

describe('request', () => {
    it('converts null to undefined', async () => {
        const { fetch } = fetcher(() => ({ name: 'x', empty: null, list: [null, { deep: null }] }))
        expect(await request(fetch, '*[0]', {})).toEqual({ name: 'x', list: [undefined, {}] })
    })

    it('caches answers', async () => {
        const { fetch, calls } = fetcher(() => 1)
        await request(fetch, 'cached', {})
        expect(await request(fetch, 'cached', {})).toBe(1)
        expect(calls).toHaveLength(1)
    })

    it('skips the cache when asked', async () => {
        const { fetch, calls } = fetcher(() => 1)
        await request(fetch, 'uncached', {})
        await request(fetch, 'uncached', {}, { cache: false })
        expect(calls).toHaveLength(2)
    })

    it('refetches after the fresh window', async () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        const { fetch, calls } = fetcher(() => 1)
        await request(fetch, 'expiring', {})
        vi.setSystemTime(Date.now() + 3_600_000)
        await request(fetch, 'expiring', {})
        expect(calls).toHaveLength(2)
    })

    it('dedupes queries in flight', async () => {
        const { fetch, calls } = fetcher(() => 1)
        await Promise.all([request(fetch, 'same', { a: 1 }), request(fetch, 'same', { a: 1 })])
        expect(calls).toHaveLength(1)
    })

    it('batches queries from one tick, renaming conflicting params', async () => {
        const { fetch, calls } = fetcher(({ params }) => ({ q0: params.locale, q1: params.q1_id, q2: params.q2_id }))
        const result = await Promise.all([
            request(fetch, '$locale', { locale: 'ru' }),
            request(fetch, '$id', { id: 'a', locale: 'ru' }),
            request(fetch, '$id', { id: 'b', locale: 'ru' }),
        ])
        expect(calls).toHaveLength(1)
        expect(calls[0]?.query).toBe('{ "q0": ($locale), "q1": ($q1_id), "q2": ($q2_id) }')
        expect(calls[0]?.params).toEqual({ locale: 'ru', q1_id: 'a', q2_id: 'b' })
        expect(result).toEqual(['ru', 'a', 'b'])
    })

    it('retries queries one by one when the batch fails', async () => {
        const { fetch, calls } = fetcher(({ query }) => {
            if (query.startsWith('{')) throw new Error('broken')
            return query
        })
        const result = await Promise.all([request(fetch, '"a"', {}), request(fetch, '"b"', {})])
        expect(result).toEqual(['"a"', '"b"'])
        expect(calls).toHaveLength(3)
    })
})
