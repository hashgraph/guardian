import type { NetworkId } from '~/composables/useNetwork';

export type ProjectSortKey =
    | 'name'
    | 'country'
    | 'methodology'
    | 'developer'
    | 'registry'
    | 'sector'
    | 'credits'
    | 'issuanceCount'
    | 'vintage'
    | 'sourceTimestamp'
    | 'createdAt'
    | 'updatedAt'
    | 'lifecycleStage'
    | 'expectedIssuanceYear';

export type ProjectSortDir = 'asc' | 'desc';

export interface ProjectListSummary {
    totalIssuances: number;
    uniqueCountries: number;
    uniqueRegistries: number;
}

export interface ProjectsMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ProjectsResponse {
    data: Record<string, any>[];
    meta: ProjectsMeta;
    summary: ProjectListSummary;
}

export interface ProjectFilterOptions {
    registries: string[];
    developers: string[];
    statuses: string[];
    sectors: string[];
    sectoralScopes: string[];
    vintages: string[];
    countries: string[];
}

export interface UseProjectsApiOptions {
    page: Ref<number>;
    limit: Ref<number>;
    search: Ref<string>;
    network: Ref<NetworkId | string>;
    sortBy: Ref<ProjectSortKey | null>;
    sortDir: Ref<ProjectSortDir | null>;
    filters?: Ref<Record<string, any>>;
}

// Filter keys recognised by the backend projects list endpoint.
const PROJECT_FILTER_KEYS = [
    'country', 'methodology', 'registry', 'registryDid', 'developer',
    'vintage', 'status', 'policyTopicId', 'instanceTopicId', 'sdgs',
    'sector', 'sectoralScope', 'vintageRange', 'methodologyId',
    'lifecycleStage', 'isPipeline', 'expectedIssuanceYearRange',
] as const;

const emptyResponse = (limit: number): ProjectsResponse => ({
    data: [],
    meta: { page: 1, limit, total: 0, totalPages: 1 },
    summary: { totalIssuances: 0, uniqueCountries: 0, uniqueRegistries: 0 },
});

export const useProjectsApi = (opts: UseProjectsApiOptions) => {
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
        for (const key of PROJECT_FILTER_KEYS) {
            const raw = filters[key];
            if (raw === null || raw === undefined) continue;
            const trimmed = String(raw).trim();
            if (trimmed) q[key] = trimmed;
        }
        return q;
    };

    const url = computed(() => `/api/v1/${opts.network.value}/projects`);

    const key = computed(() => {
        const q = buildQuery();
        return `projects:${opts.network.value}:${JSON.stringify(q)}`;
    });

    const { data, pending, error, refresh } = useAsyncData<ProjectsResponse>(
        key.value,
        async () => {
            try {
                const res = await $fetch<ProjectsResponse>(url.value, {
                    baseURL,
                    query: buildQuery(),
                });
                return res ?? emptyResponse(opts.limit.value);
            } catch (err) {
                console.error('[useProjectsApi] fetch failed:', err);
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

const emptyFilterOptions: ProjectFilterOptions = {
    registries: [], developers: [], statuses: [], sectors: [], sectoralScopes: [], vintages: [], countries: [],
};

/** Distinct filter-dropdown option values across the whole project set — fetched once per network. */
export const useProjectFilterOptions = (network: Ref<NetworkId | string>) => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const key = computed(() => `project-filter-options:${network.value}`);
    const url = computed(() => `/api/v1/${network.value}/projects/filter-options`);

    const { data, pending } = useAsyncData<ProjectFilterOptions>(
        key.value,
        () => $fetch<ProjectFilterOptions>(url.value, { baseURL }).catch(() => emptyFilterOptions),
        {
            watch: [network],
            default: () => emptyFilterOptions,
        },
    );

    return { filterOptions: computed(() => data.value ?? emptyFilterOptions), pending };
};
