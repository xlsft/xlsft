import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'skill',
    title: 'Skill',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
        }),
        defineField({
            name: 'color',
            title: 'Color',
            type: 'color',
            options: {
                disableAlpha: true,
            }
        })
    ],  
})