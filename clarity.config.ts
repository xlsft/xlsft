import { defineClarityConfig } from "@crumbleerp/clarity/nuxt"
import { schema } from "./schema/index.ts"

export default defineClarityConfig({
    endpoint: 'https://clarity.xlsft.ru',
    dataset: 'cv',
    token: process.env.CLARITY_TOKEN,
    schema
})
