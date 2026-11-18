import { defineClarityConfig } from "@crumbleerp/clarity/nuxt"
import { schema } from "./schema/index.ts"

export default defineClarityConfig({
    endpoint: process.env.CLARITY_ENDPOINT || 'https://cv.xlsft.com/admin',
    dataset: 'cv',
    publishSchema: false,
    token: process.env.NODE_ENV === 'development'
        ? process.env.CLARITY_DEV_TOKEN
        : process.env.CLARITY_TOKEN,
    schema
})
