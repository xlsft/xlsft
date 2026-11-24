export default {
    globals: {
        themes: ['dark', 'light'],
        locales: ['ru', 'en'],
    },
    ai: {
        // порядок = приоритет: первый основной, остальные — фоллбеки (см. server/utils/useAiRegistry.ts)
        providers: ['deepseek', 'opencode'],
        // как часто проверять доступность моделей
        recheckMinutes: 10,
    },
    requests: {
        telegram: 5072212559,
    },
    captcha: {
        key: '2eb435c8-d342-4ec2-bfc0-ed74765c8864'
    },
    theme: {
        background: {
            dark: '#000000',
            light: '#FFFFFF'
        },
        font: {
            dark: '#FFFFFF',
            light: '#000000'
        },
        border: {
            dark: '#404040',
            light: '#c2c2c2'
        },
        accent: '#2b7fff'
    },
    cms: {
        project: 'd5cxszmz',
        api: '2026-02-27',
        dataset: 'production',
    },
    clarity: {
        endpoint: 'https://cv.xlsft.com/admin',
        dataset: 'cv',
    },
    metrics: {
        yandex: 103237740,
        gtag: 'GTM-TFT8VB5P',
    },
    head: {
        url: 'https://cv.xlsft.com',
        author: 'xlsft',
        address: {
            locality: 'Липецк',
            region: 'Липецкая область',
            postal: '398005',
            country: 'Россия',
        }
    },
    schema: {
        person: {
            fullname: 'Илья Торшин',
            firstname: 'Илья',
            lastname: 'Торшин',
            initials: 'Илья Т.',
            position: 'Senior Frontend Engineer'
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
            phone: '+7 (999) 750-66-23'
        }
    }
}
