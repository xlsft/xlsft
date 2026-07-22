import { createClient } from '@crumbleerp/clarity'
import { schema } from '../../schema'

export const useClarity = () => createClient({
    endpoint: 'https://clarity.xlsft.ru',
    dataset: 'cv',
    token: process.env.CLARITY_TOKEN,
    schema
})
