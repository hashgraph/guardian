import type { Project } from '~/types/models';
import { mapApiProject } from '~/composables/useProjects';

export interface WatchlistBrowseFilters {
    search?: string;
    methodology?: string;
    registry?: string;
    sdgs?: string;
}

const LIMIT = 50;

/**
 * Paginated, server-filtered project browsing for the "Manage Watchlist"
 * modal — replaces loading the entire catalog via useProjects().fetchAll().
 * Pages accumulate into `items` as loadMore() is called (infinite scroll);
 * changing `filters` resets back to page 1. Fetch only starts once reset()
 * (or loadMore()) is called explicitly — not on composable creation — so
 * opening the Portfolio page doesn't fetch this list until the modal opens.
 */
export function useWatchlistBrowse(filters: Ref<WatchlistBrowseFilters>) {
    const { network } = useNetwork();
    const config = useRuntimeConfig();

    const baseURL = (): string =>
        import.meta.server
            ? (config.apiBaseUrl as string)
            : (config.public.apiBaseUrl as string);

    const page = ref(1);
    const items = ref<Project[]>([]);
    const total = ref(0);
    const pending = ref(false);

    const hasMore = computed(() => items.value.length < total.value);

    function buildQuery(p: number): Record<string, string | number> {
        const q: Record<string, string | number> = { page: p, limit: LIMIT };
        const f = filters.value;
        if (f.search?.trim()) q.search = f.search.trim();
        if (f.methodology) q.methodology = f.methodology;
        if (f.registry) q.registry = f.registry;
        if (f.sdgs) q.sdgs = f.sdgs;
        return q;
    }

    async function fetchPage(p: number): Promise<void> {
        pending.value = true;
        try {
            const res = await $fetch<{ data: Record<string, any>[]; meta: { total: number } }>(
                `/api/v1/${network.value}/projects`,
                { baseURL: baseURL(), query: buildQuery(p) },
            );
            const mapped = (res?.data ?? []).map(mapApiProject);
            items.value = p === 1 ? mapped : [...items.value, ...mapped];
            total.value = res?.meta?.total ?? 0;
        } catch {
            if (p === 1) { items.value = []; total.value = 0; }
        } finally {
            pending.value = false;
        }
    }

    async function loadMore(): Promise<void> {
        if (pending.value || !hasMore.value) return;
        page.value += 1;
        await fetchPage(page.value);
    }

    async function reset(): Promise<void> {
        page.value = 1;
        await fetchPage(1);
    }

    // A filter/search/network change invalidates accumulated pages.
    watch([network, filters], () => { void reset(); }, { deep: true });

    /**
     * (id, name) pairs for every project matching the current server filters
     * (search, methodology, registry, sdgs) — not just the currently-loaded
     * page(s). Backs "add all matching" via GET /projects/ids, so it doesn't
     * have to download full rows for projects beyond what's already loaded.
     */
    async function fetchAllMatchingIds(): Promise<{ id: string; name: string }[]> {
        try {
            const res = await $fetch<{ items: { id: string; name: string }[] }>(
                `/api/v1/${network.value}/projects/ids`,
                { baseURL: baseURL(), query: buildQuery(1) },
            );
            return res?.items ?? [];
        } catch {
            return [];
        }
    }

    return { items, total, hasMore, loadMore, reset, pending, fetchAllMatchingIds };
}
