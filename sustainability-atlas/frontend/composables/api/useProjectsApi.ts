import { isAbortError } from '~/lib/utils';
import type { NetworkId } from '~/composables/useNetwork';
import type { MintSerials, MintTransactions } from '~/types/models';

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
    methodologies: { topicId: string; name: string | null; version: string | null }[];
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
        // `signal` is Nuxt's own dedupe:'cancel' AbortSignal. Forwarding it to
        // $fetch tears the superseded request down at the network layer instead
        // of letting it run to completion for a result Nuxt will discard.
        async (_nuxtApp, { signal }) => {
            try {
                const res = await $fetch<ProjectsResponse>(url.value, {
                    baseURL,
                    query: buildQuery(),
                    signal,
                });
                return res ?? emptyResponse(opts.limit.value);
            } catch (err) {
                // An abort means a newer search superseded this one, not a
                // failure. Returning emptyResponse here would risk flashing an
                // empty list; rethrowing lets Nuxt's dedupe drop it silently.
                if (isAbortError(err)) throw err;
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
    registries: [], developers: [], statuses: [], sectors: [], sectoralScopes: [], vintages: [], countries: [], methodologies: [],
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

/**
 * On-demand loader for the NFT serials produced by a single mint event.
 *
 * Must be called during setup: it resolves the runtime config once, up front.
 * Resolving it inside the returned function instead would throw "nuxt instance
 * unavailable" when fired from a click handler, which is outside the Nuxt
 * context — and because that throw happens before any try/catch, the caller's
 * loading flag never clears and the row sticks on "Loading…" forever.
 *
 * Serials are fetched per row rather than with the project: a single issuance
 * can run to tens of thousands of serials, which nobody needs until they open
 * that row. Fungible mints return an empty list — units cannot be enumerated.
 */
/**
 * On-demand loader for the retirement and transfer transactions affecting a
 * project's credits — scoped to one issuance, or to every issuance when
 * `mintTimestamp` is null.
 *
 * Paginated because a busy issuance can run to thousands of transactions, and
 * resolved at setup for the same Nuxt-context reason as useMintSerials.
 */
export const useMintTransactions = () => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    return async (
        network: NetworkId | string,
        projectId: string | null,
        mintTimestamp: string | null,
        page = 1,
        limit = 25,
        sortBy?: string,
        sortDir?: 'asc' | 'desc',
    ): Promise<MintTransactions | null> => {
        // A null projectId addresses the issuance directly. Most mint credentials
        // are never attributed to a project, so the project-scoped route cannot
        // serve them — the issuance-scoped one can.
        const path = projectId === null && mintTimestamp
            ? `/api/v1/${network}/issuances/${encodeURIComponent(mintTimestamp)}/transactions`
            : mintTimestamp
                ? `/api/v1/${network}/projects/${encodeURIComponent(projectId!)}/issuances/${encodeURIComponent(mintTimestamp)}/transactions`
                : `/api/v1/${network}/projects/${encodeURIComponent(projectId!)}/transactions`;
        try {
            return await $fetch<MintTransactions>(path, { baseURL, query: { page, limit, sortBy, sortDir } });
        } catch (err) {
            console.error('[useProjectsApi] mint transactions fetch failed:', err);
            return null;
        }
    };
};

export const useMintSerials = () => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    return async (
        network: NetworkId | string,
        projectId: string,
        mintTimestamp: string,
    ): Promise<MintSerials | null> => {
        try {
            return await $fetch<MintSerials>(
                `/api/v1/${network}/projects/${encodeURIComponent(projectId)}/issuances/${encodeURIComponent(mintTimestamp)}/serials`,
                { baseURL },
            );
        } catch (err) {
            console.error('[useProjectsApi] mint serials fetch failed:', err);
            return null;
        }
    };
};
