/**
 * Applies a default timeout to server-side (SSR) API requests, so one
 * unresponsive endpoint rejects and falls back to its composable's default
 * rather than stalling the whole render.
 *
 * Set above API_STATEMENT_TIMEOUT_MS so the API reports a cancelled query
 * before this fires. Scoped to API targets, leaving third-party calls alone.
 */
const DEFAULT_SSR_API_TIMEOUT_MS = 20_000;

export default defineNitroPlugin(() => {
    const timeout = parseInt(
        process.env.NUXT_SSR_API_TIMEOUT_MS || String(DEFAULT_SSR_API_TIMEOUT_MS),
        10,
    );
    if (!Number.isFinite(timeout) || timeout <= 0) return;

    const apiBase = process.env.NUXT_API_BASE_URL || 'http://localhost:3030';

    const isApiTarget = (url: string, baseURL?: string): boolean => {
        if (baseURL && baseURL.startsWith(apiBase)) return true;
        if (url.startsWith(apiBase)) return true;
        if (!baseURL && url.startsWith('/api/v1')) return true;
        return false;
    };

    try {
        const original = globalThis.$fetch;
        globalThis.$fetch = original.create({
            onRequest({ request, options }) {
                const url = typeof request === 'string' ? request : (request as Request).url;
                // Don't override an explicit per-call timeout.
                if (options.timeout === undefined && isApiTarget(url, options.baseURL as string | undefined)) {
                    options.timeout = timeout;
                }
            },
        });
    } catch (err) {
        console.error('[api-timeout] failed to install SSR fetch timeout:', err);
    }
});
