import type { ActivityItem, MapPoint, MapCountry } from '~/types/models';
import { formatCredits } from '~/lib/format';

function relativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return dateStr;
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function useDashboard(filters?: Ref<{ developer?: string; registry?: string }>) {
    const { projects, pending } = useProjects();
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
                    query: { limit: 1, page: 1 },
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

    // Country stats derived from filtered projects
    const countries = computed(() => {
        const countryMap: Record<string, {
            name: string; flag: string; code: string; projects: number;
            credits: number; methodologies: Set<string>;
            developer: string; registry: string;
        }> = {};

        for (const p of filteredProjects.value) {
            if (!countryMap[p.countryCode]) {
                countryMap[p.countryCode] = {
                    name: p.country,
                    flag: p.flag,
                    code: p.countryCode,
                    projects: 0,
                    credits: 0,
                    methodologies: new Set(),
                    developer: p.developer,
                    registry: p.registry,
                };
            }
            countryMap[p.countryCode].projects++;
            countryMap[p.countryCode].credits += p.credits;
            countryMap[p.countryCode].methodologies.add(p.methodologyId);
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

    const mapCountries = computed<MapCountry[]>(() => {
        return countries.value.map(c => ({
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
                action: 'New project registered',
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
                action: 'Registry indexed',
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

    // Stat cards reflect the currently-filtered project set so they stay in
    // lock-step with the map/charts/tables below. When no filter is applied
    // filteredProjects equals projects, so the numbers match the system view;
    // when filtered, every card narrows accordingly.
    const stats = computed(() => {
        const set = filteredProjects.value;
        const uniqueRegistries = new Set<string>();
        const uniqueMethodologies = new Set<string>();
        let totalCredits = 0;
        for (const p of set) {
            if (p.registry) uniqueRegistries.add(p.registry);
            if (p.methodologyId) uniqueMethodologies.add(p.methodologyId);
            totalCredits += p.credits;
        }
        return {
            // Fall back to the API-fetched totals only when there's no filter
            // AND the filtered set is empty (e.g. on initial load before
            // projects.value resolves), so the cards aren't blank.
            registries: hasActiveFilter.value || set.length > 0
                ? uniqueRegistries.size
                : registryTotal.value,
            methodologies: hasActiveFilter.value || set.length > 0
                ? uniqueMethodologies.size
                : methodologyTotal.value,
            projects: set.length,
            totalCredits,
        };
    });

    const sectorBreakdown = computed(() => {
        const groups: Record<string, { projectCount: number; creditCount: number }> = {};
        for (const p of filteredProjects.value) {
            if (!groups[p.sector]) {
                groups[p.sector] = { projectCount: 0, creditCount: 0 };
            }
            groups[p.sector].projectCount++;
            groups[p.sector].creditCount += p.credits;
        }
        return Object.entries(groups)
            .map(([label, data]) => ({
                label,
                projectCount: data.projectCount,
                creditCount: data.creditCount,
            }))
            .sort((a, b) => b.projectCount - a.projectCount);
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

        const countryProjects = filteredProjects.value.filter(p => p.countryCode === code);
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

        const sectorColorMap: Record<string, string> = {
            'Renewable Energy': '#1a9850',
            'Forestry': '#0f6b3a',
            'Blue Carbon': '#0a97d9',
            'Energy Efficiency': '#66bd63',
            'Agriculture': '#d9ef8b',
            'Water': '#26bde2',
            'Waste': '#a6d96a',
        };

        const useCredits = totalCredits > 0;
        const denom = useCredits ? totalCredits : (totalProjects || 1);

        const sectors = Object.keys(catCounts)
            .map(label => {
                const numerator = useCredits ? catCredits[label] : catCounts[label];
                return {
                    label,
                    value: Math.round((numerator / denom) * 100),
                    color: sectorColorMap[label] || '#d4d4d8',
                };
            })
            .sort((a, b) => b.value - a.value);

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
