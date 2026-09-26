<script setup lang="ts">
import {
    BarChart3, TrendingUp,
    ShoppingCart, Hammer, Building2, Globe2,
    Leaf, Layers, MapPin, Clock, Award, Activity,
    CheckCircle2, AlertCircle,
} from 'lucide-vue-next';
import { formatCredits } from '~/lib/format';
import { naturalCompare } from '~/lib/utils';
import { niceAxis } from '~/lib/chart-scale';
import { allocateDonutColors } from '~/lib/chart-colors';
import { SDG_LIST, getLocalizedSDGName } from '~/lib/sdgs';
import { normalizeCountryName, OTHER_COUNTRY } from '~/composables/useProjects';
import { LIFECYCLE_STAGES as CANONICAL_LIFECYCLE_STAGES } from '~/lib/lifecycle';
import { SECTOR_I18N_KEYS } from '~/types/enums';
import type { LabelCount } from '~/types/dashboard';

const { t } = useI18n();
// Aggregates come from the server-side dashboard summary rather than
// downloading every project and reducing in the browser.
const { summary } = useDashboardSummary();
const { sdgStats } = useSdgStats();
const { network } = useNetwork();

function translateSector(raw: string): string {
    if (!raw) return '';
    const key = SECTOR_I18N_KEYS[raw];
    return key ? t(`dashboard.sectorTypes.${key}`) : raw;
}

type StakeholderTab = 'overview' | 'buyer' | 'developer' | 'registry' | 'impact';
const tab = ref<StakeholderTab>('overview');

const tabs = computed<Array<{ key: StakeholderTab; label: string; icon: any; desc: string }>>(() => [
    { key: 'overview',  label: t('analytics.tabs.overview'),  icon: BarChart3, desc: t('analytics.tabs.overviewDesc') },
    { key: 'buyer',     label: t('analytics.tabs.buyer'),     icon: ShoppingCart, desc: t('analytics.tabs.buyerDesc') },
    { key: 'developer', label: t('analytics.tabs.developer'), icon: Hammer,    desc: t('analytics.tabs.developerDesc') },
    { key: 'registry',  label: t('analytics.tabs.registry'),  icon: Building2, desc: t('analytics.tabs.registryDesc') },
    { key: 'impact',    label: t('analytics.tabs.impact'),    icon: Globe2,    desc: t('analytics.tabs.impactDesc') },
]);

// ─── Shared aggregations ─────────────────────────────────────────────────────

const totalProjects = computed(() => summary.value.totals.projects);

const totalIssued = computed(() => summary.value.portfolio.totalIssued);
const totalRetired = computed(() => summary.value.portfolio.totalRetired);
const totalActive = computed(() => summary.value.portfolio.totalActive);

// Retirement rate — what share of issued credits has been retired (carbon market liquidity signal)
const retirementRate = computed(() => {
    if (totalIssued.value === 0) return 0;
    return Math.round((totalRetired.value / totalIssued.value) * 100);
});

// Pipeline = every project that has not yet issued — supply coming online.
const pipelineProjects = computed(() =>
    summary.value.lifecycleStages
        .filter(s => s.label && s.label !== 'Issued')
        .reduce((sum, s) => sum + s.projectCount, 0),
);

// Vintage spread — how recent the supply is (newer = higher integrity claim).
// Averaged in Postgres with the same 2000..2030 guard the client applied.
const avgVintageYear = computed(() => summary.value.portfolio.avgVintageYear);

// Average crediting period duration in years. Also server-side, counting only
// periods where both ends parse and end > start — same rule as before.
const avgCreditingPeriodYears = computed(() => summary.value.portfolio.avgCreditingPeriodYears);

// Headline KPIs
const headlineKpis = computed(() => [
    { label: t('analytics.kpis.activeSupply'),       value: formatCredits(totalActive.value),     hint: t('analytics.kpis.activeSupplyHint'), tooltip: t('analytics.kpis.activeSupplyTooltip') },
    { label: t('analytics.kpis.retirementRate'),     value: `${retirementRate.value}%`,           hint: t('analytics.kpis.retirementRateHint'), tooltip: t('analytics.kpis.retirementRateTooltip') },
    { label: t('analytics.kpis.pipelineProjects'),   value: pipelineProjects.value.toLocaleString(), hint: t('analytics.kpis.pipelineProjectsHint'), tooltip: t('analytics.kpis.pipelineProjectsTooltip') },
    { label: t('analytics.kpis.avgVintageYear'),    value: avgVintageYear.value?.toString() ?? '—', hint: t('analytics.kpis.avgVintageYearHint'), tooltip: t('analytics.kpis.avgVintageYearTooltip') },
    { label: t('analytics.kpis.avgCreditingPeriod'), value: avgCreditingPeriodYears.value != null ? `${avgCreditingPeriodYears.value} ${t('analytics.kpis.yearsSuffix')}` : '—', hint: t('analytics.kpis.avgCreditingPeriodHint'), tooltip: t('analytics.kpis.avgCreditingPeriodTooltip') },
]);

// ─── Lifecycle funnel (Market Overview) ──────────────────────────────────────

const LIFECYCLE_STAGES = computed<Array<{ key: string; label: string }>>(() =>
    CANONICAL_LIFECYCLE_STAGES.map(key => ({
        key,
        label: t(`projects.lifecycleStages.${key}`),
    }))
);

const lifecycleFunnel = computed(() => {
    const counts: Record<string, number> = {};
    for (const s of summary.value.lifecycleStages) {
        if (s.label) counts[s.label] = (counts[s.label] ?? 0) + s.projectCount;
    }
    const total = totalProjects.value || 0;
    return LIFECYCLE_STAGES.value.map(s => {
        const count = counts[s.key] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return {
            ...s,
            count,
            pct,
            width: count > 0 ? Math.min(100, Math.max(1, pct)) : 0,
        };
    });
});

