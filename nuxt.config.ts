export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },
    modules: [
      '@nuxt/ui',
      'nuxt-studio',
      '@nuxt/scripts',
      '@nuxt/content'
    ],
    studio: {
        dev: true,
        route: '/admin',
        repository: {
            provider: 'github',
            repo: 'xlsft',
            owner: 'xlsft'
        }
    },
    content: {
        experimental: { nativeSqlite: true }
    },
    ui: {
        prefix: 'Nuxt'
    }
})