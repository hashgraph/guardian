import type { WatchlistItem } from '~/composables/usePortfolioWatchlist';
import type { Project } from '~/types/models';
import { mapApiProject } from '~/composables/useProjects';
import { stableHash } from '~/lib/chart-colors';

/**
 * Batch-fetches full project records for exactly the watchlisted projects
 * (POST /projects/batch), instead of loading the entire catalog and filtering
 * client-side. Requires auth — the Portfolio page already gates on it.
 */
export function useWatchlistProjects(watchlistItems: Ref<WatchlistItem[]>) {
    const { network } = useNetwork();
    const { apiFetch } = useApiFetch();
    const config = useRuntimeConfig();

    const baseURL = (): string =>
        import.meta.server
            ? (config.apiBaseUrl as string)
            : (config.public.apiBaseUrl as string);

    const sourceTimestamps = computed(() =>
        [...new Set(watchlistItems.value.map(i => i.id))].sort(),
    );

    const key = computed(() =>
        `watchlist-projects:${network.value}:${stableHash(sourceTimestamps.value.join('|'))}:${sourceTimestamps.value.length}`,
    );

    const { data, pending } = useAsyncData<Record<string, any>[]>(
        key.value,
        async () => {
            if (sourceTimestamps.value.length === 0) return [];
            try {
                return await apiFetch<Record<string, any>[]>(`/api/v1/${network.value}/projects/batch`, {
                    method: 'POST',
                    baseURL: baseURL(),
                    credentials: 'include',
                    body: { sourceTimestamps: sourceTimestamps.value },
                });
            } catch {
                return [];
            }
        },
        {
            watch: [network, sourceTimestamps],
            default: () => [],
        },
    );

    const projects = computed<Project[]>(() => (data.value ?? []).map(mapApiProject));

    return { projects, pending };
}
