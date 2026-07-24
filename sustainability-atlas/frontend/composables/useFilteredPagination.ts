import { naturalCompare, decodeMultiValue } from '~/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export function useFilteredPagination<T>(
    items: Ref<T[]> | T[],
    opts: {
        searchFields: (keyof T)[];
        pageSize?: number;
        arrayFields?: (keyof T)[];
        defaultSort?: { key: keyof T; dir: 'asc' | 'desc' };
        syncUrl?: boolean;
        /** URL query params to ignore when initialising activeFilters from the URL. */
        excludeFromQuery?: string[];
    },
) {
    const route = useRoute();
    const router = useRouter();
    const syncUrl = opts.syncUrl ?? true;

    // Initialize from URL query params if available
    const initialQuery = route.query;
    const searchQuery = ref((initialQuery.q as string) || '');
    const currentPage = ref(initialQuery.page ? parseInt(initialQuery.page as string) : 1);
    const pageSize = ref(opts.pageSize ?? 10);
    const activeFilters = ref<Record<string, string>>(parseFiltersFromQuery(initialQuery));
    const sortKey = ref<keyof T | null>(
        (initialQuery.sort as keyof T | undefined) ?? opts.defaultSort?.key ?? null,
    ) as Ref<keyof T | null>;
    const sortDir = ref<SortDirection>(
        (initialQuery.dir as SortDirection) ?? opts.defaultSort?.dir ?? null,
    );

    function parseFiltersFromQuery(query: Record<string, any>): Record<string, string> {
        const reserved = new Set(['q', 'page', 'sort', 'dir', 'network', ...(opts.excludeFromQuery ?? [])]);
        const filters: Record<string, string> = {};
        for (const [key, val] of Object.entries(query)) {
            if (!reserved.has(key) && typeof val === 'string' && val) {
                filters[key] = val;
            }
        }
        return filters;
    }

    function buildQuery(): Record<string, string> {
        const query: Record<string, string> = {};
        if (searchQuery.value) query.q = searchQuery.value;
        if (currentPage.value > 1) query.page = String(currentPage.value);
        if (sortKey.value && sortDir.value) {
            // Only include sort in URL if it differs from default
            const isDefault = opts.defaultSort
                && sortKey.value === opts.defaultSort.key
                && sortDir.value === opts.defaultSort.dir;
            if (!isDefault) {
                query.sort = String(sortKey.value);
                query.dir = sortDir.value;
            }
        }
        for (const [key, val] of Object.entries(activeFilters.value)) {
            if (val && val !== 'all') query[key] = val;
        }
        return query;
    }

    let skipUrlSync = false;

    function syncToUrl() {
        if (!syncUrl || skipUrlSync) return;
        const query = buildQuery();
        const currentNetwork = route.query.network;
        if (currentNetwork) query.network = currentNetwork as string;
        // Preserve excluded params (e.g. projectKey) — they're not managed as
        // active filters but must survive URL syncs triggered by sort/page changes.
        for (const key of opts.excludeFromQuery ?? []) {
            const val = route.query[key];
            if (typeof val === 'string' && val) query[key] = val;
        }
        router.replace({ query });
    }

    function toggleSort(key: keyof T) {
        if (sortKey.value === key) {
            if (sortDir.value === 'asc') {
                sortDir.value = 'desc';
            } else if (sortDir.value === 'desc') {
                sortKey.value = null;
                sortDir.value = null;
            } else {
                sortDir.value = 'asc';
            }
        } else {
            sortKey.value = key;
            sortDir.value = 'asc';
        }
        currentPage.value = 1;
        syncToUrl();
    }

    const filtered = computed(() => {
        const all = unref(items);
        let result = all;

        // Text search
        const q = searchQuery.value.trim().toLowerCase();
        if (q) {
            result = result.filter((item) =>
                opts.searchFields.some((field) => {
                    const val = item[field];
                    return typeof val === 'string' && val.toLowerCase().includes(q);
                }),
            );
        }

        // Dropdown filters
        const arrayFieldSet = new Set(opts.arrayFields?.map(String) ?? []);
        for (const [key, value] of Object.entries(activeFilters.value)) {
            if (value && value !== 'all') {
                if (arrayFieldSet.has(key)) {
                    // Array field (e.g. sdgs): pipe-separated (percent-encoded) list of values to match
                    const selectedValues = decodeMultiValue(value);
                    result = result.filter((item) => {
                        const arr = item[key as keyof T];
                        if (!Array.isArray(arr)) return false;
                        return selectedValues.some(v => arr.map(String).includes(v));
                    });
                } else if (value.includes('|')) {
                    const parts = value.split('|');
                    const [from, to] = parts;
                    // A range has exactly 2 parts that are both numeric or both ISO dates.
                    // Anything else (e.g. "Issuing|Registered") is a multi-select list.
                    const isNumericRange = parts.length === 2
                        && parts.filter(Boolean).every(v => /^\d+(\.\d+)?$/.test(v));
                    const isDateRange = parts.length === 2
                        && parts.filter(Boolean).every(v => /^\d{4}-\d{2}-\d{2}$/.test(v));

                    if (isNumericRange || isDateRange) {
                        // Range filter: numeric (year / supply) or date comparison
                        result = result.filter((item) => {
                            const rawVal = item[key as keyof T];
                            if (rawVal === null || rawVal === undefined || rawVal === '') return false;
                            if (isNumericRange) {
                                const itemNum = parseFloat(String(rawVal));
                                if (isNaN(itemNum)) return false;
                                if (from && itemNum < parseFloat(from)) return false;
                                if (to && itemNum > parseFloat(to)) return false;
                            } else {
                                const d = new Date(String(rawVal));
                                if (isNaN(d.getTime())) return false;
                                if (from && d < new Date(from + 'T00:00:00')) return false;
                                if (to && d > new Date(to + 'T23:59:59')) return false;
                            }
                            return true;
                        });
                    } else {
                        // Multi-select: pipe-separated (percent-encoded) list of exact string values
                        const selectedValues = decodeMultiValue(value);
                        result = result.filter((item) => selectedValues.includes(String(item[key as keyof T])));
                    }
                } else {
                    result = result.filter((item) => String(item[key as keyof T]) === value);
                }
            }
        }

        // Sort
        if (sortKey.value && sortDir.value) {
            const key = sortKey.value;
            const dir = sortDir.value === 'asc' ? 1 : -1;
            result = [...result].sort((a, b) => {
                const aVal = a[key];
                const bVal = b[key];
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return (aVal - bVal) * dir;
                }
                return naturalCompare(String(aVal), String(bVal)) * dir;
            });
        }

        return result;
    });

    const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));

    const paginated = computed(() => {
        const start = (currentPage.value - 1) * pageSize.value;
        return filtered.value.slice(start, start + pageSize.value);
    });

    function setFilter(key: string, value: string) {
        activeFilters.value = { ...activeFilters.value, [key]: value };
        currentPage.value = 1;
        syncToUrl();
    }

    function clearFilters() {
        activeFilters.value = {};
        searchQuery.value = '';
        currentPage.value = 1;
        syncToUrl();
    }

    // Apply preset: sets search + filters + sort in one go
    function applyPreset(preset: { search?: string; filters?: Record<string, string>; sort?: { key: keyof T; dir: 'asc' | 'desc' } }) {
        skipUrlSync = true;
        searchQuery.value = preset.search || '';
        activeFilters.value = preset.filters ? { ...preset.filters } : {};
        if (preset.sort) {
            sortKey.value = preset.sort.key;
            sortDir.value = preset.sort.dir;
        }
        currentPage.value = 1;
        skipUrlSync = false;
        syncToUrl();
    }

    watch(searchQuery, () => {
        currentPage.value = 1;
        syncToUrl();
    });

    watch(currentPage, () => {
        syncToUrl();
    });

    watch(pageSize, () => {
        currentPage.value = 1;
    });

    return {
        searchQuery,
        currentPage,
        pageSize,
        activeFilters,
        filtered,
        paginated,
        totalPages,
        sortKey,
        sortDir,
        toggleSort,
        setFilter,
        clearFilters,
        applyPreset,
    };
}
