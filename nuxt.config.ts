import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
    compatibilityDate: '2025-05-15',
    devtools: { enabled: true },
    css: ['~/assets/css/main.css'],  
    vite: { plugins: [ tailwindcss() ], server: { allowedHosts: ['.ngrok-free.app'] } },
    app: {
        head: {
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1',
            title: 'xlsft`s cv',
            meta: [
                { property: 'og:type', content: 'website' },
                { property: 'og:title', content: 'xlsft`s cv' },
                { property: 'og:url', content: 'https://xlsft.ru' },
                { property: 'og:image', content: '/og_image.png' },
                { property: 'og:description', content: 'An xlsft`s senior frontend software engineer CV' },
                { property: 'business:contact_data:locality', content: 'Lipetsk' },
                { property: 'business:contact_data:region', content: 'Lipetsk region' },
                { property: 'business:contact_data:postal_code', content: '398005' },
                { property: 'business:contact_data:country_name', content: 'Russian Federation' },
                { name: 'description', content: 'An xlsft`s senior frontend software engineer CV' },
                { name: 'author', content: 'XL Software' },
                { name: 'copyright', content: 'XL Software @ 2025' },
                { name: 'robots', content: 'index, follow' }
            ],
            link: [
                { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
                { rel: 'icon', type: 'image/png', href: '/favicon.png' },
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
                { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cascadia+Mono:ital,wght@0,200..700;1,200..700&display=swap' }
            ]
        },
    },
    modules: [
        '@nuxtjs/i18n', 'yandex-metrika-module-nuxt3',
    ],
    i18n: {
        strategy: 'no_prefix',
        locales: [
            { code: 'en', language: 'en-US', file: 'en.ts' },
            { code: 'ru', language: 'ru-RU', file: 'ru.ts' }
        ],
        defaultLocale: 'ru',
        compilation: {
            strictMessage: false,
        },
    },
    runtimeConfig: {
        mode: process.env.MODE || 'development',
        db_password: process.env.DB_PASSWORD,
        tg_token: process.env.TG_TOKEN,
        tg_user: process.env.TG_USER
    },
    yandexMetrika: {
        id: 103237740,
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true
    },
    nitro: {
        experimental: {
            websocket: true
        }
    }
})
