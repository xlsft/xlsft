import { defineConfig } from 'sanity'
import schema from './schema'
import plugins from './sanity.plugins'
import config from '../global.config'

export default defineConfig({
    name: 'default',
    title: config.head.title,

    projectId: config.cms.project,
    dataset: 'production',
    basePath: '/admin',
    plugins,
    schema: {
        types: schema,
    },
})
