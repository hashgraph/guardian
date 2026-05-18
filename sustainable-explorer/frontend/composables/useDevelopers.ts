import type { Developer } from '~/types/models';
import { formatCredits } from '~/lib/format';
import { useDevelopersApi } from '~/composables/api/useDevelopersApi';

export function useDevelopers(filters?: Ref<{ status?: string; search?: string; country?: string }>) {
    const { network } = useNetwork();
    const networkRef = computed(() => network.value);

    // Fetch a large first page so the existing client-side useFilteredPagination
    // can keep handling search / sort / paging. Total developer counts on a
    // Guardian network are well under this ceiling.
    const page = ref(1);
    const limit = ref(1000);
    const searchRef = ref('');
    const sortByRef = ref<'name' | 'projects' | 'countries' | 'totalIssued' | 'totalRetired' | null>(null);
    const sortDirRef = ref<'asc' | 'desc' | null>(null);
    const apiFiltersRef = ref<Record<string, any>>({});

    const { data, pending, error, refresh } = useDevelopersApi({
        page,
        limit,
        search: searchRef,
        network: networkRef,
        sortBy: sortByRef,
        sortDir: sortDirRef,
        filters: apiFiltersRef,
    });

    const developers = computed<Developer[]>(() => {
        let result: Developer[] = (data.value?.data ?? []).map(d => ({
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
        }));

        if (filters?.value) {
            const f = filters.value;
            if (f.status) result = result.filter(d => d.status === f.status);
            if (f.country) {
                const q = f.country.toLowerCase();
                result = result.filter(d => d.country.toLowerCase().includes(q));
            }
            if (f.search) {
                const q = f.search.toLowerCase();
                result = result.filter(d =>
                    d.name.toLowerCase().includes(q) ||
                    d.country.toLowerCase().includes(q) ||
                    d.registries.some(r => r.toLowerCase().includes(q)) ||
                    d.categories.some(c => c.toLowerCase().includes(q)),
                );
            }
        }

        return result;
    });

    const total = computed(() => data.value?.meta?.total ?? developers.value.length);

    const filterOptions = computed(() => ({
        statuses: ['Active', 'Inactive'] as const,
    }));

    return { developers, total, filterOptions, pending, error, refresh };
}
