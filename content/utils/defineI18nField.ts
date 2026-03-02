import { defineField } from "sanity";

const languages = ['ru', 'en'] as const

export const defineI18nField = (schemaField: { name: string, title: string, type: string }) => defineField({
    name: schemaField.name,
    title: schemaField.title,
    type: 'object',
    fields: languages.map((lang) => defineField({ name: lang, title: lang.toUpperCase(), type: schemaField.type })) 
})