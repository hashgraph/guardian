/**
 * Route middleware for admin-only pages (/admin/**).
 *
 * Apply per-page via definePageMeta({ middleware: 'admin' }). Non-admins are
 * redirected home; unauthenticated visitors additionally get the sign-in modal.
 *
 * SSR guard: same pattern as middleware/auth.ts — do not redirect on the server
 * if the browser sent auth cookies, as SSR cannot reliably verify the session.
 *
 * Client guard: wait until isAuthResolved before applying role checks.
 */
export default defineNuxtRouteMiddleware(() => {
    const { isAuthenticated, isAdmin, isAuthResolved, openSignIn } = useAuth();

    // SSR: only redirect if no session cookies are present.
    if (import.meta.server) {
        const cookie = useRequestHeaders(['cookie']).cookie ?? '';
        const hasSession = /(?:^|;\s*)(access|refresh|csrf)=/.test(cookie);
        if (hasSession) return;
        return navigateTo('/');
    }

    // Client: wait for auth to resolve before checking roles.
    if (!isAuthResolved.value) return;

    if (!isAuthenticated.value) {
        openSignIn();
        return navigateTo('/');
    }
    if (!isAdmin.value) {
        return navigateTo('/');
    }
});
