import type { MapPoint, MapCountry } from '~/types/models';
import { SectorType } from '~/types/enums';
import { formatCredits } from '~/lib/format';
import { ALPHA3_TO_NAME as CODE_TO_COUNTRY, OTHER_COUNTRY, resolveCountryCode } from '~/composables/useProjects';
import { allocateDonutColors } from '~/lib/chart-colors';
import { useNetworkActivity } from './useNetworkActivity';
import { useGeocodedCountries } from './useGeocodedCountries';

export function useDashboard(filters?: Ref<{ developer?: string; registry?: string }>) {
    const { summary, pending } = useDashboardSummary(filters);
    const { mintStats, buildMintSeries, buildRetirementSeries, mintedBySector, mintedByRegistry } = useMintStats(filters);
    const { activityItems: recentActivity } = useNetworkActivity(undefined, filters);
    const { t, locale } = useI18n();

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
        const loc = locale.value === 'es' ? 'es-ES' : 'en-US';
        return d.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
    }
    // Options come from the API computed over the unfiltered project set, so
    // selecting a value never collapses the list to that single option.
    const developerOptions = computed(() =>
        ['All Developers', ...summary.value.filterOptions.developers],
    );

    const registryOptions = computed(() =>
        ['All Registries', ...summary.value.filterOptions.registries],
    );

    // Country stats derived from filtered projects.
    //
    // Projects whose `country` field is empty or unrecognized (not a known
    // ISO 3166-1 name/alpha-3 code — resolveCountryCode handles both, any
    // case) get countryCode='UNK'. Bucketing those by countryCode collapsed
    // them into a single row whose display name was the FIRST project's raw
    // country string — e.g. "Israel — 20 projects" even though only one
    // project genuinely had country=Israel. Show the UNK bucket as a
    // labelled "Other" row instead so the table accounts for every project;
    // the world map filters this row out separately so unknown/unrecognized
    // projects don't paint a country shape.
    const countries = computed(() => {
        const countryMap: Record<string, {
            name: string; flag: string; code: string; projects: number;
            credits: number; methodologies: number;
            developer: string; registry: string;
        }> = {};

        for (const row of summary.value.countries) {
            const rawCountry = row.country ?? '';
            const code = resolveCountryCode(rawCountry);
            const name = code === 'UNK' ? OTHER_COUNTRY : (CODE_TO_COUNTRY[code] || rawCountry || code);

            if (!countryMap[code]) {
                countryMap[code] = {
                    name,
                    flag: '',
                    code,
                    projects: 0,
                    credits: 0,
                    methodologies: 0,
                    developer: row.developer ?? '',
                    registry: row.registry ?? '',
                };
            }
            countryMap[code].projects += row.projects;
            countryMap[code].credits += row.credits;
            countryMap[code].methodologies += row.methodologies;
        }

        return Object.values(countryMap)
            .map(c => ({
                name: c.name,
                flag: c.flag,
                code: c.code,
                projects: c.projects,
                credits: formatCredits(c.credits),
                // Unformatted total, kept alongside the display string above so
                // mapCountries (below) can add recovered-project credits to it
                // without having to parse a locale-formatted string back apart.
                creditsRaw: c.credits,
                methodologies: c.methodologies,
                developer: c.developer,
                registry: c.registry,
            }))
            .sort((a, b) => b.projects - a.projects);
    });

    // Reverse-geocode fallback for the map's choropleth: a project whose
    // stored `country` is blank/unrecognized still gets a pin (mapPoints only
    // needs lat/lng), but was previously dropped from every country bucket
    // outright — so a real project in e.g. Madagascar or Peru never shaded
    // that country even though it visibly "exists" there. This mirrors the
    // same lat/lng → country recovery already used on the projects list,
    // methodology detail, and portfolio pages (see
    // docs/dashboard-map-country-shading-investigation.md).
    const mapPointsWithCode = computed(() =>
        summary.value.mapPoints.map(p => ({
            ...p,
            country: p.country ?? '',
            countryCode: resolveCountryCode(p.country ?? ''),
        })),
    );
    const { resolvedCode } = useGeocodedCountries(mapPointsWithCode);

    // World-map countries: countries whose stored value already resolved
    // shade straight from the aggregated country table (excluding the 'UNK'
    // bucket — painting it would map every unknown project onto the first
    // matching GeoJSON feature, or worse, a single arbitrary country if
    // 'UNK' happened to alias one). Projects that landed in 'UNK' but have
    // real coordinates get folded in separately once/if their reverse-geo
    // lookup resolves, so they're not silently excluded from shading.
    const mapCountries = computed<MapCountry[]>(() => {
        const buckets = new Map<string, { name: string; projects: number; credits: number }>();
        for (const c of countries.value) {
            if (c.code === 'UNK') continue;
            buckets.set(c.code, { name: c.name, projects: c.projects, credits: c.creditsRaw });
        }

        for (const point of mapPointsWithCode.value) {
            if (point.countryCode !== 'UNK') continue; // already counted above
            const recovered = resolvedCode(point);
            if (recovered === 'UNK') continue; // not (yet) geocoded, or genuinely unresolvable
            const existing = buckets.get(recovered);
            if (existing) {
                existing.projects += 1;
                existing.credits += point.credits;
            } else {
                buckets.set(recovered, { name: CODE_TO_COUNTRY[recovered] || recovered, projects: 1, credits: point.credits });
            }
        }

        return Array.from(buckets.entries()).map(([code, b]) => ({
            country: b.name,
            countryCode: code,
            projects: b.projects,
            credits: formatCredits(b.credits),
        }));
    });

    const mapPoints = computed<MapPoint[]>(() =>
        // The API returns only projects that actually carry coordinates, and
        // already drops 0/0 and non-numeric pairs, so nothing is filtered here.
        summary.value.mapPoints.map(p => ({
            name: p.name ?? '',
            lat: p.lat,
            lng: p.lng,
            credits: formatCredits(p.credits),
        })),
    );

    // Registries 
    const registries = computed(() =>
        summary.value.registries
            .filter(r => r.label)
            .map(r => ({
                name: r.label as string,
                policies: r.methodologies,
                projects: r.projectCount,
                credits: formatCredits(mintedByRegistry.value.get(r.label as string) ?? 0),
            }))
            .sort((a, b) => b.projects - a.projects),
    );

    function buildIssuanceSeries(period: 'monthly' | 'quarterly' | 'yearly'): { label: string; value: number }[] {
        return buildMintSeries(period);
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
        const totals = summary.value.totals;
        return {
            registries: hasActiveFilter.value ? totals.filteredRegistries : totals.registries,
            methodologies: hasActiveFilter.value ? totals.filteredMethodologies : totals.methodologies,
            projects: totals.projects,
            totalCredits: mintStats.value.totalMinted,
        };
    });

    const sectorBreakdown = computed(() => {
        // Project counts per sector, grouped server-side.
        const projectCounts = new Map<string, number>();
        for (const row of summary.value.sectors) {
            const key = row.label || SectorType.Undefined;
            projectCounts.set(key, (projectCounts.get(key) ?? 0) + row.projectCount);
        }

        // Drive the row list from the API mint data so every sector with real
        // minted volume is represented, regardless of whether its label matches
        // a sector that has projects. Without this, sectors whose label only
        // exists in mintedBySector are silently dropped and their amounts never
        // appear in the chart total.
        const seen = new Set<string>();
        const rows: { label: string; projectCount: number; creditCount: number }[] = [];

        for (const { label, amount } of mintStats.value.bySector) {
            const key = label || SectorType.Undefined;
            seen.add(key);
            rows.push({ label: key, projectCount: projectCounts.get(key) ?? 0, creditCount: amount });
        }

        // Add sectors that have projects but no mints.
        for (const [label, count] of projectCounts) {
            if (!seen.has(label)) rows.push({ label, projectCount: count, creditCount: 0 });
        }

        return rows.sort((a, b) => {
            if (a.label === SectorType.Undefined) return 1;
            if (b.label === SectorType.Undefined) return -1;
            return b.projectCount - a.projectCount;
        });
    });

    const registryBreakdown = computed(() => {
        const projectCounts = new Map<string, number>();
        for (const row of summary.value.registries) {
            if (row.label) projectCounts.set(row.label, (projectCounts.get(row.label) ?? 0) + row.projectCount);
        }

        const seen = new Set<string>();
        const rows: { label: string; projectCount: number; creditCount: number }[] = [];

        for (const { label, amount } of mintStats.value.byRegistry) {
            seen.add(label);
            rows.push({ label, projectCount: projectCounts.get(label) ?? 0, creditCount: amount });
        }

        for (const [label, count] of projectCounts) {
            if (!seen.has(label)) rows.push({ label, projectCount: count, creditCount: 0 });
        }

        return rows.sort((a, b) => b.projectCount - a.projectCount);
    });

    // Country detail for the side panel
    function getCountryDetail(code: string) {
        const countryData = countries.value.find(c => c.code === code);
        if (!countryData) {
            // Not in the raw country table — this is a country the map only
            // shades via the reverse-geo recovery in `mapCountries` (its
            // stored `country` value never resolved server-side, so the
            // countrySectors/countryRegistries breakdowns below have nothing
            // to match either). Show what's known — name/projects/credits —
            // without the sector/registry breakdown rather than nothing.
            const recovered = mapCountries.value.find(c => c.countryCode === code);
            if (!recovered) return null;
            return {
                name: recovered.country,
                flag: '',
                projects: recovered.projects,
                credits: recovered.credits,
                sectors: [],
                registries: [],
            };
        }

        // The API groups by the raw stored country string, so fold in every raw
        // value that maps to this ISO code — the same merge `countries` does.
        const matchesCode = (raw: string | null) => resolveCountryCode(raw ?? '') === code;
        const totalProjects = countryData.projects;

        // Per-bucket counts AND credits. Percentages prefer credit weighting when
        // credits exist; otherwise fall back to project-count weighting so the
        // breakdown is still meaningful for pre-issuance / un-tokenized projects.
        const catCredits: Record<string, number> = {};
        const catCounts: Record<string, number> = {};
        let totalCredits = 0;
        for (const row of summary.value.countrySectors) {
            if (!matchesCode(row.country)) continue;
            const label = row.label ?? '';
            catCredits[label] = (catCredits[label] || 0) + row.credits;
            catCounts[label]  = (catCounts[label]  || 0) + row.projectCount;
            totalCredits += row.credits;
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
        for (const row of summary.value.countryRegistries) {
            if (!matchesCode(row.country)) continue;
            const label = row.label ?? '';
            regCredits[label] = (regCredits[label] || 0) + row.credits;
            regCounts[label]  = (regCounts[label]  || 0) + row.projectCount;
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

    // Retirement — a real figure, from the same /dashboard/summary payload the
    // rest of this composable already reads. It combines Guardian retirement
    // contract events with retired NFT serials; see the impact-summary
    // methodology note for how documented and inferred evidence are layered.
    //
    // Retirement events carry a date, but the summary endpoint aggregates them,
    // so there is still no per-month series to chart — the trend stays empty
    // rather than being faked from the issuance curve.
    const totalRetired = computed(() => summary.value.portfolio.totalRetired ?? 0);
    const retirementMonths = computed(() => [] as { month: string; value: number }[]);
    const retirementMax = computed(() => 1);
    const retirementTotal = computed(() => totalRetired.value);

    // Vintage distribution
    const vintageDistribution = computed(() => {
        const vintageMap: Record<string, { projects: number; credits: number }> = {};
        for (const row of summary.value.vintages) {
            const year = row.label ?? '';
            if (!vintageMap[year]) vintageMap[year] = { projects: 0, credits: 0 };
            vintageMap[year].projects += row.projectCount;
            vintageMap[year].credits += row.credits;
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
