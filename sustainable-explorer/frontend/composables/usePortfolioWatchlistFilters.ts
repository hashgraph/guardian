import type { Project } from '~/types/models';
import type { FilterOption } from '~/components/shared/FilterBar.vue';
import { naturalCompare, isValidCountryName } from '~/lib/utils';

// Both endpoints are paginated with no "all" mode; methodology/registry
// catalogs are small enough that a single high-limit page covers them.
const FILTER_OPTIONS_LIMIT = 1000;

/**
 * Multi-select Country/Methodology/Registry filters for the Watchlist.
 * Portfolio is a logged-in-only feature — state is a useState singleton,
 * hydrated from and synced to the server via usePortfolioSync. Selecting
 * filters (even with no projects individually watchlisted) narrows the whole
 * portfolio dashboard — see usePortfolioDashboard.
 */
export function usePortfolioWatchlistFilters() {
    const { t } = useI18n();
    const { network } = useNetwork();
    const { projects: allProjects } = useProjects();
    const { resolvedName: resolvedCountryName } = useGeocodedCountries(allProjects);

    const { data: methodologiesApiData } = useMethodologiesApi({
        page: ref(1), limit: ref(FILTER_OPTIONS_LIMIT), search: ref(''),
        network, sortBy: ref(null), sortDir: ref(null),
    });
    const { data: registriesApiData } = useRegistriesApi({
        page: ref(1), limit: ref(FILTER_OPTIONS_LIMIT), search: ref(''),
        network, sortBy: ref(null), sortDir: ref(null),
    });

    const watchlistFilters = useState<Record<string, string>>('portfolio-watchlist-filters', () => ({}));

    function setFilter(key: string, value: string): void {
        if (!value || value === 'all') {
            const next = { ...watchlistFilters.value };
            delete next[key];
            watchlistFilters.value = next;
        } else {
            watchlistFilters.value = { ...watchlistFilters.value, [key]: value };
        }
    }

    function clearFilters(): void {
        watchlistFilters.value = {};
    }

    const hasActiveFilters = computed(() => Object.keys(watchlistFilters.value).length > 0);

    const norm = (s?: string | null): string => (s ?? '').trim().toLowerCase();

    // The system-wide catalogs can hold multiple records (different ids/dids)
    // that share the same display name — e.g. re-synced or test entries. Same
    // issue the Projects table already avoids by filtering on the plain name
    // string; dedupe here the same way so the dropdown shows each name once,
    // and use the name itself as the option value/match key.
    function dedupeByName<T extends { name: string }>(items: T[]): T[] {
        const seen = new Map<string, T>();
        for (const item of items) {
            const key = norm(item.name);
            if (key && !seen.has(key)) seen.set(key, item);
        }
        return [...seen.values()];
    }

    const countryOptions = computed(() =>
        [...new Set(allProjects.value.map(p => resolvedCountryName(p)).filter(isValidCountryName))]
            .sort(naturalCompare)
            .map(c => ({ value: c, label: c })));

    const methodologyOptions = computed(() =>
        dedupeByName((methodologiesApiData.value?.data ?? []).filter(m => m.name))
            .map(m => ({ value: m.name, label: m.name }))
            .sort((a, b) => a.label.localeCompare(b.label)));

    const registryOptions = computed(() =>
        dedupeByName((registriesApiData.value?.data ?? []).filter(r => r.name))
            .map(r => ({ value: r.name, label: r.name }))
            .sort((a, b) => a.label.localeCompare(b.label)));

    const filterOptions = computed<FilterOption[]>(() => [
        { key: 'country', label: t('portfolio.modal.watchlist.filters.country'), multiSelect: true, searchable: true, options: countryOptions.value },
        { key: 'methodology', label: t('portfolio.modal.watchlist.filters.methodology'), multiSelect: true, searchable: true, options: methodologyOptions.value },
        { key: 'registry', label: t('portfolio.modal.watchlist.filters.registry'), multiSelect: true, searchable: true, options: registryOptions.value },
    ]);

    // Matches by normalized display name — same join the Projects table's own
    // registry/country filters use against project.registry/project.country.
    function matchesFilters(p: Project): boolean {
        const country = watchlistFilters.value.country;
        if (country && !country.split('|').includes(resolvedCountryName(p))) return false;

        const methodology = watchlistFilters.value.methodology;
        if (methodology && !methodology.split('|').some(name => norm(name) === norm(p.methodology))) return false;

        const registry = watchlistFilters.value.registry;
        if (registry && !registry.split('|').some(name => norm(name) === norm(p.registry))) return false;

        return true;
    }

    // One entry per active filter key. A single selected value is shown by
    // name ("Brazil") since that's the common case and far more useful than
    // an opaque "(1)"; multiple values collapse to a count ("Country (2)")
    // to keep the summary bounded. `full` includes the filter label (used in
    // the banner, which has no icon to signal the category); `chipText` omits
    // it for the watchlist-bar chips, which carry a category icon instead.
    interface ActiveFilterChip {
        key: string;
        label: string;
        full: string;
        chipText: string;
    }

    const activeFilterChips = computed<ActiveFilterChip[]>(() => {
        const chips: ActiveFilterChip[] = [];
        for (const f of filterOptions.value) {
            const val = watchlistFilters.value[f.key];
            if (!val) continue;
            const values = val.split('|').filter(Boolean);
            if (values.length === 0) continue;
            const isSingle = values.length === 1;
            chips.push({
                key: f.key,
                label: f.label,
                full: isSingle ? `${f.label}: ${values[0]}` : `${f.label} (${values.length})`,
                chipText: isSingle ? values[0]! : `${f.label} (${values.length})`,
            });
        }
        return chips;
    });

    // Short summary for the page-level "filtered" banner, e.g. "Country: Brazil · Registry (2)".
    const activeFilterSummary = computed(() =>
        activeFilterChips.value.map(c => c.full).join(' · '));

    return {
        watchlistFilters,
        setFilter,
        clearFilters,
        hasActiveFilters,
        filterOptions,
        matchesFilters,
        resolvedCountryName,
        activeFilterChips,
        activeFilterSummary,
    };
}
