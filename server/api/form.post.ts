import { form } from "~/utils/form"

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const result = form(body, 'сайт')
    return { result }
})