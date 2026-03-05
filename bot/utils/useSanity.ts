import { createClient } from '@sanity/client'
import config from '../../global.config'

export const useSanity = () => createClient({
    projectId: config.cms.project,
    dataset: config.cms.dataset,
    apiVersion: config.cms.api,
})