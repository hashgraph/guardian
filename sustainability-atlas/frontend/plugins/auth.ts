/**
 * Hydrates the current user once at app startup so SSR renders auth-aware markup.
 *
 * Runs on the server (forwarding the request cookies) and the result is
 * transferred to the client via useState — so the client does NOT re-fetch.
 *
 * Optimisation: on the server we only call /auth/me when an auth cookie is
 * actually present, so guest page loads incur zero extra API round-trips.
 */
export default defineNuxtPlugin(async () => {
    const { user, fetchMe } = useAuth();

    // Already hydrated (client after SSR payload transfer) — nothing to do.
    if (user.value) return;

    if (import.meta.server) {
        const cookie = useRequestHeaders(['cookie']).cookie || '';
        const hasAuthCookie = /(?:^|;\s*)(access|refresh)=/.test(cookie);
        if (!hasAuthCookie) return; // guest — skip the API call
    }

    await fetchMe();
});
