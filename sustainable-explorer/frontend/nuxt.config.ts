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
        { path: '~/components/project', pathPrefix: false },
    ],

    imports: {
        dirs: ['composables/**'],
    },

    // Dev-only proxy so `yarn dev` can use relative /api/v1 paths.
    // In production, the frontend calls the API directly via
    // `runtimeConfig.public.apiBaseUrl` (set by NUXT_PUBLIC_API_BASE_URL).
    routeRules: {
        '/api/v1/**': {
            proxy: 'http://localhost:3030/api/v1/**',
        },
    },

    runtimeConfig: {
        // Server-side API base URL — used during SSR `useFetch` calls.
        // In Docker: set to `http://api:3030` via NUXT_API_BASE_URL.
        apiBaseUrl: process.env.NUXT_API_BASE_URL || 'http://localhost:3030',
        public: {
            // Client-side API base URL — the URL the browser will hit.
            // In dev: leave empty, Vite proxies /api/v1 via routeRules.
            // In prod: set to the externally-reachable API URL
            //   (e.g., `http://<host>:3030`) via NUXT_PUBLIC_API_BASE_URL.
            //   Nuxt automatically overrides public.* from NUXT_PUBLIC_* env vars.
            apiBaseUrl: '',
            // SSE (EventSource) must bypass the Nitro proxy — connect directly to the API.
            // Override via NUXT_PUBLIC_SSE_API_BASE_URL in production.
            sseApiBaseUrl: process.env.NUXT_PUBLIC_SSE_API_BASE_URL || 'http://localhost:3030',
            // Reverse-geocoding endpoint. Override via NUXT_PUBLIC_GEOCODER_URL.
            geocoderUrl: 'https://nominatim.openstreetmap.org/reverse',
            // Google Apps Script Web App URL that receives feedback submissions.
            // Leave empty to hide the feedback widget. Set via NUXT_PUBLIC_FEEDBACK_WEBHOOK_URL.
            feedbackWebhookUrl: process.env.NUXT_PUBLIC_FEEDBACK_WEBHOOK_URL || '',
            // Optional shared secret sent with feedback; must match SHARED_SECRET
            // in the Apps Script. Set via NUXT_PUBLIC_FEEDBACK_TOKEN.
            feedbackToken: process.env.NUXT_PUBLIC_FEEDBACK_TOKEN || '',
        },
    },

    app: {
        head: {
            title: 'Sustainability Atlas',
            meta: [
                { name: 'description', content: 'Explore sustainability data on Hedera Guardian' },
            ],
            link: [
                { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
                { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
                { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
            ],
        },
    },

    typescript: {
        strict: true,
    },

    compatibilityDate: '2025-01-01',

    experimental: {
        appManifest: false,
    },
});
