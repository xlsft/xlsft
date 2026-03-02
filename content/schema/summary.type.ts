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


// Senior Frontend Engineer с более чем 5-летним опытом создания высоконагруженных B2B/B2C-приложений с использованием Vue, React и TypeScript.

// Специализируюсь на фронтенд-архитектуре, микрофронтендах и масштабируемых системах пользовательского интерфейса.

// Создавал и поддерживал системы, используемые тысячами пользователей и обрабатывшие более 1 млрд рублей бизнес-объема.

// Имеет опыт в принятии решений по архитектуре фронтенда, создании систем дизайна и оптимизации производительности.

// Открыт для позиций Senior / Lead Frontend Engineer


// Senior Frontend Engineer with 5+ years of experience building high-load B2B/B2C applications using Vue, React, and TypeScript.

// Specialized in frontend architecture, microfrontends, and scalable UI systems.

// Built and maintained production systems used by thousands of users and processed over ₽1B in business volume.

// Experienced in leading frontend architecture decisions, creating design systems, and optimizing performance.

// Open to Senior / Lead Frontend positions.