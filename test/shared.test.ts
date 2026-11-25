import { describe, expect, it } from 'vitest'
import { plural } from '../shared/utils/case'
import { byPriority } from '../shared/utils/priority'

describe('plural', () => {
    const years = (number: number): string => plural(number, 'год', 'года', 'лет')

    it('picks the russian form by the last digits', () => {
        expect(years(1)).toBe('1 год')
        expect(years(2)).toBe('2 года')
        expect(years(5)).toBe('5 лет')
        expect(years(21)).toBe('21 год')
        expect(years(24)).toBe('24 года')
    })

    it('uses the many form for 0 and 11–19', () => {
        expect(years(0)).toBe('0 лет')
        expect(years(11)).toBe('11 лет')
        expect(years(14)).toBe('14 лет')
        expect(years(112)).toBe('112 лет')
    })

    it('handles negative numbers', () => {
        expect(years(-1)).toBe('-1 год')
        expect(years(-3)).toBe('-3 года')
    })
})

describe('byPriority', () => {
    it('sorts by priority descending, then by name', () => {
        const items = [{ name: 'b' }, { name: 'c', priority: 2 }, { name: 'a' }, { name: 'd', priority: 2 }]
        expect(items.sort(byPriority).map((item) => item.name)).toEqual(['c', 'd', 'a', 'b'])
    })
})
