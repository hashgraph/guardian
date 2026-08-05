/**
 * Route middleware for pages that require an authenticated user.
 *
 * Apply per-page via definePageMeta({ middleware: 'auth' }). Unauthenticated
 * visitors are redirected home; on the client the sign-in modal is opened so
 * they can authenticate without losing context.
 */
export default defineNuxtRouteMiddleware(() => {
    const { isAuthenticated, openSignIn } = useAuth();

    if (!isAuthenticated.value) {
        if (import.meta.client) openSignIn();
        return navigateTo('/');
    }
});
