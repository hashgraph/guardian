import type { DashboardMintStatsDto } from '~/types/dashboard';
import { bucketMintSeries } from '~/lib/mint-series';

const EMPTY: DashboardMintStatsDto = {
    totalMinted: 0,
    mintSeries: [],
    bySector: [],
    byRegistry: [],
};

export function useMintStats(filters?: Ref<{ registry?: string; developer?: string }>) {
    const { network } = useNetwork();
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const query = computed(() => {
        const f = filters?.value ?? {};
        const q: Record<string, string> = {};
        if (f.registry && f.registry !== 'All Registries') q.registry = f.registry;
        if (f.developer && f.developer !== 'All Developers') q.developer = f.developer;
        return q;
    });

    const key = computed(() =>
        `mint-stats:${network.value}:${query.value.registry ?? ''}:${query.value.developer ?? ''}`,
    );

    const { data, pending } = useAsyncData<DashboardMintStatsDto>(
        key.value,
        () => $fetch<DashboardMintStatsDto>(
            `/api/v1/${network.value}/dashboard/mint-stats`,
            { baseURL, query: query.value },
        ).catch(() => EMPTY),
        {
            watch: [network, query],
            default: () => EMPTY,
        },
    );

    const mintStats = computed<DashboardMintStatsDto>(() => data.value ?? EMPTY);

    // Build a time-bucketed series (monthly → quarterly → yearly) from the
    // monthly series returned by the API, matching useDashboard's period API.
    function buildMintSeries(period: 'monthly' | 'quarterly' | 'yearly'): { label: string; value: number }[] {
        return bucketMintSeries(mintStats.value.mintSeries, period);
    }

    // Quick lookup: minted amount by sector label
    const mintedBySector = computed(() =>
        new Map(mintStats.value.bySector.map(e => [e.label, e.amount])),
    );

    // Quick lookup: minted amount by registry label
    const mintedByRegistry = computed(() =>
        new Map(mintStats.value.byRegistry.map(e => [e.label, e.amount])),
    );

    return {
        mintStats,
        mintPending: pending,
        buildMintSeries,
        mintedBySector,
        mintedByRegistry,
    };
}
