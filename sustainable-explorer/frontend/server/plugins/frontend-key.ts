/**
 * Attaches the FRONTEND_SHARED_SECRET to server-side (SSR) API requests.
 *
 * When the API enforces data access (DATA_ACCESS_ENFORCE=true), the backend
 * DataAccessGuard allows requests from the trusted frontend. Browser requests
 * carry an Origin the API allow-lists, but SSR server-to-server fetches have NO
 * Origin — so they must present this shared secret header instead. The secret is
 * server-only (never exposed to the browser).
 *
 * No-op when FRONTEND_SHARED_SECRET is unset (the default), so this is inert
 * until data-access enforcement is switched on. The header is only added to
 * requests targeting the API base URL — never to third-party calls (geocoder,
 * feedback webhook, etc.).
 */
export default defineNitroPlugin(() => {
    const secret = process.env.FRONTEND_SHARED_SECRET;
    if (!secret) return;

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
                if (isApiTarget(url, options.baseURL as string | undefined)) {
                    options.headers = {
                        ...(options.headers as Record<string, string> | undefined),
                        'x-frontend-key': secret,
                    };
                }
            },
        });
    } catch (err) {
        console.error('[frontend-key] failed to install SSR API key header:', err);
    }
});
