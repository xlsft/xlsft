import { defineClarityConfig } from '@crumbleerp/clarity/nuxt'
import { schema } from './schema/index.ts'

export default defineClarityConfig({
    endpoint: 'https://cv.xlsft.com/content',
    dataset: 'cv',
    publishSchema: false,
    token: '',
    schema,
})
