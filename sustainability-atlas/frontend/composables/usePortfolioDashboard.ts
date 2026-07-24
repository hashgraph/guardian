import { formatCredits } from '~/lib/format';
import { isValidCountryName } from '~/lib/utils';
import { allocateDonutColors } from '~/lib/chart-colors';
import { bucketMintSeries } from '~/lib/mint-series';
import { SectorType } from '~/types/enums';
import type { WatchlistItem } from '~/composables/usePortfolioWatchlist';
import type { ActivityItem, MapCountry, MapPoint } from '~/types/models';
import type { SdgStatsDto } from '~/composables/api/useSdgsApi';
import { useGeocodedCountries } from '~/composables/useGeocodedCountries';
import { ALPHA3_TO_NAME as CODE_TO_COUNTRY } from '~/composables/useProjects';
import { useWatchlistProjects } from '~/composables/useWatchlistProjects';
import { usePortfolioStats } from '~/composables/usePortfolioStats';

/**
 * Returns all portfolio data filtered by watchlist.
 * A project must be explicitly watchlisted to count — an empty watchlist
 * means an empty portfolio, regardless of any Country/Methodology/Registry
 * filters applied while browsing the "Manage Watchlist" modal (those only
 * narrow the modal's candidate list, see usePortfolioWatchlistFilters).
 */
