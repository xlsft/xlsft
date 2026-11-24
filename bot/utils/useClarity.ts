import { createClient } from '@crumbleerp/clarity'
import { schema } from '../../schema'
import config from '../../global.config'

export const useClarity = () => createClient({
    endpoint: config.clarity.endpoint,
    dataset: config.clarity.dataset,
    token: process.env.CLARITY_TOKEN,
    schema
})
