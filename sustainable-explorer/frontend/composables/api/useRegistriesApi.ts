import type { NetworkId } from '~/composables/useNetwork';

export type RegistrySortKey =
    | 'displayName'
    | 'registryDid'
    | 'relatedTopicId'
    | 'createdAt'
    | 'updatedAt'
    | 'sourceTimestamp'
    | 'geography'
    | 'law'
    | 'tags'
    | 'policies'
    | 'projects'
    | 'issuances';

export type RegistrySortDir = 'asc' | 'desc';

export interface RegistryStats {
    policyCount: number;
    projectCount: number;
    issuanceCount: number;
    userCount: number;
}

export interface RegistryDto {
    id: string;
    network: string;
    did: string;
    name: string;
    topicId: string | null;
    relatedTopicId: string | null;
    geography: string | null;
    law: string | null;
    tags: string | null;
    action: string | null;
    lang: string | null;
    sourceTimestamp: string | null;
    createdAt: string;
    updatedAt: string;
    stats: RegistryStats;
}

export interface RegistriesMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface RegistriesResponse {
    data: RegistryDto[];
    meta: RegistriesMeta;
}

export interface UseRegistriesApiOptions {
    page: Ref<number>;
    limit: Ref<number>;
    search: Ref<string>;
    network: Ref<NetworkId | string>;
    sortBy: Ref<RegistrySortKey | null>;
    sortDir: Ref<RegistrySortDir | null>;
    filters?: Ref<Record<string, any>>;
}

// Filter keys recognised by the backend registries endpoint.
const REGISTRY_FILTER_KEYS = ['displayName', 'did', 'id', 'tags', 'geography', 'law'] as const;

const emptyResponse = (limit: number): RegistriesResponse => ({
    data: [],
    meta: { page: 1, limit, total: 0, totalPages: 1 },
});

export const useRegistriesApi = (opts: UseRegistriesApiOptions) => {
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
        for (const key of REGISTRY_FILTER_KEYS) {
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
    const url = computed(() => `/api/v1/${opts.network.value}/registries`);

    // Use useAsyncData with a stable key so SSR payload is transferred to client
    const key = computed(() => {
        const q = buildQuery();
        return `registries:${opts.network.value}:${JSON.stringify(q)}`;
    });

    const { data, pending, error, refresh } = useAsyncData<RegistriesResponse>(
        key.value,
        async () => {
            try {
                const res = await $fetch<RegistriesResponse>(url.value, {
                    baseURL,
                    query: buildQuery(),
                });
                return res ?? emptyResponse(opts.limit.value);
            } catch (err) {
                console.error('[useRegistriesApi] fetch failed:', err);
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
