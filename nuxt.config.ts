import tailwindcss from "@tailwindcss/vite";
import config from './global.config'

export default defineNuxtConfig({
    compatibilityDate: '2025-05-15',
    devtools: { enabled: true },
    css: ['~/assets/css/main.css'],
    vite: { plugins: [ tailwindcss() as any ] },
    site: { url: config.head.url },
    nitro: {
        preset: 'node-cluster',
        compressPublicAssets: true
    },
    routeRules: {
        '/**': {
            cache: { maxAge: 600, swr: true, staleMaxAge: 86400 },
            headers: {
                'x-content-type-options': 'nosniff',
                'cross-origin-opener-policy': 'same-origin',
                'x-frame-options': 'SAMEORIGIN',
                'referrer-policy': 'strict-origin-when-cross-origin',
                'permissions-policy': 'camera=(), microphone=(), geolocation=()',
                'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src https:; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
            }
        },
        '/api/**': { cache: false },
        '/api/sitemap': { cache: { maxAge: 3600, swr: true, staleMaxAge: 86400 } },
        '/api/repo/**': { cache: { maxAge: 3600, swr: true, staleMaxAge: 86400 } },
    },
    app: {
        head: {
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1',
            meta: [
                { property: 'business:contact_data:locality', content: config.head.address.locality },
                { property: 'business:contact_data:region', content: config.head.address.region },
                { property: 'business:contact_data:postal_code', content: config.head.address.postal },
                { property: 'business:contact_data:country_name', content: config.head.address.country },
                { name: 'author', content: config.head.author },
                { name: 'copyright', content: `${config.head.author} @ ${new Date().getFullYear()}` },
                { name: 'robots', content: 'index, follow' }
            ],
            link: [
                { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
                { rel: 'icon', type: 'image/png', href: '/favicon.png' },
                { rel: 'preconnect', href: 'https://fucosukalekob.begetcdn.cloud', crossorigin: '' },
            ]
        },
    },
    fonts: {
        families: [
            {
                name: 'Cascadia Mono',
                weights: [200, 300, 400, 500, 600, 700, 800, 900],
                global: true,
                provider: 'google'
            },
        ],
    },
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
    modules: [
      '@nuxtjs/i18n',
      'yandex-metrika-module-nuxt3',
      '@nuxt/ui',
      '@crumbleerp/clarity',
      '@nuxt/fonts',
      '@nuxtjs/seo',
      '@nuxt/image',
      '@nuxtjs/mdc',
      'nuxt-og-image',
      'nuxt-gtag',
    ],
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
        bundle: {
            optimizeTranslationDirective: false
        }
    },
    ui: {
        prefix: 'Nuxt',
    },
    mdc: {
        headings: {
            anchorLinks: false
        }
    },
    colorMode: {
        preference: 'dark',
        fallback: 'dark',
    },
    runtimeConfig: {
        public: { config }
    },
    yandexMetrika: {
        id: config.metrics.yandex,
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: false
    },
    gtag: {
        id: config.metrics.gtag
    },
    sitemap: {
        sources: [
            '/api/sitemap',
        ]
    },
    experimental: {
        typescriptPlugin: true
    },
    ogImage: {
        componentDirs: ['atoms/og'],
    }
})
