/**
 * Authenticated fetch wrapper with silent token-refresh on 401.
 *
 * Access tokens are short-lived (~15 min). When a client-side request returns
 * 401, this wrapper transparently calls POST /auth/refresh once (rotating the
 * refresh cookie), then retries the original request a single time. If refresh
 * fails, the auth user state is cleared so the UI reflects sign-out.
 *
 * Concurrent 401s share ONE in-flight refresh (no refresh storm). SSR requests
 * never refresh — a 401 during SSR means the forwarded cookie is genuinely
 * invalid, so it propagates and the guest experience renders.
 */

// Client-only singleton: the module is evaluated once in the browser, so this
// shared promise coalesces concurrent refreshes. Never used during SSR.
let refreshing: Promise<boolean> | null = null;

export const useApiFetch = () => {
    const config = useRuntimeConfig();
    const user = useState<unknown>('auth-user');

    const baseURL = (): string =>
        import.meta.server
            ? (config.apiBaseUrl as string)
            : (config.public.apiBaseUrl as string);

    const freshCsrf = (): string => {
        if (import.meta.server) return '';
        const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    async function doRefresh(): Promise<boolean> {
        try {
            await $fetch('/api/v1/auth/refresh', {
                method: 'POST',
                baseURL: baseURL(),
                credentials: 'include',
                headers: { 'x-csrf-token': freshCsrf() },
            });
            return true;
        } catch {
            user.value = null; // refresh failed → session is dead
            return false;
        }
    }

    function tryRefresh(): Promise<boolean> {
        if (!refreshing) {
            refreshing = doRefresh().finally(() => { refreshing = null; });
        }
        return refreshing;
    }

    /**
     * Drop-in replacement for $fetch on authenticated calls. Same signature; adds
     * a single 401 → refresh → retry on the client. On retry, a fresh CSRF header
     * is injected (the refresh rotated the csrf cookie) so mutating calls succeed.
     */
    async function apiFetch<T>(url: string, opts: Record<string, unknown> = {}): Promise<T> {
        try {
            return await $fetch<T>(url, opts);
        } catch (err: unknown) {
            const e = err as { response?: { status?: number }; statusCode?: number };
            const status = e?.response?.status ?? e?.statusCode;
            if (status === 401 && import.meta.client && !opts.__retried) {
                const ok = await tryRefresh();
                if (ok) {
                    const headers = { ...(opts.headers as Record<string, string> | undefined), 'x-csrf-token': freshCsrf() };
                    return await $fetch<T>(url, { ...opts, headers, __retried: true });
                }
            }
            throw err;
        }
    }

    /**
     * Like apiFetch, but for raw/blob responses (e.g. file downloads) that can't
     * go through $fetch's JSON parsing. Returns the Response itself; callers
     * inspect res.ok/res.status and read the body (.blob(), .json(), ...).
     */
    async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
        const method = (init.method ?? 'GET').toUpperCase();
        const withCsrf = (headers?: HeadersInit): HeadersInit => {
            if (method === 'GET' || method === 'HEAD') return headers ?? {};
            return { ...(headers as Record<string, string> | undefined), 'x-csrf-token': freshCsrf() };
        };

        let res = await fetch(input, { ...init, credentials: 'include', headers: withCsrf(init.headers) });

        if (res.status === 401 && import.meta.client) {
            const ok = await tryRefresh();
            if (ok) {
                res = await fetch(input, { ...init, credentials: 'include', headers: withCsrf(init.headers) });
            }
        }
        return res;
    }

    return { apiFetch, authFetch };
};
