import { defineConfig } from 'sanity'
import schema from './schema'
import plugins from './sanity.plugins'

export default defineConfig({
    name: 'default',
    title: 'xlsft`s cv',

    projectId: 'd5cxszmz',
    dataset: 'production',
    basePath: '/admin',
    plugins,
    schema: {
        types: schema,
    },
})
