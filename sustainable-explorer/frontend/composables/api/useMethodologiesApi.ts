import type { NetworkId } from '~/composables/useNetwork';

export type MethodologySortKey =
    | 'name'
    | 'id'
    | 'registryDid'
    | 'registryName'
    | 'description'
    | 'version'
    | 'sourceTimestamp'
    | 'createdAt'
    | 'updatedAt'
    | 'projects'
    | 'issuances'
    | 'schemas';

export type MethodologySortDir = 'asc' | 'desc';

export interface MethodologyStats {
    projectCount: number;
    issuanceCount: number;
    schemaCount: number;
}

export interface MethodologyIssuance {
    tokenId: string;
    name: string | null;
    symbol: string | null;
    type: string | null;
    supply: number;
    mintDate: string | null;
    rawVc?: Record<string, any> | null;
}

export interface MethodologyDto {
    id: string;
    network: string;
    topicId: string | null;
    name: string;
    description: string | null;
    status: string | null;
    registryDid: string | null;
    registryName: string | null;
    version: string | null;
    policyTopicId: string | null;
    sectoralScopes: string[] | null;
    emissionReductionApproach: string | null;
    sourceTimestamp: string | null;
    createdAt: string;
    updatedAt: string;
    stats: MethodologyStats;
    issuances?: MethodologyIssuance[];
    totalIssued?: number;
    totalRetired?: number;
    totalActive?: number;
    decodeStatus?: 'success' | 'failed' | 'pending' | 'unknown';
}

export interface MethodologiesMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface MethodologiesResponse {
    data: MethodologyDto[];
    meta: MethodologiesMeta;
}

export interface UseMethodologiesApiOptions {
    page: Ref<number>;
    limit: Ref<number>;
    search: Ref<string>;
    network: Ref<NetworkId | string>;
    sortBy: Ref<MethodologySortKey | null>;
    sortDir: Ref<MethodologySortDir | null>;
    filters?: Ref<Record<string, any>>;
}

// Filter keys recognised by the backend methodologies endpoint.
const METHODOLOGY_FILTER_KEYS = ['name', 'id', 'description', 'decodeStatus', 'registryDid', 'registryName', 'version', 'policyTopicId'] as const;

const emptyResponse = (limit: number): MethodologiesResponse => ({
    data: [],
    meta: { page: 1, limit, total: 0, totalPages: 1 },
});

export const useMethodologiesApi = (opts: UseMethodologiesApiOptions) => {
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
        for (const key of METHODOLOGY_FILTER_KEYS) {
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
    const url = computed(() => `/api/v1/${opts.network.value}/methodologies`);

    // Use useAsyncData with a stable key so SSR payload is transferred to client
    const key = computed(() => {
        const q = buildQuery();
        return `methodologies:${opts.network.value}:${JSON.stringify(q)}`;
    });

    const { data, pending, error, refresh } = useAsyncData<MethodologiesResponse>(
        key.value,
        async () => {
            try {
                const res = await $fetch<MethodologiesResponse>(url.value, {
                    baseURL,
                    query: buildQuery(),
                });
                return res ?? emptyResponse(opts.limit.value);
            } catch (err) {
                console.error('[useMethodologiesApi] fetch failed:', err);
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

export interface UseMethodologyApiOptions {
    id: Ref<string>;
    network: Ref<string>;
}

export const useMethodologyApi = (opts: UseMethodologyApiOptions) => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const url = computed(() => `/api/v1/${opts.network.value}/methodologies/${opts.id.value}`);
    const key = computed(() => `methodology:${opts.network.value}:${opts.id.value}`);

    const { data, pending, error, refresh } = useAsyncData<MethodologyDto | null>(
        key.value,
        async () => {
            try {
                return await $fetch<MethodologyDto>(url.value, { baseURL });
            } catch (err) {
                console.error('[useMethodologyApi] fetch failed:', err);
                return null;
            }
        },
        {
            default: () => null,
            watch: [opts.id, opts.network],
        },
    );

    return { data, pending, error, refresh };
};
