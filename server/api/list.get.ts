import { form } from "~/utils/form"
import { db } from "../db/client"
import { request } from "../db/schema/request.schema"

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    if (!query.token || query.token !== useRuntimeConfig().tg_token) throw createError({ statusCode: 401, statusMessage: 'unauthorized' })

    const data = await db.select().from(request).orderBy(request.date)

    return data
})
