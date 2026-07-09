import { formatCredits } from '~/lib/format';
import { isValidCountryName } from '~/lib/utils';
import { allocateDonutColors } from '~/lib/chart-colors';
import { SectorType } from '~/types/enums';
import type { WatchlistItem } from '~/composables/usePortfolioWatchlist';
import type { ActivityItem, MapCountry, MapPoint } from '~/types/models';
import type { SdgStatsDto } from '~/composables/api/useSdgsApi';
import { useGeocodedCountries } from '~/composables/useGeocodedCountries';
import { COUNTRY_ALPHA3 } from '~/composables/useProjects';

// Reverse of COUNTRY_ALPHA3 — used to display the human-readable name when a
// project's country came from reverse-geocoding (we have the ISO3 but not
// the original raw.country string). Mirrors useDashboard.ts.
const CODE_TO_COUNTRY: Record<string, string> = Object.fromEntries(
    Object.entries(COUNTRY_ALPHA3).map(([name, code]) => [code, name]),
);

/**
 * Returns all portfolio data filtered by watchlist.
 * A project must be explicitly watchlisted to count — an empty watchlist
 * means an empty portfolio, regardless of any Country/Methodology/Registry
 * filters applied while browsing the "Manage Watchlist" modal (those only
 * narrow the modal's candidate list, see usePortfolioWatchlistFilters).
 */
