import type { DashboardSummaryDto } from '~/types/dashboard';

const EMPTY: DashboardSummaryDto = {
    totals: {
        registries: 0,
        methodologies: 0,
        projects: 0,
        filteredRegistries: 0,
        filteredMethodologies: 0,
    },
    filterOptions: { developers: [], registries: [] },
    countries: [],
    registries: [],
    sectors: [],
    vintages: [],
    countrySectors: [],
    countryRegistries: [],
    mapPoints: [],
    statuses: [],
    lifecycleStages: [],
    methodologies: [],
    portfolio: {
        totalIssued: 0,
        totalRetired: 0,
        totalActive: 0,
        avgVintageYear: null,
        avgCreditingPeriodYears: null,
    },
    developers: [],
    registryStatuses: [],
};

/**
 * Every per-project aggregate the dashboard renders, in one server-side call.
 *
 * Resolved via useAsyncData so the aggregates are available during SSR, and
 * exposes `pending` so the stat cards can show a skeleton until they land.
 */
export function useDashboardSummary(
    filters?: Ref<{ developer?: string; registry?: string; registryDid?: string }>,
) {
    const { network } = useNetwork();
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    // 'All Developers' / 'All Registries' are the UI's no-filter sentinels and
    // must not be sent as real filter values.
    const query = computed(() => {
        const f = filters?.value ?? {};
        const q: Record<string, string> = {};
        if (f.registry && f.registry !== 'All Registries') q.registry = f.registry;
        if (f.developer && f.developer !== 'All Developers') q.developer = f.developer;
        if (f.registryDid) q.registryDid = f.registryDid;
        return q;
    });

    const key = computed(() => `dashboard-summary:${network.value}:${JSON.stringify(query.value)}`);

    const { data, pending, error } = useAsyncData<DashboardSummaryDto>(
        key.value,
        () => $fetch<DashboardSummaryDto>(
            `/api/v1/${network.value}/dashboard/summary`,
            { baseURL, query: query.value },
        ).catch(() => EMPTY),
        {
            watch: [network, query],
            default: () => EMPTY,
        },
    );

    const summary = computed<DashboardSummaryDto>(() => data.value ?? EMPTY);

    return { summary, pending, error };
}
