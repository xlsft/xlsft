import * as z from 'zod'

const limit = useRateLimit('assistant-block', 60, 60_000)

const schema = z.object({
    type: z.enum(['experience', 'projects', 'skills', 'contacts', 'project', 'repos']),
    locale: z.enum(['ru', 'en']).default('ru'),
    company: z.string().max(64).optional(),
    tag: z.string().max(64).optional(),
    ids: z.string().max(400).optional(),
    limit: z.coerce.number().int().min(1).max(8).optional(),
})

export default defineEventHandler(async (event) => {
    limit.check(event)
    const query = await getValidatedQuery(event, (value) => schema.parse(value))
    const data = await useAssistantData(query.locale).load()
    return await useBlocks(data).build(query.type, { ...query, ids: query.ids?.split(',').filter(Boolean) })
})
