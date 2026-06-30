import { formatCredits } from '~/lib/format';
import { SectorType } from '~/types/enums';
import type { WatchlistItem } from '~/composables/usePortfolioWatchlist';

/**
 * Returns all portfolio data filtered by watchlist.
 * When watchlist is empty every computed returns the full network dataset —
 * identical behaviour to the main dashboard.  When items are present only
 * matching projects / credits are included.
 */
export function usePortfolioDashboard(watchlistItems: Ref<WatchlistItem[]>) {
    const { projects } = useProjects();
    const { credits } = useCredits();

    // O(1) lookup sets derived from the watchlist
    const watchedProjectIds = computed(() =>
        new Set(watchlistItems.value.filter(i => i.type === 'project').map(i => i.id)),
    );
    const watchedRegistries = computed(() =>
        new Set(watchlistItems.value.filter(i => i.type === 'registry').map(i => i.id)),
    );
    const watchedTokenIds = computed(() =>
        new Set(watchlistItems.value.filter(i => i.type === 'token').map(i => i.id)),
    );

    const isFiltered = computed(() => watchlistItems.value.length > 0);

    // Projects visible in the portfolio
    const filteredProjects = computed(() => {
        if (!isFiltered.value) return projects.value;
        return projects.value.filter(p =>
            watchedProjectIds.value.has(p.id) ||
            (p.registry != null && watchedRegistries.value.has(p.registry)),
        );
    });

    // Credits visible in the portfolio
    const filteredCredits = computed(() => {
        if (!isFiltered.value) return credits.value;
        return credits.value.filter(c =>
            (c.tokenId != null && watchedTokenIds.value.has(c.tokenId)) ||
            (c.projectId != null && watchedProjectIds.value.has(c.projectId)) ||
            (c.registry != null && watchedRegistries.value.has(c.registry)),
        );
    });

    // KPIs
    const totalCreditsIssued = computed(() =>
        filteredCredits.value.reduce((s, c) => s + (c.supply ?? 0), 0),
    );
    const activeProjectsCount = computed(() => filteredProjects.value.length);

    // Sector breakdown  { label, projectCount, creditCount }  — matches useDashboard shape
    const sectorBreakdown = computed(() => {
        const map: Record<string, { label: string; projectCount: number; creditCount: number }> = {};
        for (const p of filteredProjects.value) {
            const key = p.sector || SectorType.Undefined;
            if (!map[key]) map[key] = { label: key, projectCount: 0, creditCount: 0 };
            map[key].projectCount++;
            map[key].creditCount += p.credits ?? 0;
        }
        return Object.values(map).sort((a, b) => b.projectCount - a.projectCount);
    });

    // Registry breakdown  { label, projectCount, creditCount }
    const registryBreakdown = computed(() => {
        const map: Record<string, { label: string; projectCount: number; creditCount: number }> = {};
        for (const p of filteredProjects.value) {
            const key = p.registry || 'Unknown';
            if (!map[key]) map[key] = { label: key, projectCount: 0, creditCount: 0 };
            map[key].projectCount++;
            map[key].creditCount += p.credits ?? 0;
        }
        return Object.values(map).sort((a, b) => b.projectCount - a.projectCount);
    });

    // Vintage distribution  { year, credits, projects }
    const vintageDistribution = computed(() => {
        const map: Record<number, { year: number; credits: number; projects: number }> = {};
        for (const p of filteredProjects.value) {
            const year = parseInt(String(p.vintage)) || new Date().getFullYear();
            if (!map[year]) map[year] = { year, credits: 0, projects: 0 };
            map[year].credits += p.credits ?? 0;
            map[year].projects++;
        }
        return Object.values(map).sort((a, b) => a.year - b.year);
    });

    const vintageMax = computed(() =>
        Math.max(...vintageDistribution.value.map(v => v.credits), 1),
    );

    // Registries table  { name, policies, projects, credits }  — matches useDashboard shape
    const registries = computed(() => {
        const creditsByReg: Record<string, number> = {};
        for (const c of filteredCredits.value) {
            const key = c.registry || 'Unknown';
            creditsByReg[key] = (creditsByReg[key] ?? 0) + (c.supply ?? 0);
        }
        const map: Record<string, { name: string; policies: Set<string>; projects: number }> = {};
        for (const p of filteredProjects.value) {
            const key = p.registry || 'Unknown';
            if (!map[key]) map[key] = { name: key, policies: new Set(), projects: 0 };
            if (p.methodologyId) map[key].policies.add(p.methodologyId);
            map[key].projects++;
        }
        return Object.values(map)
            .map(r => ({
                name: r.name,
                policies: r.policies.size,
                projects: r.projects,
                credits: formatCredits(creditsByReg[r.name] ?? 0),
            }))
            .sort((a, b) => b.projects - a.projects);
    });

    // Top countries  { name, val, width }  — for horizontal bar chart
    const countryRaw = computed(() => {
        const map: Record<string, { credits: number; projects: number }> = {};
        for (const p of filteredProjects.value) {
            const key = p.country || 'Unknown';
            if (!map[key]) map[key] = { credits: 0, projects: 0 };
            map[key].credits += p.credits ?? 0;
            map[key].projects++;
        }
        return Object.entries(map)
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.credits - a.credits)
            .slice(0, 10);
    });

    const topCountries = computed(() => {
        const max = Math.max(...countryRaw.value.map(c => c.credits), 1);
        return countryRaw.value.map(c => ({
            name: c.name,
            val: formatCredits(c.credits),
            width: Math.round((c.credits / max) * 100),
        }));
    });

    // Issuance trend series (period-bucketed, in millions of credits)
    function buildIssuanceSeries(period: 'monthly' | 'quarterly' | 'yearly'): { label: string; value: number }[] {
        const map: Record<string, number> = {};
        for (const c of filteredCredits.value) {
            if (!c.mintDate) continue;
            const d = new Date(c.mintDate);
            let key: string;
            if (period === 'monthly')
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            else if (period === 'quarterly')
                key = `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
            else
                key = String(d.getFullYear());
            map[key] = (map[key] ?? 0) + (c.supply ?? 0) / 1_000_000;
        }
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 }));
    }

    // Recent issuances — last 5 by mintDate
    const recentIssuances = computed(() =>
        [...filteredCredits.value]
            .filter(c => c.mintDate)
            .sort((a, b) => new Date(b.mintDate!).getTime() - new Date(a.mintDate!).getTime())
            .slice(0, 5)
            .map(c => ({
                name: c.name ?? c.tokenId,
                type: c.type ?? 'Fungible',
                amount: formatCredits(c.supply),
                date: new Date(c.mintDate!).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                }),
            })),
    );

    return {
        isFiltered,
        filteredProjects,
        filteredCredits,
        totalCreditsIssued,
        activeProjectsCount,
        sectorBreakdown,
        registryBreakdown,
        vintageDistribution,
        vintageMax,
        registries,
        countryRaw,
        topCountries,
        buildIssuanceSeries,
        recentIssuances,
    };
}