// ─── Vintage distribution + retirement age ──────────────────────────────────

const vintageBuckets = computed(() => {
    const map: Record<string, { vintage: string; projects: number; credits: number }> = {};
    for (const row of summary.value.vintages) {
        const v = row.label || 'Unknown';
        if (!map[v]) map[v] = { vintage: v, projects: 0, credits: 0 };
        map[v].projects += row.projectCount;
        map[v].credits += row.credits;
    }
    return Object.values(map)
        .filter(b => /^\d{4}$/.test(b.vintage))
        .sort((a, b) => naturalCompare(a.vintage, b.vintage));
});

const maxVintageCredits = computed(() => Math.max(1, ...vintageBuckets.value.map(b => b.credits)));

const vintageAxis = computed(() => {
    const rawMax = Math.max(0, ...vintageBuckets.value.map(b => b.credits));
    return niceAxis(rawMax, 4);
});

function vintageTickAnchorClass(i: number, len: number): string {
    if (i === 0) return 'bottom-0';
    if (i === len - 1) return 'top-0 -translate-y-1/2';
    return 'translate-y-1/2';
}

// ─── Sector breakdown (used by Buyer + Climate Impact) ───────────────────────

interface BinRow { label: string; projects: number; credits: number }

function topBins(rows: BinRow[], sortBy: 'projects' | 'credits', n = 8): BinRow[] {
    return [...rows]
        .sort((a, b) => (sortBy === 'projects' ? b.projects - a.projects : b.credits - a.credits))
        .slice(0, n);
}

/**
 * Reshapes one of the API's label aggregates into BinRow form, folding null /
 * empty labels into a single "Unknown" bin — the same bucketing the previous
 * client-side `p.<field> || 'Unknown'` reduction produced.
 */
function toBins(rows: LabelCount[], translateFn?: (label: string) => string): BinRow[] {
    const map: Record<string, BinRow> = {};
    for (const row of rows) {
        const rawLabel = row.label || 'Unknown';
        const displayLabel = translateFn ? translateFn(rawLabel) : (row.label ? row.label : (t('common.unknown') || 'Unknown'));
        if (!map[displayLabel]) map[displayLabel] = { label: displayLabel, projects: 0, credits: 0 };
        map[displayLabel].projects += row.projectCount;
        map[displayLabel].credits += row.credits;
    }
    return Object.values(map);
}

const sectorRows = computed<BinRow[]>(() => toBins(summary.value.sectors, translateSector));

const sectorTop = computed(() => topBins(sectorRows.value, 'credits'));
const sectorColors = computed(() => allocateDonutColors(sectorTop.value.length, 'sector'));

// ─── Registry breakdown ─────────────────────────────────────────────────────

const registryRows = computed<BinRow[]>(() => toBins(summary.value.registries));

const registryTop = computed(() => topBins(registryRows.value, 'credits'));
const registryColors = computed(() => allocateDonutColors(registryTop.value.length, 'registry'));

// ─── Methodology breakdown ─────────────────────────────────────────────────

const methodologyRows = computed<BinRow[]>(() => toBins(summary.value.methodologies));

const methodologyTop = computed(() => topBins(methodologyRows.value, 'credits', 10));

// ─── Country breakdown ─────────────────────────────────────────────────────

// Raw country strings from the API aren't ISO-normalized (a registry might
// store "MEX", "Mexico", or "mexico" for the same country, or plain garbage
// like a test string) — resolve to a display name before binning so those
// merge into one row instead of splitting credits/projects across near-
// duplicates, and unrecognized values collapse into "Other" rather than
// each showing up as its own row (see useProjects.ts's normalizeCountryName).
// normalizeCountryName returns '' for a genuinely empty/null country (as
// opposed to OTHER_COUNTRY for a non-empty but unrecognized one) — fold that
// case into OTHER_COUNTRY too so a missing country never falls through to
// toBins' own "Unknown" fallback; this view only ever shows "Other" or a
// real country name.
const countryRows = computed<BinRow[]>(() =>
    toBins(summary.value.countries.map(c => ({
        label: normalizeCountryName(c.country ?? '') || OTHER_COUNTRY,
        projectCount: c.projects,
        credits: c.credits,
        methodologies: c.methodologies,
    }))),
);

const countryTop = computed(() => topBins(countryRows.value, 'credits', 10));

// ─── Developer leaderboard ─────────────────────────────────────────────────

// Distinct country/sector counts per developer are computed in SQL — they can't
// be derived on the client without every project row.
const developerStats = computed(() =>
    summary.value.developers
        .map(d => ({
            label: d.label || 'Unknown',
            projects: d.projectCount,
            credits: d.credits,
            countryCount: d.countryCount,
            sectorCount: d.sectorCount,
        }))
        .sort((a, b) => b.credits - a.credits)
        .slice(0, 10),
);

// ─── Avg project size by sector (Developer benchmark) ─────────────────────

