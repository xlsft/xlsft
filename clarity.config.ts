import { defineClarityConfig } from "@crumbleerp/clarity/nuxt"
import { schema } from "./schema/index.ts"
import config from "./global.config.ts"

export default defineClarityConfig({
    endpoint: config.clarity.endpoint,
    dataset: config.clarity.dataset,
    publishSchema: false,
    token: process.env.NODE_ENV === 'development'
        ? process.env.CLARITY_DEV_TOKEN
        : process.env.CLARITY_TOKEN,
    schema
})