export function usePortfolioDashboard(watchlistItems: Ref<WatchlistItem[]>) {
    // Projects visible in the portfolio — the batch endpoint already returns
    // only the watchlisted set, so no further client-side filtering is needed.
    const { projects: filteredProjects, pending: projectsPending } = useWatchlistProjects(watchlistItems);
    const { t } = useI18n();
    const { network } = useNetwork();
    const networkRef = computed(() => network.value);
    const { data: sdgsData } = useSdgsApi({ network: networkRef });

    // Geocoded country names/codes for filteredProjects — resolves raw coordinate
    // strings (e.g. "32.5825" → "Israel") via Nominatim, mirroring the project table.
    const { resolvedName: resolvedCountryName, resolvedCode } = useGeocodedCountries(filteredProjects);

    // Server-aggregated credit stats for exactly this watchlist's project keys.
    const projectKeys = computed(() =>
        filteredProjects.value.map(p => p.projectKey).filter((k): k is string => !!k),
    );
    const { stats, pending: statsPending } = usePortfolioStats(projectKeys);

    // projectKey → minted amount, built once and reused by every breakdown below
    // instead of re-scanning raw credit rows per breakdown.
    const amountByKey = computed(() => new Map(stats.value.byProjectKey.map(e => [e.projectKey, e.amount])));

    // KPIs
    const totalCreditsIssued = computed(() => stats.value.totalMinted);
    const activeProjectsCount = computed(() => filteredProjects.value.length);

    // Sector breakdown  { label, projectCount, creditCount }  — mirrors useDashboard shape.
    // projectCount = projects in sector; creditCount = per-project minted totals from
    // portfolio-stats, distributed by sector — same total as totalCreditsIssued.
    const sectorBreakdown = computed(() => {
        const map: Record<string, { label: string; projectCount: number; creditCount: number }> = {};
        for (const p of filteredProjects.value) {
            const key = p.sector || SectorType.Undefined;
            if (!map[key]) map[key] = { label: key, projectCount: 0, creditCount: 0 };
            map[key].projectCount++;
            map[key].creditCount += (p.projectKey != null ? amountByKey.value.get(p.projectKey) : undefined) ?? 0;
        }
        return Object.values(map).sort((a, b) => b.projectCount - a.projectCount);
    });

    // Registry breakdown — same pattern.
    const registryBreakdown = computed(() => {
        const map: Record<string, { label: string; projectCount: number; creditCount: number }> = {};
        for (const p of filteredProjects.value) {
            const key = p.registry || 'Unknown';
            if (!map[key]) map[key] = { label: key, projectCount: 0, creditCount: 0 };
            map[key].projectCount++;
            map[key].creditCount += (p.projectKey != null ? amountByKey.value.get(p.projectKey) : undefined) ?? 0;
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
        const map: Record<string, { name: string; policies: Set<string>; projects: number }> = {};
        for (const p of filteredProjects.value) {
            const key = p.registry || 'Unknown';
            if (!map[key]) map[key] = { name: key, policies: new Set(), projects: 0 };
            if (p.methodologyId) map[key].policies.add(p.methodologyId);
            map[key].projects++;
            creditsByReg[key] = (creditsByReg[key] ?? 0) + ((p.projectKey != null ? amountByKey.value.get(p.projectKey) : undefined) ?? 0);
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

    // Top countries  { name, val, width }  — for horizontal bar chart. Credits come
    // from portfolio-stats' per-project totals, joined via p.projectKey so the
    // numbers stay consistent with totalCreditsIssued/sectorBreakdown/etc.
    const countryRaw = computed(() => {
        const map: Record<string, { credits: number; projects: number }> = {};
        for (const p of filteredProjects.value) {
            const name = resolvedCountryName(p);
            if (!isValidCountryName(name)) continue;
            if (!map[name]) map[name] = { credits: 0, projects: 0 };
            map[name].projects++;
            map[name].credits += (p.projectKey != null ? amountByKey.value.get(p.projectKey) : undefined) ?? 0;
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
            countryMap[code].credits += (p.projectKey != null ? amountByKey.value.get(p.projectKey) : undefined) ?? 0;
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

    // Issuance trend series (period-bucketed). Labels match useMintStats format:
    // "Jun '23" / "Q2 '23" / "2023". Buckets the server's monthly series —
    // shares its logic with useMintStats via bucketMintSeries.
    function buildIssuanceSeries(period: 'monthly' | 'quarterly' | 'yearly'): { label: string; value: number }[] {
        return bucketMintSeries(stats.value.mintSeries, period);
    }

    // Recent issuances — last 5 by mintDate. The stats endpoint deliberately omits
    // project name/type (client already has both from the batch-fetched project
    // records), so join on projectKey here.
    const recentIssuances = computed(() => {
        const nameByKey = new Map(filteredProjects.value.map(p => [p.projectKey, p.name]));
        return stats.value.recentIssuances
            .filter(r => r.mintDate)
            .map(r => ({
                name: nameByKey.get(r.projectKey) ?? r.tokenId ?? r.projectKey,
                type: 'Fungible' as const,
                amount: formatCredits(r.amount ?? 0),
                date: new Date(r.mintDate!).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                }),
            }));
    });

    // SDG stats filtered by watchlist — recomputes both project counts and
    // credit supply totals from the watchlisted data (rather than the API's
    // network-wide numbers) so the Issuances toggle shows correct
    // credit-weighted SDGs, and an empty watchlist yields all-zero counts.
    // Credit amounts are distributed per project across each of its SDGs — no
    // server-side SDG grouping, so no double-counting risk (a project's amount
    // is added once per SDG it belongs to, same as before the cutover).
    const filteredSdgStats = computed<SdgStatsDto[]>(() => {
        const apiSdgs = sdgsData.value?.data ?? [];

        const projectCounts = new Map<number, number>();
        const creditCounts = new Map<number, number>();
        for (const p of filteredProjects.value) {
            const amount = (p.projectKey != null ? amountByKey.value.get(p.projectKey) : undefined) ?? 0;
            for (const id of (p.sdgs ?? [])) {
                projectCounts.set(id, (projectCounts.get(id) ?? 0) + 1);
                creditCounts.set(id, (creditCounts.get(id) ?? 0) + amount);
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

    // True while either the project batch fetch or the portfolio stats fetch is
    // still loading. Guards chart sections against rendering with empty data on
    // first SPA navigation (Nuxt 3 does not block client-side routing on
    // useAsyncData — only SSR blocks).
    const dataPending = computed(() => projectsPending.value || statsPending.value);

    return {
        filteredProjects,
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
