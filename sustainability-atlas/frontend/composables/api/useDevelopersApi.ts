import type { NetworkId } from '~/composables/useNetwork';

export type DeveloperSortKey =
    | 'name'
    | 'projects'
    | 'countries'
    | 'totalIssued'
    | 'totalRetired'
    | 'country';

export type DeveloperSortDir = 'asc' | 'desc';

export interface DeveloperDto {
    id: string;
    network: string;
    name: string;
    country: string | null;
    countries: number;
    projects: number;
    registries: string[];
    categories: string[];
    totalIssued: number;
    totalRetired: number;
}

export interface DevelopersMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface DevelopersResponse {
    data: DeveloperDto[];
    meta: DevelopersMeta;
}

export interface UseDevelopersApiOptions {
    page: Ref<number>;
    limit: Ref<number>;
    search: Ref<string>;
    network: Ref<NetworkId | string>;
    sortBy: Ref<DeveloperSortKey | null>;
    sortDir: Ref<DeveloperSortDir | null>;
    filters?: Ref<Record<string, any>>;
}

const DEVELOPER_FILTER_KEYS = ['country'] as const;

const emptyResponse = (limit: number): DevelopersResponse => ({
    data: [],
    meta: { page: 1, limit, total: 0, totalPages: 1 },
});

export const useDevelopersApi = (opts: UseDevelopersApiOptions) => {
    const config = useRuntimeConfig();
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
        for (const key of DEVELOPER_FILTER_KEYS) {
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

    const url = computed(() => `/api/v1/${opts.network.value}/developers`);
    const key = computed(() => `developers:${opts.network.value}:${JSON.stringify(buildQuery())}`);

    const { data, pending, error, refresh } = useAsyncData<DevelopersResponse>(
        key.value,
        async () => {
            try {
                const res = await $fetch<DevelopersResponse>(url.value, {
                    baseURL,
                    query: buildQuery(),
                });
                return res ?? emptyResponse(opts.limit.value);
            } catch (err) {
                console.error('[useDevelopersApi] fetch failed:', err);
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
