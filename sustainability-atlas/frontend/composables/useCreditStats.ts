export interface CreditStats {
    totalSupply: number;
    uniqueRegistries: number;
    uniqueProjects: number;
}

const EMPTY: CreditStats = { totalSupply: 0, uniqueRegistries: 0, uniqueProjects: 0 };

/**
 * Totals across the whole filtered issuance set, computed by the API.
 * Takes the same filter map as the list so the figures always describe the
 * same rows the table is paging through.
 */
export function useCreditStats(
    search: Ref<string>,
    filters: Ref<Record<string, string | string[]>>,
) {
    const { network } = useNetwork();
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const query = computed(() => {
        const q: Record<string, string> = {};
        for (const [key, value] of Object.entries(filters.value)) {
            if (Array.isArray(value)) {
                if (value.length) q[key] = value.join('|');
            } else if (value) {
                q[key] = value;
            }
        }
        if (search.value) q.search = search.value;
        return q;
    });

    const key = computed(() => `credit-stats:${network.value}:${JSON.stringify(query.value)}`);

    const { data, pending } = useAsyncData<CreditStats>(
        key.value,
        () => $fetch<CreditStats>(
            `/api/v1/${network.value}/credits/stats`,
            { baseURL, query: query.value },
        ).catch(() => EMPTY),
        {
            watch: [network, query],
            default: () => EMPTY,
        },
    );

    const stats = computed<CreditStats>(() => data.value ?? EMPTY);

    return { stats, pending };
}