export function usePortfolioDashboard(watchlistItems: Ref<WatchlistItem[]>) {
    const { projects, pending: projectsPending } = useProjects();
    const { credits, pending: creditsPending } = useCredits();
    const { t } = useI18n();
    const { network } = useNetwork();
    const networkRef = computed(() => network.value);
    const { data: sdgsData } = useSdgsApi({ network: networkRef });

    // O(1) lookup set of explicitly watchlisted project ids (all items are 'project'-typed now).
    const watchedProjectIds = computed(() =>
        new Set(watchlistItems.value.map(i => i.id)),
    );

    // Projects visible in the portfolio — only explicitly watchlisted projects.
    const filteredProjects = computed(() =>
        projects.value.filter(p => watchedProjectIds.value.has(p.id)),
    );

    // Geocoded country names/codes for filteredProjects — resolves raw coordinate
    // strings (e.g. "32.5825" → "Israel") via Nominatim, mirroring the project table.
    const { resolvedName: resolvedCountryName, resolvedCode } = useGeocodedCountries(filteredProjects);

    // Credits visible in the portfolio — joined via c.projectId = p.projectKey,
    // the same key used everywhere else in this file (sectorBreakdown, countryRaw, etc.)
    const filteredProjectKeys = computed(() =>
        new Set(filteredProjects.value.map(p => p.projectKey).filter((k): k is string => !!k)),
    );
    const filteredCredits = computed(() =>
        credits.value.filter(c => c.projectId != null && filteredProjectKeys.value.has(c.projectId)),
    );

    // KPIs
    const totalCreditsIssued = computed(() =>
        filteredCredits.value.reduce((s, c) => s + (c.supply ?? 0), 0),
    );
    const activeProjectsCount = computed(() => filteredProjects.value.length);

    // Sector breakdown  { label, projectCount, creditCount }  — mirrors useDashboard shape.
    // projectCount = projects in sector; creditCount = actual minted supply (c.supply)
    // from filteredCredits joined via projectId → same data the main dashboard uses
    // from mintStats.bySector, computed client-side so watchlist filtering works.
    const sectorBreakdown = computed(() => {
        // Build projectId→sector map for the credit join (credits carry no sector field).
        const pidToSector = new Map<string, string>();
        for (const p of filteredProjects.value) {
            if (p.projectKey != null) pidToSector.set(p.projectKey, p.sector || SectorType.Undefined);
        }
        // Accumulate real minted supply per sector.
        const creditsBySector: Record<string, number> = {};
        for (const c of filteredCredits.value) {
            const sector = (c.projectId != null && pidToSector.get(c.projectId)) || SectorType.Undefined;
            creditsBySector[sector] = (creditsBySector[sector] ?? 0) + (c.supply ?? 0);
        }
        // Build rows from projects (projectCount) then merge creditCount.
        const map: Record<string, { label: string; projectCount: number; creditCount: number }> = {};
        for (const p of filteredProjects.value) {
            const key = p.sector || SectorType.Undefined;
            if (!map[key]) map[key] = { label: key, projectCount: 0, creditCount: 0 };
            map[key].projectCount++;
        }
        for (const [sector, amount] of Object.entries(creditsBySector)) {
            if (!map[sector]) map[sector] = { label: sector, projectCount: 0, creditCount: 0 };
            map[sector].creditCount = amount;
        }
        return Object.values(map).sort((a, b) => b.projectCount - a.projectCount);
    });

    // Registry breakdown — same pattern: projectCount from projects, creditCount from
    // filteredCredits.c.supply (credits carry c.registry directly, no join needed).
    const registryBreakdown = computed(() => {
        const creditsByReg: Record<string, number> = {};
        for (const c of filteredCredits.value) {
            const key = c.registry || 'Unknown';
            creditsByReg[key] = (creditsByReg[key] ?? 0) + (c.supply ?? 0);
        }
        const map: Record<string, { label: string; projectCount: number; creditCount: number }> = {};
        for (const p of filteredProjects.value) {
            const key = p.registry || 'Unknown';
            if (!map[key]) map[key] = { label: key, projectCount: 0, creditCount: 0 };
            map[key].projectCount++;
        }
        for (const [reg, amount] of Object.entries(creditsByReg)) {
            if (!map[reg]) map[reg] = { label: reg, projectCount: 0, creditCount: 0 };
            map[reg].creditCount = amount;
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
                creditsRaw: creditsByReg[r.name] ?? 0,
            }))
            .sort((a, b) => b.projects - a.projects);
    });

    // Top countries  { name, val, width }  — for horizontal bar chart
    // Credits use c.supply from filteredCredits (same source as totalCreditsIssued),
    // joined via c.projectId = p.projectKey so the numbers are always consistent.
    const countryRaw = computed(() => {
        // projectKey → geocoded country name
        const pidToCountry = new Map<string, string>();
        for (const p of filteredProjects.value) {
            const name = resolvedCountryName(p);
            if (p.projectKey != null && isValidCountryName(name))
                pidToCountry.set(p.projectKey, name);
        }

        // Actual minted supply per country from credit issuances
        const creditsByCountry: Record<string, number> = {};
        for (const c of filteredCredits.value) {
            const country = c.projectId != null ? pidToCountry.get(c.projectId) : undefined;
            if (!country) continue;
            creditsByCountry[country] = (creditsByCountry[country] ?? 0) + (c.supply ?? 0);
        }

        // Project counts from filteredProjects; merge in credit supply
        const map: Record<string, { credits: number; projects: number }> = {};
        for (const p of filteredProjects.value) {
            const name = resolvedCountryName(p);
            if (!isValidCountryName(name)) continue;
            if (!map[name]) map[name] = { credits: 0, projects: 0 };
            map[name].projects++;
        }
        for (const [country, amount] of Object.entries(creditsByCountry)) {
            if (!map[country]) map[country] = { credits: 0, projects: 0 };
            map[country].credits = amount;
        }

        return Object.entries(map)
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.credits - a.credits)
            .slice(0, 10);
    });

    // World-map countries — bucketed by reverse-geocoded ISO3 code (falls back
    // to the project's own countryCode), excluding the 'UNK' bucket so unknown
    // projects don't paint an arbitrary country shape. Mirrors useDashboard.ts.
    const mapCountries = computed<MapCountry[]>(() => {
        const countryMap: Record<string, { code: string; name: string; projects: number; credits: number }> = {};
        for (const p of filteredProjects.value) {
            const code = resolvedCode(p) || p.countryCode || 'UNK';
            if (code === 'UNK') continue;
            const name = code === p.countryCode ? p.country : (CODE_TO_COUNTRY[code] || p.country || code);
            if (!countryMap[code]) countryMap[code] = { code, name, projects: 0, credits: 0 };
            countryMap[code].projects++;
            countryMap[code].credits += p.credits;
        }
        return Object.values(countryMap).map(c => ({
            country: c.name,
            countryCode: c.code,
            projects: c.projects,
            credits: formatCredits(c.credits),
        }));
    });

    // World-map dots — real per-project lat/lng, skipping 0/0 and non-numeric
    // coordinates so a project without geodata doesn't paint a marker in the
    // Atlantic Ocean. Mirrors useDashboard.ts.
    const mapPoints = computed<MapPoint[]>(() => filteredProjects.value
        .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number' && (p.lat !== 0 || p.lng !== 0))
        .map(p => ({ name: p.name, lat: p.lat, lng: p.lng, credits: formatCredits(p.credits) })));

    // Country detail for the map's click-through side panel — mirrors
    // useDashboard.ts's getCountryDetail, scoped to watchlisted projects.
    // Matches on the same resolvedCode(p) || p.countryCode bucketing used to
    // build mapCountries, so the panel covers reverse-geocoded projects too.
    function getCountryDetail(code: string) {
        const countryData = mapCountries.value.find(c => c.countryCode === code);
        if (!countryData) return null;

        const countryProjects = filteredProjects.value.filter(p => (resolvedCode(p) || p.countryCode) === code);
        const totalProjects = countryProjects.length;

        const catCredits: Record<string, number> = {};
        const catCounts: Record<string, number> = {};
        let totalCredits = 0;
        for (const p of countryProjects) {
            const sector = p.sector || SectorType.Undefined;
            catCredits[sector] = (catCredits[sector] || 0) + p.credits;
            catCounts[sector] = (catCounts[sector] || 0) + 1;
            totalCredits += p.credits;
        }

        const useCreditsWeight = totalCredits > 0;
        const denom = useCreditsWeight ? totalCredits : (totalProjects || 1);

        const orderedSectors = Object.keys(catCounts)
            .map(label => ({
                label,
                value: Math.round(((useCreditsWeight ? catCredits[label] : catCounts[label]) / denom) * 100),
            }))
            .sort((a, b) => b.value - a.value);

        const sectorColors = allocateDonutColors(orderedSectors.length, `portfolio-country-sector-${code}`);
        const sectors = orderedSectors.map((s, i) => ({
            label: s.label,
            value: s.value,
            color: sectorColors[i] ?? '#d4d4d8',
        }));

        const regCredits: Record<string, number> = {};
        const regCounts: Record<string, number> = {};
        for (const p of countryProjects) {
            const registry = p.registry || 'Unknown';
            regCredits[registry] = (regCredits[registry] || 0) + p.credits;
            regCounts[registry] = (regCounts[registry] || 0) + 1;
        }
        const registriesBreakdown = Object.keys(regCounts)
            .map(name => {
                const numerator = useCreditsWeight ? regCredits[name] : regCounts[name];
                return { name, pct: Math.round((numerator / denom) * 1000) / 10 };
            })
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 3);

        return {
            name: countryData.country,
            projects: countryData.projects,
            credits: countryData.credits,
            sectors,
            registries: registriesBreakdown,
        };
    }

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Issuance trend series (period-bucketed, raw credit amounts).
    // Labels match useMintStats format: "Jun '23" / "Q2 '23" / "2023".
    function buildIssuanceSeries(period: 'monthly' | 'quarterly' | 'yearly'): { label: string; value: number }[] {
        const buckets = new Map<string, { sortKey: string; label: string; value: number }>();
        for (const c of filteredCredits.value) {
            if (!c.mintDate) continue;
            const d = new Date(c.mintDate);
            const yy = String(d.getFullYear()).slice(2);
            let sortKey: string;
            let label: string;
            if (period === 'yearly') {
                sortKey = String(d.getFullYear());
                label = sortKey;
            } else if (period === 'quarterly') {
                const q = Math.floor(d.getMonth() / 3);
                sortKey = `${d.getFullYear()}-Q${q}`;
                label = `Q${q + 1} '${yy}`;
            } else {
                sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                label = `${MONTH_NAMES[d.getMonth()]} '${yy}`;
            }
            if (!buckets.has(sortKey)) buckets.set(sortKey, { sortKey, label, value: 0 });
            buckets.get(sortKey)!.value += (c.supply ?? 0);
        }
        return [...buckets.values()]
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(({ label, value }) => ({ label, value }));
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

    // SDG stats filtered by watchlist — recomputes both project counts and
    // credit supply totals from the watchlisted data (rather than the API's
    // network-wide numbers) so the Issuances toggle shows correct
    // credit-weighted SDGs, and an empty watchlist yields all-zero counts.
    const filteredSdgStats = computed<SdgStatsDto[]>(() => {
        const apiSdgs = sdgsData.value?.data ?? [];

        // Project counts per SDG
        const projectCounts = new Map<number, number>();
        for (const p of filteredProjects.value) {
            for (const id of (p.sdgs ?? [])) {
                projectCounts.set(id, (projectCounts.get(id) ?? 0) + 1);
            }
        }

        // Credit supply per SDG — join filteredCredits → project SDGs
        const projectSdgMap = new Map<string, number[]>();
        for (const p of filteredProjects.value) {
            if (p.projectKey != null && p.sdgs?.length) projectSdgMap.set(p.projectKey, p.sdgs);
        }
        const creditCounts = new Map<number, number>();
        for (const c of filteredCredits.value) {
            const sdgs = (c.projectId != null && projectSdgMap.get(c.projectId)) || [];
            for (const sdgId of sdgs) {
                creditCounts.set(sdgId, (creditCounts.get(sdgId) ?? 0) + (c.supply ?? 0));
            }
        }

        return apiSdgs.map(s => ({
            ...s,
            projects: projectCounts.get(s.id) ?? 0,
            credits: creditCounts.get(s.id) ?? 0,
        }));
    });

    // Network activity filtered to the active watchlist (recent project registrations).
    function relativeTime(dateStr: string): string {
        const now = Date.now();
        const then = new Date(dateStr).getTime();
        if (isNaN(then)) return dateStr;
        const diffMin = Math.floor((now - then) / 60_000);
        if (diffMin < 1)   return t('dashboard.activity.justNow');
        if (diffMin < 60)  return diffMin === 1 ? t('dashboard.activity.minuteAgo', { n: diffMin }) : t('dashboard.activity.minutesAgo', { n: diffMin });
        const diffHr  = Math.floor(diffMin / 60);
        if (diffHr  < 24)  return diffHr  === 1 ? t('dashboard.activity.hourAgo',   { n: diffHr  }) : t('dashboard.activity.hoursAgo',   { n: diffHr  });
        const diffDay = Math.floor(diffHr / 24);
        if (diffDay < 30)  return diffDay === 1  ? t('dashboard.activity.dayAgo',    { n: diffDay }) : t('dashboard.activity.daysAgo',    { n: diffDay });
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    const recentActivity = computed<ActivityItem[]>(() => {
        if (filteredProjects.value.length === 0) return [];
        const sorted = [...filteredProjects.value]
            .filter(p => p.createdAt)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const activities: ActivityItem[] = sorted.slice(0, 5).map(p => ({
            time: relativeTime(p.createdAt),
            action: t('dashboard.activity.newProjectRegistered'),
            detail: `${p.name} — ${p.registry}`,
            type: 'project',
        }));
        const uniqueRegistries = [...new Set(filteredProjects.value.map(p => p.registry).filter(Boolean))];
        if (uniqueRegistries.length > 0) {
            const oldest = sorted[sorted.length - 1];
            activities.push({
                time: oldest ? relativeTime(oldest.createdAt) : '',
                action: t('dashboard.activity.registryIndexed'),
                detail: uniqueRegistries[0]!,
                type: 'registry',
            });
        }
        return activities;
    });

    // True while either the project list or credit list is still loading.
    // Guards chart sections against rendering with empty data on first SPA navigation
    // (Nuxt 3 does not block client-side routing on useAsyncData — only SSR blocks).
    const dataPending = computed(() => projectsPending.value || creditsPending.value);

    return {
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
        mapCountries,
        mapPoints,
        getCountryDetail,
        buildIssuanceSeries,
        recentIssuances,
        filteredSdgStats,
        recentActivity,
        dataPending,
    };
}