const avgSizeBySector = computed(() => {
    return sectorRows.value
        .filter(s => s.projects > 0)
        .map(s => ({
            label: s.label,
            projects: s.projects,
            credits: s.credits,
            avg: Math.round(s.credits / s.projects),
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 8);
});

const maxAvgSize = computed(() => Math.max(1, ...avgSizeBySector.value.map(s => s.avg)));

// ─── Registry throughput (issuance per project) ────────────────────────────

const registryThroughput = computed(() => {
    return registryRows.value
        .filter(r => r.projects > 0)
        .map(r => ({
            label: r.label,
            projects: r.projects,
            credits: r.credits,
            avgPerProject: Math.round(r.credits / r.projects),
        }))
        .sort((a, b) => b.avgPerProject - a.avgPerProject)
        .slice(0, 8);
});

const maxThroughput = computed(() => Math.max(1, ...registryThroughput.value.map(r => r.avgPerProject)));

// ─── SDG Coverage matrix ─────────────────────────────────────────────────

const sdgCoverage = computed(() => {
    return SDG_LIST.map(sdg => {
        const stat = sdgStats.value.find(s => s.id === sdg.id);
        return {
            id: sdg.id,
            name: getLocalizedSDGName(sdg.id, t),
            color: sdg.color,
            projects: stat?.projects ?? 0,
            credits: stat?.credits ?? 0,
        };
    });
});

const maxSdgProjects = computed(() => Math.max(1, ...sdgCoverage.value.map(s => s.projects)));

// ─── Status x Registry heat (Registry View) ────────────────────────────────

const topRegistriesForHeat = computed(() => registryRows.value
    .sort((a, b) => b.projects - a.projects)
    .slice(0, 6)
    .map(r => r.label));

const statusByRegistry = computed(() => {
    // (registry, status) counts come pre-crossed from the API; index them once
    // rather than re-scanning a project list per cell.
    // Nested rather than a delimiter-joined composite key — registry names and
    // statuses are free-form, so any separator character risks a collision.
    const byRegistry = new Map<string, Map<string, number>>();
    for (const cell of summary.value.registryStatuses) {
        const reg = cell.registry ?? (t('common.unknown') || 'Unknown');
        let statuses = byRegistry.get(reg);
        if (!statuses) {
            statuses = new Map<string, number>();
            byRegistry.set(reg, statuses);
        }
        statuses.set(cell.status ?? '', cell.projectCount);
    }

    return topRegistriesForHeat.value.map(reg => ({
        registry: reg,
        cells: LIFECYCLE_STAGES.value.map(s => ({
            stage: s.label,
            count: byRegistry.get(reg)?.get(s.key) ?? 0,
        })),
    }));
});

const maxStatusCell = computed(() => {
    let m = 0;
    for (const r of statusByRegistry.value) for (const c of r.cells) m = Math.max(m, c.count);
    return Math.max(1, m);
});

function heatBg(count: number): string {
    if (count === 0) return 'bg-muted/30 text-muted-foreground/50';
    const intensity = count / maxStatusCell.value;
    if (intensity < 0.25) return 'bg-primary/10 text-foreground';
    if (intensity < 0.5)  return 'bg-primary/25 text-foreground';
    if (intensity < 0.75) return 'bg-primary/50 text-primary-foreground';
    return 'bg-primary/80 text-primary-foreground';
}

// ─── Pipeline conversion ratio (Buyer signal of fresh supply) ──────────────

const supplyAge = computed(() => {
    const now = new Date().getFullYear();
    const buckets = { fresh: 0, recent: 0, older: 0, legacy: 0 };
    let total = 0;
    // Bucketed from the per-vintage aggregate — one row per distinct vintage
    // rather than one per project.
    for (const row of summary.value.vintages) {
        const y = parseInt(row.label ?? '');
        if (isNaN(y)) continue;
        const age = now - y;
        total += row.credits;
        if (age <= 2)  buckets.fresh  += row.credits;
        else if (age <= 5)  buckets.recent += row.credits;
        else if (age <= 10) buckets.older  += row.credits;
        else               buckets.legacy += row.credits;
    }
    return [
        { label: t('analytics.supplyAge.fresh'),   credits: buckets.fresh,  pct: total ? Math.round(buckets.fresh  / total * 100) : 0, color: 'bg-stat-green' },
        { label: t('analytics.supplyAge.recent'), credits: buckets.recent, pct: total ? Math.round(buckets.recent / total * 100) : 0, color: 'bg-stat-blue' },
        { label: t('analytics.supplyAge.older'),  credits: buckets.older,  pct: total ? Math.round(buckets.older  / total * 100) : 0, color: 'bg-stat-amber' },
        { label: t('analytics.supplyAge.legacy'), credits: buckets.legacy, pct: total ? Math.round(buckets.legacy / total * 100) : 0, color: 'bg-stat-rose' },
    ];
});

function fmtCompact(n: number): string {
    if (n >= 1_000_000) {
        const s = (n / 1_000_000).toFixed(1).replace(/\.0$/, '');
        return `${s}M`;
    }
    if (n >= 1_000) {
        const s = (n / 1_000).toFixed(1).replace(/\.0$/, '');
        return `${s}k`;
    }
    return n.toString();
}
</script>

<template>
    <div class="space-y-0">
        <!-- Header -->
        <div class="px-6 pt-6 pb-2">
            <h1 class="text-2xl font-bold text-foreground">{{ $t('analytics.title') }}</h1>
            <p class="text-sm text-muted-foreground mt-1">
                {{ $t('analytics.subtitle', { count: totalProjects.toLocaleString(), network }) }}
            </p>
        </div>

        <!-- Headline KPI strip -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 px-6 pt-4 pb-6">
            <div
                v-for="k in headlineKpis"
                :key="k.label"
                class="rounded-xl border bg-card p-4"
            >
                <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{{ k.label }}</span>
                    <InfoTooltip :text="k.tooltip" />
                </div>
                <div class="text-xl font-bold text-foreground mt-1.5 tabular-nums">{{ k.value }}</div>
                <div class="text-[11px] text-muted-foreground mt-1 leading-snug">{{ k.hint }}</div>
            </div>
        </div>

        <!-- Tabbed card -->
        <div class="px-6 pb-6">
        <div class="rounded-xl border bg-card overflow-hidden">
            <!-- Stakeholder tabs -->
            <div class="border-b bg-muted/30">
                <nav class="flex gap-0 -mb-px overflow-x-auto">
                    <button
                        v-for="t_ in tabs"
                        :key="t_.key"
                        :class="[
                            tab === t_.key
                                ? 'border-primary text-primary bg-card'
                                : 'border-transparent text-muted-foreground hover:text-foreground',
                            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                        ]"
                        @click="tab = t_.key"
                    >
                        <component :is="t_.icon" class="h-4 w-4" />
                        {{ t_.label }}
                    </button>
                </nav>
                <div class="px-6 py-2.5 border-t bg-card">
                    <p class="text-xs text-muted-foreground">{{ tabs.find(t_ => t_.key === tab)?.desc }}</p>
                </div>
            </div>

        <!-- ── Market Overview ─────────────────────────────────────────────── -->
        <div v-if="tab === 'overview'" class="p-6 space-y-6">
            <!-- Lifecycle funnel -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        <Activity class="h-4 w-4 text-primary" />
                        {{ $t('analytics.lifecycle.title') }}
                        <InfoTooltip :text="$t('analytics.lifecycle.tooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.lifecycle.subtitle') }}</p>
                </div>
                <div class="px-5 py-5 space-y-2.5">
                    <div v-for="s in lifecycleFunnel" :key="s.key" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-28 shrink-0 font-medium">{{ s.label }}</span>
                        <InfoTooltip
                            :text="$t('analytics.lifecycle.stageTooltip', { stage: s.label, count: s.count.toLocaleString(), pct: s.pct })"
                            class="flex-1 flex min-w-0"
                        >
                            <div class="w-full h-9 bg-muted/40 rounded-md overflow-hidden relative group cursor-pointer hover:bg-muted/60 transition-colors">
                                <div
                                    v-if="s.count > 0"
                                    class="h-full bg-primary/80 transition-all duration-500 rounded-l-md group-hover:bg-primary"
                                    :style="{ width: `${s.width}%` }"
                                />
                                <div class="absolute inset-0 flex items-center justify-end pr-3 gap-3 pointer-events-none">
                                    <span class="text-[11px] font-semibold text-foreground tabular-nums">{{ s.count.toLocaleString() }}</span>
                                    <span class="text-[10px] text-muted-foreground tabular-nums w-9 text-right">{{ s.pct }}%</span>
                                </div>
                            </div>
                        </InfoTooltip>
                    </div>
                </div>
            </div>

            <!-- Vintage distribution -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        <Clock class="h-4 w-4 text-primary" />
                        {{ $t('analytics.vintage.title') }}
                        <InfoTooltip :text="$t('analytics.vintage.tooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.vintage.subtitle') }}</p>
                </div>
                <div class="px-5 py-5">
                    <div v-if="vintageBuckets.length === 0" class="text-xs text-muted-foreground text-center py-8">
                        {{ $t('analytics.vintage.noData') }}
                    </div>
                    <div v-else class="flex flex-col pt-5">
                        <!-- Chart plot area with Y-axis -->
                        <div class="flex gap-2">
                            <!-- Y-axis tick column -->
                            <div class="relative w-12 shrink-0 h-44">
                                <span
                                    v-for="(tick, i) in vintageAxis.ticks"
                                    :key="i"
                                    class="absolute right-1 text-[10px] text-muted-foreground tabular-nums"
                                    :class="vintageTickAnchorClass(i, vintageAxis.ticks.length)"
                                    :style="i !== 0 && i !== vintageAxis.ticks.length - 1 ? { bottom: `${(tick / vintageAxis.max) * 100}%` } : (i === 0 ? { bottom: '0px' } : { top: '0px' })"
                                >{{ fmtCompact(tick) }}</span>
                            </div>

                            <!-- Plot area with gridlines and bars -->
                            <div class="relative flex-1 min-w-0 h-44">
                                <!-- Horizontal grid lines -->
                                <div
                                    v-for="(tick, i) in vintageAxis.ticks"
                                    :key="i"
                                    class="absolute left-0 right-0 h-px"
                                    :class="i === 0 ? 'bg-border' : 'bg-border/40'"
                                    :style="{ bottom: `${(tick / vintageAxis.max) * 100}%` }"
                                />

                                <!-- Bars anchored to baseline -->
                                <div class="absolute inset-0 flex items-end gap-2 px-1">
                                    <div
                                        v-for="b in vintageBuckets"
                                        :key="b.vintage"
                                        class="flex-1 min-w-0 h-full flex items-end justify-center"
                                    >
                                        <!-- Bar wrapper with exact percentage height -->
                                        <div
                                            class="w-full relative flex flex-col justify-end items-center"
                                            :style="{
                                                height: b.credits > 0 ? `${(b.credits / vintageAxis.max) * 100}%` : '0px',
                                                minHeight: b.credits > 0 ? '3px' : '0px',
                                            }"
                                        >
                                            <!-- Top label positioned above the bar -->
                                            <span
                                                v-if="b.credits > 0"
                                                class="absolute bottom-full mb-1 text-[10px] font-medium text-foreground tabular-nums whitespace-nowrap pointer-events-none"
                                            >{{ fmtCompact(b.credits) }}</span>

                                            <!-- The interactive bar -->
                                            <InfoTooltip
                                                :text="$t('analytics.vintage.vintageTooltip', { vintage: b.vintage, credits: formatCredits(b.credits), projects: b.projects })"
                                                class="w-full h-full flex"
                                            >
                                                <div
                                                    class="w-full h-full bg-primary/80 hover:bg-primary transition-all duration-500 rounded-t-sm cursor-pointer"
                                                />
                                            </InfoTooltip>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- X-axis labels (vintage years) aligned with plot area -->
                        <div class="flex gap-2 mt-2">
                            <div class="w-12 shrink-0" />
                            <div class="flex-1 flex gap-2 px-1 min-w-0">
                                <span
                                    v-for="b in vintageBuckets"
                                    :key="b.vintage"
                                    class="flex-1 min-w-0 text-center text-[10px] text-muted-foreground font-medium truncate"
                                    :title="b.vintage"
                                >
                                    {{ b.vintage }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Issuance leaders side-by-side -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                            <Layers class="h-4 w-4 text-primary" />
                            {{ $t('analytics.sectors.topCreditsTitle') }}
                            <InfoTooltip :text="$t('analytics.sectors.topCreditsTooltip')" />
                        </h2>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="(s, i) in sectorTop" :key="s.label" class="flex items-center gap-3">
                            <span class="text-xs text-foreground w-28 shrink-0 truncate font-medium" :title="s.label">{{ s.label }}</span>
                            <InfoTooltip
                                :text="$t('analytics.sectors.topCreditsItemTooltip', { sector: s.label, credits: formatCredits(s.credits), projects: s.projects, pct: totalIssued ? Math.round((s.credits / totalIssued) * 100) : 0 })"
                                class="flex-1 flex min-w-0"
                            >
                                <div class="w-full h-5 bg-muted/40 rounded overflow-hidden cursor-pointer hover:bg-muted/60 transition-colors">
                                    <div class="h-full transition-all duration-500 hover:brightness-110" :style="{ width: `${(s.credits / Math.max(1, sectorTop[0]?.credits)) * 100}%`, background: sectorColors[i] }" />
                                </div>
                            </InfoTooltip>
                            <span class="text-[11px] tabular-nums text-muted-foreground w-16 text-right">{{ fmtCompact(s.credits) }}</span>
                        </div>
                    </div>
                </div>

                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                            <MapPin class="h-4 w-4 text-primary" />
                            {{ $t('analytics.countries.topCreditsTitle') }}
                            <InfoTooltip :text="$t('analytics.countries.topCreditsTooltip')" />
                        </h2>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="(c, i) in countryTop" :key="c.label" class="flex items-center gap-3">
                            <span class="text-xs font-bold text-muted-foreground w-5 tabular-nums">{{ i + 1 }}</span>
                            <InfoTooltip
                                :text="$t('analytics.countries.topCreditsItemTooltip', { country: c.label, credits: formatCredits(c.credits), projects: c.projects, pct: totalIssued ? Math.round((c.credits / totalIssued) * 100) : 0 })"
                                class="flex-1 flex min-w-0 items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
                            >
                                <span class="text-xs text-foreground truncate font-medium" :title="c.label">{{ c.label }}</span>
                                <span class="text-[11px] tabular-nums text-muted-foreground">{{ $t('analytics.countries.projectsCount', { count: c.projects }) }}</span>
                            </InfoTooltip>
                            <span class="text-xs font-semibold text-foreground tabular-nums w-16 text-right">{{ fmtCompact(c.credits) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── Buyer View ─────────────────────────────────────────────────── -->
        <div v-else-if="tab === 'buyer'" class="p-6 space-y-6">
            <!-- Supply age -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        <Clock class="h-4 w-4 text-primary" />
                        {{ $t('analytics.supplyAge.title') }}
                        <InfoTooltip :text="$t('analytics.supplyAge.tooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.supplyAge.subtitle') }}</p>
                </div>
                <div class="px-5 py-5 space-y-3">
                    <div v-for="s in supplyAge" :key="s.label" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-44 shrink-0 font-medium">{{ s.label }}</span>
                        <InfoTooltip
                            :text="$t('analytics.supplyAge.itemTooltip', { age: s.label, credits: formatCredits(s.credits), pct: s.pct })"
                            class="flex-1 flex min-w-0"
                        >
                            <div class="w-full h-7 bg-muted/40 rounded overflow-hidden cursor-pointer hover:bg-muted/60 transition-colors">
                                <div :class="s.color" class="h-full transition-all duration-500 hover:brightness-110" :style="{ width: `${s.pct}%` }" />
                            </div>
                        </InfoTooltip>
                        <span class="text-[11px] tabular-nums text-muted-foreground w-20 text-right">{{ fmtCompact(s.credits) }}</span>
                        <span class="text-xs font-semibold text-foreground tabular-nums w-10 text-right">{{ s.pct }}%</span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Available supply by sector -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                            <Leaf class="h-4 w-4 text-primary" />
                            {{ $t('analytics.sectors.availableSupplyTitle') }}
                            <InfoTooltip :text="$t('analytics.sectors.availableSupplyTooltip')" />
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.sectors.availableSupplySub') }}</p>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div
                            v-for="s in sectorRows.slice().sort((a, b) => b.credits - a.credits).slice(0, 8)"
                            :key="s.label"
                            class="flex items-center gap-3"
                        >
                            <span class="text-xs text-foreground w-28 shrink-0 truncate" :title="s.label">{{ s.label }}</span>
                            <InfoTooltip
                                :text="$t('analytics.sectors.availableItemTooltip', { sector: s.label, credits: formatCredits(s.credits), projects: s.projects })"
                                class="flex-1 flex min-w-0"
                            >
                                <div class="w-full h-5 bg-muted/40 rounded overflow-hidden cursor-pointer hover:bg-muted/60 transition-colors">
                                    <div class="h-full bg-stat-green transition-all duration-500 hover:brightness-110" :style="{ width: `${(s.credits / Math.max(1, sectorTop[0]?.credits)) * 100}%` }" />
                                </div>
                            </InfoTooltip>
                            <span class="text-[11px] tabular-nums text-muted-foreground w-16 text-right">{{ fmtCompact(s.credits) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Methodology popularity -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                            <Award class="h-4 w-4 text-primary" />
                            {{ $t('analytics.methodologies.adoptionTitle') }}
                            <InfoTooltip :text="$t('analytics.methodologies.adoptionTooltip')" />
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.methodologies.adoptionSub') }}</p>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="(m, i) in methodologyTop" :key="m.label" class="flex items-center gap-3">
                            <span class="text-xs font-bold text-muted-foreground w-5 tabular-nums">{{ i + 1 }}</span>
                            <InfoTooltip
                                :text="$t('analytics.methodologies.itemTooltip', { methodology: m.label, credits: formatCredits(m.credits), projects: m.projects })"
                                class="flex-1 flex min-w-0 items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
                            >
                                <span class="text-xs text-foreground truncate font-medium" :title="m.label">{{ m.label }}</span>
                                <span class="text-[10px] text-muted-foreground tabular-nums">{{ $t('analytics.methodologies.projectsCount', { count: m.projects }) }}</span>
                            </InfoTooltip>
                            <span class="text-xs font-semibold text-foreground tabular-nums w-16 text-right">{{ fmtCompact(m.credits) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SDG coverage -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        <Globe2 class="h-4 w-4 text-primary" />
                        {{ $t('analytics.sdgs.cobenefitTitle') }}
                        <InfoTooltip :text="$t('analytics.sdgs.cobenefitTooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.sdgs.cobenefitSub') }}</p>
                </div>
                <div class="px-5 py-5">
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        <InfoTooltip
                            v-for="sdg in sdgCoverage"
                            :key="sdg.id"
                            :text="$t('analytics.sdgs.itemTooltip', { sdg: sdg.id, name: sdg.name, projects: sdg.projects, credits: formatCredits(sdg.credits) })"
                            class="flex"
                        >
                            <div
                                class="w-full rounded-lg border bg-card p-3 flex flex-col gap-1.5 cursor-pointer hover:bg-muted/20 transition-colors"
                                :style="{ borderLeftColor: sdg.color, borderLeftWidth: '3px' }"
                            >
                                <div class="flex items-center gap-2">
                                    <img :src="`/sdgs/E-WEB-Goal-${String(sdg.id).padStart(2, '0')}.png`" :alt="`${$t('sdgs.columns.sdg')} ${sdg.id}`" class="h-7 w-7 rounded shrink-0" />
                                    <div class="min-w-0">
                                        <div class="text-[10px] font-bold text-foreground">{{ $t('sdgs.columns.sdg') }} {{ sdg.id }}</div>
                                        <div class="text-[10px] text-muted-foreground truncate" :title="sdg.name">{{ sdg.name }}</div>
                                    </div>
                                </div>
                                <div class="h-1 bg-muted/40 rounded overflow-hidden">
                                    <div class="h-full transition-all duration-500" :style="{ width: `${(sdg.projects / maxSdgProjects) * 100}%`, background: sdg.color }" />
                                </div>
                                <div class="flex items-center justify-between text-[10px]">
                                    <span class="text-muted-foreground">{{ $t('analytics.sdgs.projectsCount', { count: sdg.projects }) }}</span>
                                    <span class="text-foreground font-semibold tabular-nums">{{ fmtCompact(sdg.credits) }}</span>
                                </div>
                            </div>
                        </InfoTooltip>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── Developer View ─────────────────────────────────────────────── -->
        <div v-else-if="tab === 'developer'" class="p-6 space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Avg project size by sector -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                            <TrendingUp class="h-4 w-4 text-primary" />
                            {{ $t('analytics.sectors.avgSizeTitle') }}
                            <InfoTooltip :text="$t('analytics.sectors.avgSizeTooltip')" />
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.sectors.avgSizeSub') }}</p>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="s in avgSizeBySector" :key="s.label" class="flex items-center gap-3">
                            <span class="text-xs text-foreground w-28 shrink-0 truncate font-medium" :title="s.label">{{ s.label }}</span>
                            <InfoTooltip
                                :text="$t('analytics.sectors.avgSizeItemTooltip', { sector: s.label, avg: formatCredits(s.avg), credits: formatCredits(s.credits), projects: s.projects })"
                                class="flex-1 flex min-w-0"
                            >
                                <div class="w-full h-5 bg-muted/40 rounded overflow-hidden cursor-pointer hover:bg-muted/60 transition-colors">
                                    <div class="h-full bg-stat-blue transition-all duration-500 hover:brightness-110" :style="{ width: `${(s.avg / maxAvgSize) * 100}%` }" />
                                </div>
                            </InfoTooltip>
                            <span class="text-[11px] tabular-nums text-foreground w-16 text-right font-semibold">{{ fmtCompact(s.avg) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Pipeline / lifecycle for developers -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                            <CheckCircle2 class="h-4 w-4 text-primary" />
                            {{ $t('analytics.statusDist.title') }}
                            <InfoTooltip :text="$t('analytics.statusDist.tooltip')" />
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.statusDist.subtitle') }}</p>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="s in lifecycleFunnel" :key="s.key" class="flex items-center gap-3">
                            <span class="text-xs text-foreground w-24 shrink-0 font-medium">{{ s.label }}</span>
                            <InfoTooltip
                                :text="$t('analytics.lifecycle.stageTooltip', { stage: s.label, count: s.count.toLocaleString(), pct: s.pct })"
                                class="flex-1 flex min-w-0"
                            >
                                <div class="w-full h-5 bg-muted/40 rounded overflow-hidden relative group cursor-pointer hover:bg-muted/60 transition-colors">
                                    <div
                                        v-if="s.count > 0"
                                        class="h-full bg-stat-amber transition-all duration-500 rounded-l group-hover:brightness-110"
                                        :style="{ width: `${s.width}%` }"
                                    />
                                </div>
                            </InfoTooltip>
                            <span class="text-[11px] tabular-nums text-foreground w-12 text-right">{{ s.count.toLocaleString() }}</span>
                            <span class="text-[10px] text-muted-foreground tabular-nums w-9 text-right">{{ s.pct }}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top developers leaderboard -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        <Award class="h-4 w-4 text-primary" />
                        {{ $t('analytics.developers.title') }}
                        <InfoTooltip :text="$t('analytics.developers.tooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.developers.subtitle') }}</p>
                </div>
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-muted/20 border-b">
                            <th class="text-left py-2.5 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('analytics.developers.columns.rank') }}</th>
                            <th class="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('analytics.developers.columns.developer') }}</th>
                            <th class="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('analytics.developers.columns.projects') }}</th>
                            <th class="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('analytics.developers.columns.countries') }}</th>
                            <th class="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('analytics.developers.columns.sectors') }}</th>
                            <th class="text-right py-2.5 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('analytics.developers.columns.credits') }}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr v-for="(d, i) in developerStats" :key="d.label" class="hover:bg-muted/30">
                            <td class="py-3 px-5 font-semibold text-muted-foreground tabular-nums">#{{ i + 1 }}</td>
                            <td class="py-3 px-4 font-medium text-foreground">{{ d.label }}</td>
                            <td class="py-3 px-4 text-right text-foreground tabular-nums">{{ d.projects }}</td>
                            <td class="py-3 px-4 text-right text-foreground tabular-nums">{{ d.countryCount }}</td>
                            <td class="py-3 px-4 text-right text-foreground tabular-nums">{{ d.sectorCount }}</td>
                            <td class="py-3 px-5 text-right text-foreground tabular-nums font-semibold">{{ fmtCompact(d.credits) }}</td>
                        </tr>
                        <tr v-if="developerStats.length === 0">
                            <td colspan="6" class="py-8 px-5 text-center text-sm text-muted-foreground">{{ $t('analytics.developers.noData') }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ── Registry View ─────────────────────────────────────────────── -->
        <div v-else-if="tab === 'registry'" class="p-6 space-y-6">
            <!-- Throughput per project -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        <TrendingUp class="h-4 w-4 text-primary" />
                        {{ $t('analytics.registries.throughputTitle') }}
                        <InfoTooltip :text="$t('analytics.registries.throughputTooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.registries.throughputSub') }}</p>
                </div>
                <div class="px-5 py-5 space-y-2.5">
                    <div v-for="r in registryThroughput" :key="r.label" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-32 shrink-0 truncate font-medium" :title="r.label">{{ r.label }}</span>
                        <InfoTooltip
                            :text="$t('analytics.registries.throughputItemTooltip', { registry: r.label, avg: formatCredits(r.avgPerProject), credits: formatCredits(r.credits), projects: r.projects })"
                            class="flex-1 flex min-w-0"
                        >
                            <div class="w-full h-6 bg-muted/40 rounded overflow-hidden cursor-pointer hover:bg-muted/60 transition-colors">
                                <div class="h-full bg-primary/70 transition-all duration-500 hover:brightness-110" :style="{ width: `${(r.avgPerProject / maxThroughput) * 100}%` }" />
                            </div>
                        </InfoTooltip>
                        <span class="text-[10px] text-muted-foreground tabular-nums w-12 text-right">{{ $t('analytics.methodologies.projectsCount', { count: r.projects }) }}</span>
                        <span class="text-xs font-semibold text-foreground tabular-nums w-20 text-right">{{ fmtCompact(r.avgPerProject) }} {{ $t('analytics.registries.perProj') }}</span>
                    </div>
                </div>
            </div>

            <!-- Status x Registry heatmap -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        <BarChart3 class="h-4 w-4 text-primary" />
                        {{ $t('analytics.registries.heatmapTitle') }}
                        <InfoTooltip :text="$t('analytics.registries.heatmapTooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.registries.heatmapSub') }}</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left py-2.5 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('analytics.registries.colRegistry') }}</th>
                                <th v-for="s in LIFECYCLE_STAGES" :key="s.key" class="py-2.5 px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-center">{{ s.label }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in statusByRegistry" :key="row.registry" class="border-b last:border-b-0">
                                <td class="py-2.5 px-5 font-medium text-foreground text-xs whitespace-nowrap">{{ row.registry }}</td>
                                <td v-for="c in row.cells" :key="c.stage" class="p-1.5 text-center">
                                    <InfoTooltip
                                        :text="$t('analytics.registries.heatCellTooltip', { registry: row.registry, stage: c.stage, count: c.count })"
                                        class="w-full flex"
                                    >
                                        <div :class="heatBg(c.count)" class="w-full rounded text-xs font-semibold py-2 tabular-nums cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all">
                                            {{ c.count }}
                                        </div>
                                    </InfoTooltip>
                                </td>
                            </tr>
                            <tr v-if="statusByRegistry.length === 0">
                                <td :colspan="LIFECYCLE_STAGES.length + 1" class="py-8 px-5 text-center text-sm text-muted-foreground">{{ $t('analytics.registries.noHeatData') }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Registry market share -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        <Building2 class="h-4 w-4 text-primary" />
                        {{ $t('analytics.registries.marketShareTitle') }}
                        <InfoTooltip :text="$t('analytics.registries.marketShareTooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.registries.marketShareSub') }}</p>
                </div>
                <div class="px-5 py-5 space-y-2.5">
                    <div v-for="(r, i) in registryTop" :key="r.label" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-32 shrink-0 truncate font-medium" :title="r.label">{{ r.label }}</span>
                        <InfoTooltip
                            :text="$t('analytics.registries.marketShareItemTooltip', { registry: r.label, credits: formatCredits(r.credits), pct: totalIssued ? Math.round((r.credits / totalIssued) * 100) : 0, projects: r.projects })"
                            class="flex-1 flex min-w-0"
                        >
                            <div class="w-full h-5 bg-muted/40 rounded overflow-hidden cursor-pointer hover:bg-muted/60 transition-colors">
                                <div class="h-full transition-all duration-500 hover:brightness-110" :style="{ width: `${(r.credits / Math.max(1, registryTop[0]?.credits)) * 100}%`, background: registryColors[i] }" />
                            </div>
                        </InfoTooltip>
                        <span class="text-[11px] tabular-nums text-muted-foreground w-10 text-right">{{ $t('analytics.methodologies.projectsCount', { count: r.projects }) }}</span>
                        <span class="text-xs font-semibold text-foreground tabular-nums w-16 text-right">{{ fmtCompact(r.credits) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── Climate Impact ───────────────────────────────────────────── -->
        <div v-else-if="tab === 'impact'" class="p-6 space-y-6">
            <!-- SDG full coverage with credits -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        <Globe2 class="h-4 w-4 text-primary" />
                        {{ $t('analytics.sdgs.alignmentTitle') }}
                        <InfoTooltip :text="$t('analytics.sdgs.alignmentTooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.sdgs.alignmentSub') }}</p>
                </div>
                <div class="px-5 py-5">
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        <InfoTooltip
                            v-for="sdg in sdgCoverage"
                            :key="sdg.id"
                            :text="$t('analytics.sdgs.itemTooltip', { sdg: sdg.id, name: sdg.name, projects: sdg.projects, credits: formatCredits(sdg.credits) })"
                            class="flex"
                        >
                            <div
                                class="w-full rounded-lg border bg-card p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                                :style="{ borderLeftColor: sdg.color, borderLeftWidth: '3px' }"
                            >
                                <div class="flex items-center gap-2 mb-2">
                                    <img :src="`/sdgs/E-WEB-Goal-${String(sdg.id).padStart(2, '0')}.png`" :alt="`${$t('sdgs.columns.sdg')} ${sdg.id}`" class="h-8 w-8 rounded shrink-0" />
                                    <div class="min-w-0 flex-1">
                                        <div class="text-[10px] font-bold text-foreground">{{ $t('sdgs.columns.sdg') }} {{ sdg.id }}</div>
                                        <div class="text-[10px] text-muted-foreground truncate" :title="sdg.name">{{ sdg.name }}</div>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                    <span>{{ $t('analytics.sdgs.projectsLabel') }}</span>
                                    <span class="font-semibold text-foreground tabular-nums">{{ sdg.projects }}</span>
                                </div>
                                <div class="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span>{{ $t('analytics.sdgs.creditsLabel') }}</span>
                                    <span class="font-semibold text-foreground tabular-nums">{{ fmtCompact(sdg.credits) }}</span>
                                </div>
                            </div>
                        </InfoTooltip>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Sector contribution -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                            <Leaf class="h-4 w-4 text-primary" />
                            {{ $t('analytics.sectors.contributionTitle') }}
                            <InfoTooltip :text="$t('analytics.sectors.contributionTooltip')" />
                        </h2>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="(s, i) in sectorTop" :key="s.label" class="flex items-center gap-3">
                            <span class="text-xs text-foreground w-28 shrink-0 truncate" :title="s.label">{{ s.label }}</span>
                            <InfoTooltip
                                :text="$t('analytics.sectors.contributionItemTooltip', { sector: s.label, credits: formatCredits(s.credits), pct: totalIssued ? Math.round((s.credits / totalIssued) * 100) : 0, projects: s.projects })"
                                class="flex-1 flex min-w-0"
                            >
                                <div class="w-full h-5 bg-muted/40 rounded overflow-hidden cursor-pointer hover:bg-muted/60 transition-colors">
                                    <div class="h-full transition-all duration-500 hover:brightness-110" :style="{ width: `${totalIssued ? (s.credits / totalIssued) * 100 : 0}%`, background: sectorColors[i] }" />
                                </div>
                            </InfoTooltip>
                            <span class="text-xs font-semibold text-foreground tabular-nums w-12 text-right">{{ totalIssued ? Math.round((s.credits / totalIssued) * 100) : 0 }}%</span>
                        </div>
                    </div>
                </div>

                <!-- Country contribution -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                            <MapPin class="h-4 w-4 text-primary" />
                            {{ $t('analytics.countries.contributionTitle') }}
                            <InfoTooltip :text="$t('analytics.countries.contributionTooltip')" />
                        </h2>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="c in countryTop" :key="c.label" class="flex items-center gap-3">
                            <span class="text-xs text-foreground w-28 shrink-0 truncate" :title="c.label">{{ c.label }}</span>
                            <InfoTooltip
                                :text="$t('analytics.countries.contributionItemTooltip', { country: c.label, credits: formatCredits(c.credits), pct: totalIssued ? Math.round((c.credits / totalIssued) * 100) : 0, projects: c.projects })"
                                class="flex-1 flex min-w-0"
                            >
                                <div class="w-full h-5 bg-muted/40 rounded overflow-hidden cursor-pointer hover:bg-muted/60 transition-colors">
                                    <div class="h-full bg-stat-green transition-all duration-500 hover:brightness-110" :style="{ width: `${totalIssued ? (c.credits / totalIssued) * 100 : 0}%` }" />
                                </div>
                            </InfoTooltip>
                            <span class="text-xs font-semibold text-foreground tabular-nums w-12 text-right">{{ totalIssued ? Math.round((c.credits / totalIssued) * 100) : 0 }}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Vintage concentration risk -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        <AlertCircle class="h-4 w-4 text-stat-amber" />
                        {{ $t('analytics.vintageConcentration.title') }}
                        <InfoTooltip :text="$t('analytics.vintageConcentration.tooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('analytics.vintageConcentration.subtitle') }}</p>
                </div>
                <div class="px-5 py-5 space-y-3">
                    <div v-for="s in supplyAge" :key="s.label" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-44 shrink-0 font-medium">{{ s.label }}</span>
                        <InfoTooltip
                            :text="$t('analytics.vintageConcentration.itemTooltip', { age: s.label, credits: formatCredits(s.credits), pct: s.pct })"
                            class="flex-1 flex min-w-0"
                        >
                            <div class="w-full h-7 bg-muted/40 rounded overflow-hidden cursor-pointer hover:bg-muted/60 transition-colors">
                                <div :class="s.color" class="h-full transition-all duration-500 hover:brightness-110" :style="{ width: `${s.pct}%` }" />
                            </div>
                        </InfoTooltip>
                        <span class="text-xs font-semibold text-foreground tabular-nums w-10 text-right">{{ s.pct }}%</span>
                    </div>
                </div>
            </div>
        </div>
        </div>
        </div>
    </div>
</template>
