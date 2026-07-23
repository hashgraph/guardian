// Persists the selected locale to a cookie and restores it on boot.
//
// Runs universally (server + client), unlike the old client-only version:
// a client-only restore only takes effect *after* SSR has already painted
// the default locale, so the server-rendered flag/text and the
// client-corrected ones briefly disagree. Vue's hydration then has to
// patch that mismatch — text nodes reconcile reliably, but the flag
// `<img>`'s src (set via a child component's own computed prop) was
// observed getting stuck on the SSR value after that correction. Reading
// the same cookie on the server means SSR renders the right locale from
// the first byte, so there is nothing to reconcile after hydration.
export default defineNuxtPlugin(async (nuxtApp) => {
    const { $i18n } = nuxtApp as any;
    if (!$i18n) return;

    const localeCookie = useCookie<string | null>('sx.locale', {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
    });

    // One-time migration for users who picked a language under the old
    // client-only (localStorage-based) version of this plugin — after this,
    // the cookie is the single source of truth.
    if (import.meta.client && !localeCookie.value) {
        try {
            const legacy = localStorage.getItem('sx.locale');
            if (legacy) localeCookie.value = legacy;
        } catch {
            // localStorage unavailable
        }
    }

    const saved = localeCookie.value;
    if (saved && saved !== $i18n.locale.value && $i18n.locales.value.some((l: any) => l.code === saved)) {
        await $i18n.setLocale(saved);
    }

    watch(
        () => $i18n.locale.value,
        (val: string) => {
            localeCookie.value = val;
        },
    );
});
