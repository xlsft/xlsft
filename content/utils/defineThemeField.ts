import { defineField } from "sanity";

const themes = ['dark', 'light'] as const

export const defineThemeField = (schemaField: { name: string, title: string, type: string }) => defineField({
    name: schemaField.name,
    title: schemaField.title,
    type: 'object',
    fields: themes.map((theme) => defineField({ name: theme, title: theme, type: schemaField.type })) 
})