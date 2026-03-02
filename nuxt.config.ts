import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
    compatibilityDate: '2025-05-15',
    devtools: { enabled: true },
    css: ['~/assets/css/main.css'],  
    vite: { plugins: [ tailwindcss() as any ] },
    app: {
        head: {
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1',
            title: 'Senior Frontend Engineer (Илья Торшин) – xlsft`s cv',
            meta: [
                { property: 'og:type', content: 'website' },
                { property: 'og:title', content: 'Senior Frontend Engineer (Илья Торшин) – xlsft`s cv' },
                { property: 'og:url', content: 'https://xlsft.ru' },
                { property: 'og:image', content: '/og_image.png' },
                { property: 'og:description', content: 'Это мое резюме Senior Frontend Engineer' },
                { property: 'business:contact_data:locality', content: 'Липецк' },
                { property: 'business:contact_data:region', content: 'Липецкая область' },
                { property: 'business:contact_data:postal_code', content: '398005' },
                { property: 'business:contact_data:country_name', content: 'Россия' },
                { name: 'description', content: 'Это мое резюме Senior Frontend Engineer' },
                { name: 'author', content: 'xlsft' },
                { name: 'copyright', content: `xlsft @ ${new Date().getFullYear()}` },
                { name: 'robots', content: 'index, follow' }
            ],
            link: [
                { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
                { rel: 'icon', type: 'image/png', href: '/favicon.png' },
            ]
        },
    },
    modules: ['@nuxtjs/i18n', 'yandex-metrika-module-nuxt3', '@nuxt/ui', '@nuxtjs/sanity', '@nuxt/fonts', '@nuxtjs/seo', '@nuxt/image', '@nuxtjs/mdc'],
    hooks: {
        'imports:extend'(imports) {
            for (let i = imports.length - 1; i >= 0; i -= 1) {
                const item = imports[i]
                if (item && item.name === 'options' && item.from.includes('@nuxt/ui/dist/runtime/composables/useResizable')) {
                    imports.splice(i, 1)
                }
            }
        }
    },
    i18n: {
        strategy: 'prefix',
        compilation: {
            strictMessage: false,
        },
        defaultLocale: 'ru',
        locales: [
            { code: 'en', language: 'en-US', file: 'en.ts' },
            { code: 'ru', language: 'ru-RU', file: 'ru.ts' }
        ],
    },
    ui: {
        prefix: 'Nuxt',
    },
    mdc: {
        headings: {
            anchorLinks: false
        }
    },
    yandexMetrika: {
        id: 103237740,
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true
    },
    sanity: {
        projectId: 'd5cxszmz',
        apiVersion: '2026-02-27',
        typegen: {
            schemaTypesPath: './content/schema',
            enabled: true
        },
        useCdn: process.env.NODE_ENV === 'production',
    }
})