import * as z from 'zod'

const rateLimit = useRateLimit('assistant-block', 60, 60_000)

const querySchema = z.object({
    type: z.enum(['experience', 'projects', 'skills', 'contacts', 'project', 'repos']),
    locale: z.enum(['ru', 'en']).default('ru'),
    company: z.string().max(64).optional(),
    tag: z.string().max(64).optional(),
    ids: z.string().max(400).optional(),
    limit: z.coerce.number().int().min(1).max(8).optional()
})

/** Содержимое интерактивного блока ассистента (опыт, проекты, проект, репозитории, стек, контакты) для рендера в чате. */
export default defineEventHandler(async (event) => {
    rateLimit(event)
    const query = await getValidatedQuery(event, (value) => querySchema.parse(value))
    const data = await useAssistantData(query.locale)
    return await buildAssistantBlock(data, query.type, { ...query, ids: query.ids?.split(',').filter(Boolean) })
})
