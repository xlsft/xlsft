import { createRequire } from 'node:module'
import tailwindcss from '@tailwindcss/vite'
const satoriRequire = createRequire(createRequire(import.meta.url).resolve('satori'))

const cdn = 's3.ru1.storage.beget.cloud'

const site = {
    url: 'https://cv.xlsft.com',
    author: 'xlsft',
    address: {
        locality: 'Санкт-Петербург',
        region: 'Ленинградская область',
        postal: '195112',
        country: 'Россия',
    },
}

const metrics = {
    yandex: 103237740,
    gtag: 'GTM-TFT8VB5P',
}

export default defineNuxtConfig({
    compatibilityDate: '2025-05-15',
    devtools: { enabled: true },
    css: ['~/assets/css/main.css'],
    vite: { plugins: [tailwindcss() as any] },
    site: { url: site.url },
    nitro: {
        preset: 'node-cluster',
        compressPublicAssets: true,
        storage: {
            'chat:requests': { driver: 'fs', base: './.data/chat-requests' },
            'ipx': { driver: 'fs', base: './.data/ipx' },
        },
        externals: {
            traceInclude: [satoriRequire.resolve('harfbuzzjs/hb.wasm')]
        }
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
                'content-security-policy': 'default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https:; style-src \'self\' \'unsafe-inline\' https:; img-src \'self\' data: blob: https:; font-src \'self\' data:; connect-src \'self\' https: wss:; frame-src https:; worker-src \'self\' blob:; frame-ancestors \'self\'; base-uri \'self\'; form-action \'self\''
            }
        },
        '/api/**': { cache: false },
        '/vendor/**': { cache: false },
        '/_ipx/**': { cache: false, headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
        '/_fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
        '/api/sitemap': { cache: { maxAge: 3600, swr: true, staleMaxAge: 86400 } },
    },
    app: {
        head: {
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1',
            meta: [
                { property: 'business:contact_data:locality', content: site.address.locality },
                { property: 'business:contact_data:region', content: site.address.region },
                { property: 'business:contact_data:postal_code', content: site.address.postal },
                { property: 'business:contact_data:country_name', content: site.address.country },
                { name: 'author', content: site.author },
                { name: 'copyright', content: `${site.author} @ ${new Date().getFullYear()}` },
                { name: 'robots', content: 'index, follow' }
            ],
            link: [
                { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
                { rel: 'icon', type: 'image/png', href: '/favicon.png' },
                { rel: 'preconnect', href: `https://${cdn}`, crossorigin: '' },
                { rel: 'preconnect', href: 'https://mc.yandex.ru', crossorigin: '' },
            ]
        },
    },
    fonts: {
        families: [
            {
                name: 'Cascadia Mono',
                weights: [200, 300, 400, 500, 600, 700, 800, 900],
                global: true,
                preload: true,
                provider: 'google'
            },
        ],
    },
    hooks: {
        'imports:extend'(imports) {
            for (let i = imports.length - 1; i >= 0; i -= 1) {
                const item = imports[i]
                if (item?.name === 'options' && item.from.includes('@nuxt/ui/dist/runtime/composables/useResizable')) {
                    imports.splice(i, 1)
                }
            }
        }
    },
    modules: [
        '@nuxtjs/i18n',
        '@pinia/nuxt',
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
    serverHandlers: [{ route: '/_ipx/**', handler: '~~/server/handlers/ipx.ts' }],
    image: {
        domains: [cdn],
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
        github: { token: '' },
        twenty: { url: '', token: '' },
        hcaptcha: { secret: '' },
        deepseek: { token: '', url: 'https://api.deepseek.com', models: '' },
        ai: {
            providers: ['deepseek', 'opencode'],
            recheck: 10,
            secret: '',
            mcp: '',
            debug: false,
            opencode: { bin: 'opencode', home: '' },
        },
        searxng: { url: '' },
        libreoffice: { bin: 'soffice' },
        redis: { url: '' },
        ipx: { domains: [cdn] },
        cache: { cv: 259200, ipx: 2592000 },
        public: {
            site,
            metrics,
            locales: ['ru', 'en'],
            themes: ['dark', 'light'],
            theme: {
                background: { dark: '#000000', light: '#FFFFFF' },
                font: { dark: '#FFFFFF', light: '#000000' },
                border: { dark: '#404040', light: '#c2c2c2' },
                accent: '#2b7fff',
            },
            schema: {
                person: {
                    fullname: 'Илья Торшин',
                    firstname: 'Илья',
                    lastname: 'Торшин',
                    initials: 'Илья Т.',
                    position: 'Senior Frontend Engineer',
                },
                organization: {
                    name: 'xlsft',
                    legalName: 'ИП Торшин Илья Евгеньевич',
                    legalAddress: '398005, Липецкая область, Г.Липецк, Ул.Суворова, д.3, кв.19',
                    inn: '482308004814',
                    ogrn: '323480000011992',
                    url: 'https://xlsft.com',
                    email: 'dev@xlsft.com',
                    logo: 'https://cdn.sanity.io/images/d5cxszmz/production/dd1cb4829f950c4e116d511ccf77af3b5c2ed26a-480x100.svg',
                    phone: '+7 (999) 750-66-23',
                },
            },
        },
    },
    $development: {
        runtimeConfig: {
            ai: { secret: 'dev-mcp-secret' },
            searxng: { url: 'http://127.0.0.1:8890' },
        },
    },
    yandexMetrika: {
        id: metrics.yandex,
        metrikaUrl: '/vendor/metrika',
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: false
    },
    gtag: {
        id: metrics.gtag,
        url: '/vendor/gtag/js'
    },
    sitemap: {
        sources: [
            '/api/sitemap',
        ]
    },
    experimental: {
        typescriptPlugin: true
    },
    typescript: {
        tsConfig: { include: ['../test/**/*', '../vitest.config.ts'] },
    },
    ogImage: {
        componentDirs: ['og'],
    }
})
