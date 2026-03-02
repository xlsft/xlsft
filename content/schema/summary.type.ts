import { defineField, defineType } from 'sanity'
import { defineI18nField } from '../utils/defineI18nField'

export default defineType({
    name: 'summary',
    title: 'Summary',
    type: 'document',
    fields: [
        defineI18nField({
            name: 'content',
            title: 'Content',
            type: 'markdown',
        }),
        defineField({
            name: 'image',
            title: 'Image',
            type: 'image',
        }),
        defineI18nField({
            name: 'status',
            title: 'Status',
            type: 'string',
        })
    ],
})