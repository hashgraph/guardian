/**
 * Route middleware for admin-only pages (/admin/**).
 *
 * Apply per-page via definePageMeta({ middleware: 'admin' }). Non-admins are
 * redirected home; unauthenticated visitors additionally get the sign-in modal.
 */
export default defineNuxtRouteMiddleware(() => {
    const { isAuthenticated, isAdmin, openSignIn } = useAuth();

    if (!isAuthenticated.value) {
        if (import.meta.client) openSignIn();
        return navigateTo('/');
    }
    if (!isAdmin.value) {
        return navigateTo('/');
    }
});
