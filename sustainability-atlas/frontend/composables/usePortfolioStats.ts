import type { PortfolioStatsDto } from '~/types/dashboard';
import { stableHash } from '~/lib/chart-colors';

const EMPTY: PortfolioStatsDto = {
    totalMinted: 0,
    byProjectKey: [],
    mintSeries: [],
    recentIssuances: [],
};

/**
 * Server-aggregated credit stats for a watchlist's project keys
 * (POST /portfolio/stats) — replaces fetching raw credits network-wide and
 * summing client-side. Requires auth — the Portfolio page already gates on it.
 */
export function usePortfolioStats(projectKeys: Ref<string[]>) {
    const { network } = useNetwork();
    const { apiFetch } = useApiFetch();
    const config = useRuntimeConfig();

    const baseURL = (): string =>
        import.meta.server
            ? (config.apiBaseUrl as string)
            : (config.public.apiBaseUrl as string);

    const sortedKeys = computed(() => [...new Set(projectKeys.value)].sort());

    const key = computed(() =>
        `portfolio-stats:${network.value}:${stableHash(sortedKeys.value.join('|'))}:${sortedKeys.value.length}`,
    );

    const { data, pending } = useAsyncData<PortfolioStatsDto>(
        key.value,
        async () => {
            if (sortedKeys.value.length === 0) return EMPTY;
            return apiFetch<PortfolioStatsDto>(`/api/v1/${network.value}/portfolio/stats`, {
                method: 'POST',
                baseURL: baseURL(),
                credentials: 'include',
                body: { projectKeys: sortedKeys.value },
            }).catch(() => EMPTY);
        },
        {
            watch: [network, sortedKeys],
            default: () => EMPTY,
        },
    );

    const stats = computed<PortfolioStatsDto>(() => data.value ?? EMPTY);

    return { stats, pending };
}
