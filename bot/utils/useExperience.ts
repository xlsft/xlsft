import type { ExtendedContext } from ".."
import { useI18n } from "./useI18n"
import { useNumberCase } from './useNumberCase'

export const useExperience = (ctx: ExtendedContext, _from: string | Date, _to?: string | Date) => {
    const { t, locale } = useI18n(ctx)
    const from = new Date(_from), to = _to ? new Date(_to) : new Date()
    const total = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
    const years = Math.floor(total / 12), months = total % 12
    const data = { total, from, to, now: !_to, months, years }
    return {
        duration() {  
            return (data.years > 0 ? useNumberCase(data.years, t.years.one, t.years.two, t.years.more) + ' ' : '') + 
            useNumberCase(data.months, t.months.one, t.months.two, t.months.more) 
        },
        period() {
            const formatter = new Intl.DateTimeFormat(locale, { month: 'long' })
            return `${formatter.format(data.from)} ${data.from.getFullYear()} — ${data.now ? t.present : `${formatter.format(data.to)} ${data.to.getFullYear()}`} / ${this.duration()}`
        }
    }
} 