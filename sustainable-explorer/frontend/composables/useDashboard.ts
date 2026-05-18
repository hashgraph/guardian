import type { ActivityItem, MapPoint, MapCountry } from '~/types/models';
import { SectorType } from '~/types/enums';
import { formatCredits } from '~/lib/format';
import { COUNTRY_ALPHA3 } from '~/composables/useProjects';
import { allocateDonutColors } from '~/lib/chart-colors';

// Reverse of COUNTRY_ALPHA3 — used to display the human-readable name when a
// project's country came from reverse-geocoding (we have the ISO3 but not
// the original raw.country string).
const CODE_TO_COUNTRY: Record<string, string> = Object.fromEntries(
    Object.entries(COUNTRY_ALPHA3).map(([name, code]) => [code, name]),
);

export function useDashboard(filters?: Ref<{ developer?: string; registry?: string }>) {
    const { projects, pending } = useProjects();
    const { t } = useI18n();

    // Reverse-geocode projects whose country field was empty or unrecognized
    // (countryCode === 'UNK') but that carry valid lat/lng. The composable
    // populates a module-level cache asynchronously via Nominatim; bucketing
    // below uses `resolvedCode(p)` so the dashboard map gets the same country
    // labels the projects table already shows.
    const { resolvedCode } = useGeocodedCountries(projects);

    function relativeTime(dateStr: string): string {
        const now = Date.now();
        const then = new Date(dateStr).getTime();
        if (isNaN(then)) return dateStr;
        const diffMs = now - then;
        const diffMin = Math.floor(diffMs / 60_000);
        if (diffMin < 1) return t('dashboard.activity.justNow');
        if (diffMin < 60) return diffMin === 1
            ? t('dashboard.activity.minuteAgo', { n: diffMin })
            : t('dashboard.activity.minutesAgo', { n: diffMin });
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return diffHr === 1
            ? t('dashboard.activity.hourAgo', { n: diffHr })
            : t('dashboard.activity.hoursAgo', { n: diffHr });
        const diffDay = Math.floor(diffHr / 24);
        if (diffDay < 30) return diffDay === 1
            ? t('dashboard.activity.dayAgo', { n: diffDay })
            : t('dashboard.activity.daysAgo', { n: diffDay });
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    const { network } = useNetwork();
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    // System-wide totals fetched independently of the project list, so the
    // top-line stat cards reflect everything indexed — not just whatever
    // appears in the current filtered project set.
    const registryTotal = ref(0);
    const methodologyTotal = ref(0);

    async function refreshTotals() {
        if (!import.meta.client) return;
        try {
            const [r, m] = await Promise.all([
                $fetch<{ meta: { total: number } }>(`/api/v1/${network.value}/registries`, {
                    baseURL,
                    // Match the /registries page's default filter: count only
                    // registries that have produced policies/projects/users/
                    // issuances. Keeps the stat-card total aligned with the
                    // visible rows on that page.
                    query: { limit: 1, page: 1, hideEmpty: true },
                }),
                $fetch<{ meta: { total: number } }>(`/api/v1/${network.value}/methodologies`, {
                    baseURL,
                    query: { limit: 1, page: 1 },
                }),
            ]);
            registryTotal.value = r?.meta?.total ?? 0;
            methodologyTotal.value = m?.meta?.total ?? 0;
        } catch {
            registryTotal.value = 0;
            methodologyTotal.value = 0;
        }
    }

    if (import.meta.client) {
        refreshTotals();
        watch(network, refreshTotals);
    }

    const developerOptions = computed(() => {
        return ['All Developers', ...new Set(projects.value.map(p => p.developer).filter(Boolean))].sort((a, b) => {
            if (a === 'All Developers') return -1;
            if (b === 'All Developers') return 1;
            return a.localeCompare(b);
        });
    });

    const registryOptions = computed(() => {
        return ['All Registries', ...new Set(projects.value.map(p => p.registry).filter(Boolean))].sort((a, b) => {
            if (a === 'All Registries') return -1;
            if (b === 'All Registries') return 1;
            return a.localeCompare(b);
        });
    });

    // Filter projects based on dashboard filters
    const filteredProjects = computed(() => {
        let result = [...projects.value];
        if (filters?.value) {
            const f = filters.value;
            if (f.developer && f.developer !== 'All Developers') {
                result = result.filter(p => p.developer === f.developer);
            }
            if (f.registry && f.registry !== 'All Registries') {
                result = result.filter(p => p.registry === f.registry);
            }
        }
        return result;
    });

    // Country stats derived from filtered projects.
    //
    // Projects whose `country` field is empty or unrecognized (anything not in
    // COUNTRY_ALPHA3) get countryCode='UNK'. Bucketing those by countryCode
    // collapsed them into a single row whose display name was the FIRST
    // project's raw country string — e.g. "Israel — 20 projects" even though
    // only one project genuinely had country=Israel. Show the UNK bucket as
    // a labelled "Unknown" row instead so the table accounts for every
    // project; the world map filters this row out separately so unknown
    // projects don't paint a country shape.
    const countries = computed(() => {
        const countryMap: Record<string, {
            name: string; flag: string; code: string; projects: number;
            credits: number; methodologies: Set<string>;
            developer: string; registry: string;
        }> = {};

        for (const p of filteredProjects.value) {
            // Prefer the reverse-geocoded code when the project's own country
            // was empty/garbage but its coordinates resolve. Falls back to
            // p.countryCode (which is 'UNK' for unresolved cases).
            const code = resolvedCode(p) || p.countryCode || 'UNK';
            const name = code === 'UNK'
                ? 'Unknown'
                : (code === p.countryCode ? p.country : (CODE_TO_COUNTRY[code] || p.country || code));
            if (!countryMap[code]) {
                countryMap[code] = {
                    name,
                    flag: code === 'UNK' ? '' : p.flag,
                    code,
                    projects: 0,
                    credits: 0,
                    methodologies: new Set(),
                    developer: p.developer,
                    registry: p.registry,
                };
            }
            countryMap[code].projects++;
            countryMap[code].credits += p.credits;
            countryMap[code].methodologies.add(p.methodologyId);
        }

        return Object.values(countryMap)
            .map(c => ({
                name: c.name,
                flag: c.flag,
                code: c.code,
                projects: c.projects,
                credits: formatCredits(c.credits),
                methodologies: c.methodologies.size,
                developer: c.developer,
                registry: c.registry,
            }))
            .sort((a, b) => b.projects - a.projects);
    });

    // World-map countries: exclude the 'UNK' bucket. Painting it would map
    // every unknown project onto the first matching GeoJSON feature (or worse,
    // a single arbitrary country if 'UNK' happened to alias one).
    const mapCountries = computed<MapCountry[]>(() => {
        return countries.value
            .filter(c => c.code !== 'UNK')
            .map(c => ({
                country: c.name,
                countryCode: c.code,
                projects: c.projects,
                credits: c.credits,
            }));
    });

    const mapPoints = computed<MapPoint[]>(() => {
        // Show a dot whenever the project has real geo coordinates — country
        // string is independent (a project with valid lat/lng but no extracted
        // country still belongs on the map). Skip 0/0 and non-numeric coords
        // to avoid a misleading marker in the Atlantic Ocean.
        return filteredProjects.value
            .filter(p =>
                typeof p.lat === 'number' && typeof p.lng === 'number'
                && (p.lat !== 0 || p.lng !== 0))
            .map(p => ({
                name: p.name,
                lat: p.lat,
                lng: p.lng,
                credits: formatCredits(p.credits),
            }));
    });

    // Registries derived from filtered projects
    const registries = computed(() => {
        const orgMap: Record<string, { name: string; policies: Set<string>; projects: number; credits: number }> = {};

        for (const p of filteredProjects.value) {
            if (!orgMap[p.registry]) {
                orgMap[p.registry] = { name: p.registry, policies: new Set(), projects: 0, credits: 0 };
            }
            orgMap[p.registry].policies.add(p.methodologyId);
            orgMap[p.registry].projects++;
            orgMap[p.registry].credits += p.credits;
        }

        return Object.entries(orgMap)
            .map(([key, data]) => ({
                name: key,
                policies: data.policies.size,
                projects: data.projects,
                credits: formatCredits(data.credits),
            }))
            .sort((a, b) => b.projects - a.projects);
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];

    // Build issuance time series from filtered projects using createdAt + credits
    function buildIssuanceSeries(period: 'monthly' | 'quarterly' | 'yearly'): { label: string; value: number }[] {
        const map: Record<string, { sortKey: string; label: string; value: number }> = {};

        for (const p of filteredProjects.value) {
            if (!p.createdAt) continue;
            const d = new Date(p.createdAt);
            if (isNaN(d.getTime())) continue;
            const val = p.credits / 1_000_000;
            let sortKey: string;
            let label: string;
            if (period === 'yearly') {
                sortKey = String(d.getFullYear());
                label = sortKey;
            } else if (period === 'quarterly') {
                const q = Math.floor(d.getMonth() / 3);
                sortKey = `${d.getFullYear()}-Q${q}`;
                label = `${quarterNames[q]} '${String(d.getFullYear()).slice(2)}`;
            } else {
                sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
                label = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
            }
            if (!map[sortKey]) map[sortKey] = { sortKey, label, value: 0 };
            map[sortKey].value += val;
        }

        return Object.values(map)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(e => ({ label: e.label, value: Math.max(Math.round(e.value * 10) / 10, 0.1) }));
    }

    // No retirement data source — always returns empty
    function buildRetirementSeries(_period: 'monthly' | 'quarterly' | 'yearly'): { label: string; value: number }[] {
        return [];
    }

    // Keep backward-compat computed values (default monthly)
    const issuanceMonths = computed(() => buildIssuanceSeries('monthly'));
    const issuanceMax = computed(() => {
        const vals = issuanceMonths.value.map(m => m.value);
        return vals.length > 0 ? Math.max(...vals) : 1;
    });
    const issuanceTotal = computed(() =>
        Math.round(issuanceMonths.value.reduce((sum, m) => sum + m.value, 0) * 10) / 10,
    );

    // Recent activity from most recent real projects
    const recentActivity = computed<ActivityItem[]>(() => {
        if (filteredProjects.value.length === 0) return [];

        const activities: ActivityItem[] = [];

        const sortedProjects = [...filteredProjects.value]
            .filter(p => p.createdAt)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const take = sortedProjects.slice(0, 5);

        for (const p of take) {
            activities.push({
                time: relativeTime(p.createdAt),
                action: t('dashboard.activity.newProjectRegistered'),
                detail: `${p.name} — ${p.registry}`,
                type: 'project',
            });
        }

        // Add one registry entry if we have registries
        const uniqueRegistries = [...new Set(filteredProjects.value.map(p => p.registry).filter(Boolean))];
        if (uniqueRegistries.length > 0) {
            // Use oldest known project to anchor a registry "joined" entry
            const oldest = sortedProjects[sortedProjects.length - 1];
            activities.push({
                time: oldest ? relativeTime(oldest.createdAt) : '',
                action: t('dashboard.activity.registryIndexed'),
                detail: uniqueRegistries[0],
                type: 'registry',
            });
        }

        return activities;
    });

    // Stats
    const hasActiveFilter = computed(() => {
        if (!filters?.value) return false;
        const f = filters.value;
        return (f.developer && f.developer !== 'All Developers') || (f.registry && f.registry !== 'All Registries');
    });

    // Stat cards reflect the currently-filtered project set when a filter is
    // active. With no filter, registries/methodologies use the system-wide
    // API totals so the cards match the counts on the /registries and
    // /methodologies pages (which include rows that have zero projects).
    // Project-derived counts would otherwise hide registries/methodologies
    // that exist but haven't produced any projects yet.
    const stats = computed(() => {
        const set = filteredProjects.value;
        let totalCredits = 0;
        const uniqueRegistries = new Set<string>();
        const uniqueMethodologies = new Set<string>();
        for (const p of set) {
            if (p.registry) uniqueRegistries.add(p.registry);
            if (p.methodologyId) uniqueMethodologies.add(p.methodologyId);
            totalCredits += p.credits;
        }
        return {
            registries: hasActiveFilter.value
                ? uniqueRegistries.size
                : registryTotal.value,
            methodologies: hasActiveFilter.value
                ? uniqueMethodologies.size
                : methodologyTotal.value,
            projects: set.length,
            totalCredits,
        };
    });

    const sectorBreakdown = computed(() => {
        const groups: Record<string, { projectCount: number; creditCount: number }> = {};
        for (const p of filteredProjects.value) {
            const sectorKey = p.sector || SectorType.Undefined;
            if (!groups[sectorKey]) {
                groups[sectorKey] = { projectCount: 0, creditCount: 0 };
            }
            groups[sectorKey].projectCount++;
            groups[sectorKey].creditCount += p.credits;
        }
        return Object.entries(groups)
            .map(([label, data]) => ({
                label,
                projectCount: data.projectCount,
                creditCount: data.creditCount,
            }))
            .sort((a, b) => {
                if (a.label === SectorType.Undefined) return 1;
                if (b.label === SectorType.Undefined) return -1;
                return b.projectCount - a.projectCount;
            });
    });

    const registryBreakdown = computed(() => {
        const groups: Record<string, { projectCount: number; creditCount: number }> = {};
        for (const p of filteredProjects.value) {
            if (!groups[p.registry]) {
                groups[p.registry] = { projectCount: 0, creditCount: 0 };
            }
            groups[p.registry].projectCount++;
            groups[p.registry].creditCount += p.credits;
        }
        return Object.entries(groups)
            .map(([label, data]) => ({
                label,
                projectCount: data.projectCount,
                creditCount: data.creditCount,
            }))
            .sort((a, b) => b.projectCount - a.projectCount);
    });

    // Country detail for the side panel
    function getCountryDetail(code: string) {
        const countryData = countries.value.find(c => c.code === code);
        if (!countryData) return null;

        // Match by the same code source used during bucketing so the detail
        // panel covers projects that were reverse-geocoded onto this country.
        const countryProjects = filteredProjects.value.filter(p => (resolvedCode(p) || p.countryCode) === code);
        const totalProjects = countryProjects.length;

        // Per-bucket counts AND credits. Percentages prefer credit weighting when
        // credits exist; otherwise fall back to project-count weighting so the
        // breakdown is still meaningful for pre-issuance / un-tokenized projects.
        const catCredits: Record<string, number> = {};
        const catCounts: Record<string, number> = {};
        let totalCredits = 0;
        for (const p of countryProjects) {
            catCredits[p.category] = (catCredits[p.category] || 0) + p.credits;
            catCounts[p.category]  = (catCounts[p.category]  || 0) + 1;
            totalCredits += p.credits;
        }

        const useCredits = totalCredits > 0;
        const denom = useCredits ? totalCredits : (totalProjects || 1);

        // Allocate colors deterministically per country via the same allocator
        // the main dashboard sector/registry breakdown uses. The previous
        // hand-maintained `sectorColorMap` only covered a handful of canonical
        // labels (Renewable Energy, Forestry, etc.), so any real-world value
        // (e.g. "Community Services Activities", "Afforestation", or numeric
        // codes from the DB) fell through to a single gray fallback and the
        // donut rendered as one uniform ring.
        const orderedSectors = Object.keys(catCounts)
            .map(label => ({
                label,
                value: Math.round(((useCredits ? catCredits[label] : catCounts[label]) / denom) * 100),
            }))
            .sort((a, b) => b.value - a.value);

        const sectorColors = allocateDonutColors(orderedSectors.length, `country-sector-${code}`);
        const sectors = orderedSectors.map((s, i) => ({
            label: s.label,
            value: s.value,
            color: sectorColors[i] ?? '#d4d4d8',
        }));

        const regCredits: Record<string, number> = {};
        const regCounts: Record<string, number> = {};
        for (const p of countryProjects) {
            regCredits[p.registry] = (regCredits[p.registry] || 0) + p.credits;
            regCounts[p.registry]  = (regCounts[p.registry]  || 0) + 1;
        }
        const registriesBreakdown = Object.keys(regCounts)
            .map(name => {
                const numerator = useCredits ? regCredits[name] : regCounts[name];
                return { name, pct: Math.round((numerator / denom) * 1000) / 10 };
            })
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 3);

        return {
            name: countryData.name,
            flag: countryData.flag,
            projects: countryData.projects,
            credits: countryData.credits,
            sectors,
            registries: registriesBreakdown,
        };
    }

    // Retirement — no data source available
    const totalRetired = computed(() => 0);
    const retirementMonths = computed(() => [] as { month: string; value: number }[]);
    const retirementMax = computed(() => 1);
    const retirementTotal = computed(() => 0);

    // Vintage distribution
    const vintageDistribution = computed(() => {
        const vintageMap: Record<string, { projects: number; credits: number }> = {};
        for (const p of filteredProjects.value) {
            if (!vintageMap[p.vintage]) vintageMap[p.vintage] = { projects: 0, credits: 0 };
            vintageMap[p.vintage].projects++;
            vintageMap[p.vintage].credits += p.credits;
        }
        return Object.entries(vintageMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([year, data]) => ({ year, projects: data.projects, credits: data.credits }));
    });

    const vintageMax = computed(() => {
        const vals = vintageDistribution.value.map(v => v.credits);
        return vals.length > 0 ? Math.max(...vals) : 1;
    });

    return {
        stats,
        hasActiveFilter,
        countries,
        mapCountries,
        mapPoints,
        registries,
        issuanceMonths,
        issuanceMax,
        issuanceTotal,
        recentActivity,
        sectorBreakdown,
        registryBreakdown,
        developerOptions,
        registryOptions,
        getCountryDetail,
        totalRetired,
        retirementMonths,
        retirementMax,
        retirementTotal,
        vintageDistribution,
        vintageMax,
        buildIssuanceSeries,
        buildRetirementSeries,
        pending,
    };
}
