export default defineNuxtConfig({
    ssr: true,

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

    routeRules: {
        '/api/v1/**': {
            proxy: 'http://localhost:3030/api/v1/**',
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
