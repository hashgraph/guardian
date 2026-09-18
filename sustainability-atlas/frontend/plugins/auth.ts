/**
 * Restores the authenticated user state on the client after hydration.
 *
 * IMPORTANT: SSR fetchMe() is intentionally skipped here.
 * SSR calls to the API go directly to config.apiBaseUrl (bypassing the Nitro
 * proxy), which is unreliable across environments — port conflicts on machines
 * running multiple systems, different internal URLs in deployment, etc.
 *
 * Instead, we let the client always perform the session check via the browser's
 * own cookies through the Nginx/proxy layer, which is the path that always works.
 *
 * On the client:
 *   - If SSR somehow already populated user (rare, local-dev only): mark resolved immediately.
 *   - Otherwise: call fetchMe(), which handles silent token refresh on 401 and
 *     sets isAuthResolved = true in its finally block when done.
 */
export default defineNuxtPlugin(async () => {
    const { user, fetchMe, isAuthResolved } = useAuth();

    // Skip entirely on the server — client hydration handles everything.
    if (import.meta.server) return;

    // SSR populated user state (only happens reliably on single-system dev machines).
    // Mark resolved immediately so UI doesn't show the skeleton unnecessarily.
    if (user.value) {
        isAuthResolved.value = true;
        return;
    }

    // Attempt to restore session from cookies. Handles 401 → silent refresh retry
    // internally. Sets isAuthResolved = true in its finally block.
    await fetchMe();
});
