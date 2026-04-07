export default defineNuxtConfig({
    ssr: true,

    modules: ['@nuxtjs/i18n'],

    i18n: {
        strategy: 'no_prefix',
        defaultLocale: 'en',
        langDir: 'locales',
        lazy: true,
        locales: [
            { code: 'en', name: 'English', file: 'en.json' },
            { code: 'es', name: 'Español', file: 'es.json' },
        ],
        detectBrowserLanguage: false,
        bundle: {
            optimizeTranslationDirective: false,
        },
    },

    css: ['~/assets/css/main.css'],

    vite: {
        plugins: [
            // @ts-ignore
            import('@tailwindcss/vite').then((m) => m.default()),
        ],
    },

    components: [
        { path: '~/components/ui', pathPrefix: false },
        { path: '~/components/layout', pathPrefix: false },
        { path: '~/components/shared', pathPrefix: false },
    ],

    imports: {
        dirs: ['composables/**'],
    },

    routeRules: {
        '/api/v1/**': {
            proxy: 'http://localhost:3030/api/v1/**',
        },
    },

    runtimeConfig: {
        // Server-side API base URL — used during SSR `useFetch` calls so they
        // bypass the dev proxy and hit the API directly.
        apiBaseUrl: process.env.NUXT_API_BASE_URL || 'http://localhost:3030',
        public: {
            // Empty → client uses relative /api/v1 paths and dev proxy kicks in
            apiBaseUrl: '',
        },
    },

    app: {
        head: {
            title: 'Sustainable Explorer',
            meta: [
                { name: 'description', content: 'Explore sustainability data on Hedera Guardian' },
            ],
        },
    },

    typescript: {
        strict: true,
    },

    compatibilityDate: '2025-01-01',
});
