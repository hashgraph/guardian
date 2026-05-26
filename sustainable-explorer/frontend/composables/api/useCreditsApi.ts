import type { NetworkId } from '~/composables/useNetwork';

export type CreditSortKey =
    | 'name'
    | 'symbol'
    | 'type'
    | 'supply'
    | 'registry'
    | 'mintDate';

export type CreditSortDir = 'asc' | 'desc';

export interface CreditDto {
    tokenId: string;
    name: string | null;
    symbol: string | null;
    type: 'Fungible' | 'Non-Fungible' | null;
    supply: number;
    projectId: string | null;
    project: string | null;
    methodologyId: string | null;
    methodology: string | null;
    registry: string | null;
    registryDid: string | null;
    mintDate: string | null;
}

export interface CreditsMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface CreditsResponse {
    data: CreditDto[];
    meta: CreditsMeta;
}

export interface UseCreditsApiOptions {
    page: Ref<number>;
    limit: Ref<number>;
    search: Ref<string>;
    network: Ref<NetworkId | string>;
    sortBy: Ref<CreditSortKey | null>;
    sortDir: Ref<CreditSortDir | null>;
    filters?: Ref<Record<string, any>>;
}

// Filter keys recognised by the backend credits endpoint.
const CREDIT_FILTER_KEYS = ['type', 'registry', 'registryDid', 'tokenId', 'projectKey'] as const;

const emptyResponse = (limit: number): CreditsResponse => ({
    data: [],
    meta: { page: 1, limit, total: 0, totalPages: 1 },
});

export const useCreditsApi = (opts: UseCreditsApiOptions) => {
    const config = useRuntimeConfig();
    // Server uses full API URL; client uses relative path (proxied by Nuxt)
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const buildQuery = (): Record<string, string | number> => {
        const q: Record<string, string | number> = {
            page: opts.page.value,
            limit: opts.limit.value,
        };
        const search = opts.search.value?.trim();
        if (search) q.search = search;
        if (opts.sortBy.value && opts.sortDir.value) {
            q.sortBy = opts.sortBy.value;
            q.sortDir = opts.sortDir.value;
        }
        const filters = opts.filters?.value ?? {};
        for (const key of CREDIT_FILTER_KEYS) {
            const raw = filters[key];
            if (raw === null || raw === undefined) continue;
            if (typeof raw === 'string') {
                const trimmed = raw.trim();
                if (trimmed) q[key] = trimmed;
            } else if (typeof raw === 'number') {
                q[key] = raw;
            }
        }
        return q;
    };

    // Network is in the URL path, not a query param
    const url = computed(() => `/api/v1/${opts.network.value}/credits`);

    // Use useAsyncData with a stable key so SSR payload is transferred to client
    const key = computed(() => {
        const q = buildQuery();
        return `credits:${opts.network.value}:${JSON.stringify(q)}`;
    });

    const { data, pending, error, refresh } = useAsyncData<CreditsResponse>(
        key.value,
        async () => {
            try {
                const res = await $fetch<CreditsResponse>(url.value, {
                    baseURL,
                    query: buildQuery(),
                });
                return res ?? emptyResponse(opts.limit.value);
            } catch (err) {
                console.error('[useCreditsApi] fetch failed:', err);
                return emptyResponse(opts.limit.value);
            }
        },
        {
            default: () => emptyResponse(opts.limit.value),
            watch: [
                opts.page,
                opts.limit,
                opts.search,
                opts.network,
                opts.sortBy,
                opts.sortDir,
                ...(opts.filters ? [opts.filters] : []),
            ],
        },
    );

    return { data, pending, error, refresh };
};
