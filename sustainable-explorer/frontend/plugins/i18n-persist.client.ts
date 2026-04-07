// Persists the selected locale to localStorage and restores it on boot.
// Runs client-only so it won't interfere with SSR.
export default defineNuxtPlugin(async (nuxtApp) => {
    const { $i18n } = nuxtApp as any;
    if (!$i18n) return;

    const STORAGE_KEY = 'sx.locale';

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && saved !== $i18n.locale.value && $i18n.locales.value.some((l: any) => l.code === saved)) {
            await $i18n.setLocale(saved);
        }
    } catch {
        // localStorage unavailable
    }

    // Watch for locale changes and persist
    if (import.meta.client) {
        watch(
            () => $i18n.locale.value,
            (val: string) => {
                try {
                    localStorage.setItem(STORAGE_KEY, val);
                } catch {
                    // ignore
                }
            },
        );
    }
});
