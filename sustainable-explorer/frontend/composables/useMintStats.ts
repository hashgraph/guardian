import type { DashboardMintStatsDto } from '~/types/dashboard';

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
        const monthly = mintStats.value.mintSeries;
        if (monthly.length === 0) return [];

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];

        const buckets = new Map<string, { sortKey: string; label: string; value: number }>();

        for (const entry of monthly) {
            const d = new Date(entry.month);
            if (isNaN(d.getTime())) continue;
            const val = entry.amount;
            let sortKey: string;
            let label: string;

            if (period === 'yearly') {
                sortKey = String(d.getFullYear());
                label = sortKey;
            } else if (period === 'quarterly') {
                const q = Math.floor(d.getMonth() / 3);
                sortKey = `${d.getFullYear()}-Q${q}`;
                label = `${quarterNames[q]} '${String(d.getFullYear()).slice(2)}`;
            } else {
                sortKey = entry.month.slice(0, 7);
                label = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
            }

            if (!buckets.has(sortKey)) buckets.set(sortKey, { sortKey, label, value: 0 });
            buckets.get(sortKey)!.value += val;
        }

        return [...buckets.values()]
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(e => ({ label: e.label, value: e.value }));
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
