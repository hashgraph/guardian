/**
 * Route middleware for pages that require an authenticated user.
 *
 * Apply per-page via definePageMeta({ middleware: 'auth' }). Unauthenticated
 * visitors are redirected home; on the client the sign-in modal is opened so
 * they can authenticate without losing context.
 *
 * SSR guard: never issue a server-side 302 when the browser sent auth cookies.
 * SSR cannot reliably call the API (port conflicts, different internal URLs in
 * deployment), so user.value is null even for valid sessions. We defer to the
 * client, which uses the browser's own cookies through the proxy — always reliable.
 *
 * Client guard: wait until isAuthResolved before redirecting, so we don't kick
 * the user out during the brief async window of fetchMe().
 */
export default defineNuxtRouteMiddleware(() => {
    const { isAuthenticated, isAuthResolved, openSignIn } = useAuth();

    // SSR: only redirect if there are definitely no session cookies.
    // If cookies are present, the client will restore the session after hydration.
    if (import.meta.server) {
        const cookie = useRequestHeaders(['cookie']).cookie ?? '';
        const hasSession = /(?:^|;\s*)(access|refresh|csrf)=/.test(cookie);
        if (hasSession) return; // defer to client — session may be restorable
        return navigateTo('/');
    }

    // Client: auth is still being resolved — do nothing yet.
    if (!isAuthResolved.value) return;

    // Auth resolved and user is not authenticated — redirect and open sign-in.
    if (!isAuthenticated.value) {
        openSignIn();
        return navigateTo('/');
    }
});
