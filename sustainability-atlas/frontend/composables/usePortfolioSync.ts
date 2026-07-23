import type { WatchlistItem } from './usePortfolioWatchlist';

export function usePortfolioSync() {
    const { isAuthenticated } = useAuth();
    const { apiFetch } = useApiFetch();
    const { network } = useNetwork();
    const config = useRuntimeConfig();

    const baseURL = (): string =>
        import.meta.server
            ? (config.apiBaseUrl as string)
            : (config.public.apiBaseUrl as string);

    // readCsrfCookie() in useAuth.ts is a local closure (not exported).
    // Re-implemented here with the same regex.
    const readCsrfCookie = (): string => {
        if (!import.meta.client) return '';
        const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    async function hydrateFromApi(): Promise<{
        watchlist: WatchlistItem[];
        widgets: Record<string, boolean>;
        customCharts: { id?: string; title: string; type: string; xAxis: string; yAxis: string }[];
        watchlistFilters: Record<string, string>;
    } | null> {
        if (!isAuthenticated.value || !import.meta.client) return null;
        try {
            return await apiFetch('/api/v1/me/dashboard', {
                baseURL: baseURL(),
                credentials: 'include',
                query: { network: network.value },
            });
        } catch {
            return null;
        }
    }

    // One independent timer per type — a watchlist change does not reset the widget timer.
    const timers: Record<string, ReturnType<typeof setTimeout> | null> = {
        watchlist: null,
        widgets: null,
        custom_charts: null,
        watchlist_filters: null,
    };

    function pushType(
        type: 'watchlist' | 'widgets' | 'custom_charts' | 'watchlist_filters',
        layout: unknown,
        delay = 800,
    ): void {
        if (!isAuthenticated.value || !import.meta.client) return;
        // Capture the active network NOW, at schedule time — not inside the
        // setTimeout callback. Reading network.value there would attribute the
        // save to whichever network is active when the timer fires (up to
        // `delay` ms later), so a save queued just before a network switch
        // would land on the wrong network's row instead of the one it was
        // authored on.
        const targetNetwork = network.value;
        if (timers[type]) clearTimeout(timers[type]!);
        timers[type] = setTimeout(() => {
            void apiFetch('/api/v1/me/dashboard', {
                method: 'PUT',
                baseURL: baseURL(),
                credentials: 'include',
                headers: { 'x-csrf-token': readCsrfCookie() },
                body: { network: targetNetwork, type, layout },
            }).catch(() => {
                // Silently swallow. No local fallback (Portfolio has no
                // localStorage layer) — a failed save is only lost from the
                // server; the in-memory ref keeps the change for the rest of
                // this session, but a reload would revert to last-saved state.
            });
        }, delay);
    }

    return { hydrateFromApi, pushType };
}
