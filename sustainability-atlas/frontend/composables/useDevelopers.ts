import type { Developer } from '~/types/models';
import { formatCredits } from '~/lib/format';
import { useDevelopersApi } from '~/composables/api/useDevelopersApi';
import type { DeveloperSortKey, DeveloperSortDir } from '~/composables/api/useDevelopersApi';

export interface UseDevelopersOptions {
    page: Ref<number>;
    limit: Ref<number>;
    search: Ref<string>;
    country: Ref<string | undefined>;
    sortBy: Ref<DeveloperSortKey | null>;
    sortDir: Ref<DeveloperSortDir | null>;
}

/**
 * Server-paginated developer list. Search, country filtering, sorting and
 * paging are all applied by the API.
 */
export function useDevelopers(opts: UseDevelopersOptions) {
    const { network } = useNetwork();
    const networkRef = computed(() => network.value);

    const apiFilters = computed<Record<string, any>>(() =>
        opts.country.value ? { country: opts.country.value } : {},
    );

    const { data, pending, error, refresh } = useDevelopersApi({
        page: opts.page,
        limit: opts.limit,
        search: opts.search,
        network: networkRef,
        sortBy: opts.sortBy,
        sortDir: opts.sortDir,
        filters: apiFilters,
    });

    const developers = computed<Developer[]>(() =>
        (data.value?.data ?? []).map(d => ({
            id: d.id,
            name: d.name,
            country: d.country ?? '—',
            countries: d.countries,
            registries: [...d.registries].sort(),
            projects: d.projects,
            totalIssued: formatCredits(d.totalIssued),
            totalRetired: formatCredits(d.totalRetired),
            categories: [...d.categories].sort(),
            status: 'Active' as const,
        })),
    );

    const total = computed(() => data.value?.meta?.total ?? 0);
    const totalPages = computed(() => data.value?.meta?.totalPages ?? 1);

    return { developers, total, totalPages, pending, error, refresh };
}
