<script setup lang="ts">
import {
    BarChart3, TrendingUp,
    ShoppingCart, Hammer, Building2, Globe2,
    Leaf, Layers, MapPin, Clock, Award, Activity,
    CheckCircle2, AlertCircle,
} from 'lucide-vue-next';
import { formatCredits } from '~/lib/format';
import { allocateDonutColors } from '~/lib/chart-colors';
import { SDG_LIST } from '~/lib/sdgs';

const { t } = useI18n();
const { projects: allProjects } = useProjects();
const { sdgStats } = useSdgStats();
const { network } = useNetwork();

type StakeholderTab = 'overview' | 'buyer' | 'developer' | 'registry' | 'impact';
const tab = ref<StakeholderTab>('overview');

const tabs: Array<{ key: StakeholderTab; label: string; icon: any; desc: string }> = [
    { key: 'overview',  label: 'Market Overview', icon: BarChart3, desc: 'Lifecycle, vintage, and pipeline pulse' },
    { key: 'buyer',     label: 'Buyer View',      icon: ShoppingCart, desc: 'Supply, vintage, and SDG availability' },
    { key: 'developer', label: 'Developer View',  icon: Hammer,    desc: 'Benchmark project scale and sector performance' },
    { key: 'registry',  label: 'Registry View',   icon: Building2, desc: 'Throughput, methodology adoption, geographic reach' },
    { key: 'impact',    label: 'Climate Impact',  icon: Globe2,    desc: 'SDG alignment, sector contribution, vintage concentration' },
];

// ─── Shared aggregations ─────────────────────────────────────────────────────

const projects = computed(() => allProjects.value ?? []);
const totalProjects = computed(() => projects.value.length);

const totalIssued = computed(() => projects.value.reduce((s, p) => s + (p.totalIssued ?? 0), 0));
const totalRetired = computed(() => projects.value.reduce((s, p) => s + (p.totalRetired ?? 0), 0));
const totalActive = computed(() => projects.value.reduce((s, p) => s + (p.totalActive ?? 0), 0));

// Retirement rate — what share of issued credits has been retired (carbon market liquidity signal)
const retirementRate = computed(() => {
    if (totalIssued.value === 0) return 0;
    return Math.round((totalRetired.value / totalIssued.value) * 100);
});

// Pipeline = projects not yet issuing — supply that's coming online
const pipelineProjects = computed(
    () => projects.value.filter(p => ['Registered', 'Under Validation', 'Verified'].includes(p.status)).length,
);

// Vintage spread — how recent the supply is (newer = higher integrity claim)
const avgVintageYear = computed(() => {
    const years = projects.value
        .map(p => parseInt(p.vintage))
        .filter(y => !isNaN(y) && y >= 2000 && y <= 2030);
    if (years.length === 0) return null;
    return Math.round(years.reduce((s, y) => s + y, 0) / years.length);
});

// Average crediting period duration in years
const avgCreditingPeriodYears = computed(() => {
    const diffs: number[] = [];
    for (const p of projects.value) {
        if (!p.creditingPeriodStart || !p.creditingPeriodEnd) continue;
        const s = new Date(p.creditingPeriodStart).getTime();
        const e = new Date(p.creditingPeriodEnd).getTime();
        if (isNaN(s) || isNaN(e) || e <= s) continue;
        diffs.push((e - s) / (1000 * 60 * 60 * 24 * 365.25));
    }
    if (diffs.length === 0) return null;
    return Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10;
});

// Headline KPIs
const headlineKpis = computed(() => [
    { label: 'Active Supply',       value: formatCredits(totalActive.value),     hint: 'Credits in circulation (issued − retired)' },
    { label: 'Retirement Rate',     value: `${retirementRate.value}%`,           hint: 'Issued credits that have been retired' },
    { label: 'Pipeline Projects',   value: pipelineProjects.value.toLocaleString(), hint: 'Projects pre-issuance: registered → verified' },
    { label: 'Avg Vintage Year',    value: avgVintageYear.value?.toString() ?? '—', hint: 'Lower = older supply, higher = fresher' },
    { label: 'Avg Crediting Period', value: avgCreditingPeriodYears.value != null ? `${avgCreditingPeriodYears.value} yr` : '—', hint: 'Mean project crediting period length' },
]);

// ─── Lifecycle funnel (Market Overview) ──────────────────────────────────────

const LIFECYCLE_STAGES: Array<{ key: string; label: string }> = [
    { key: 'Registered',       label: 'Registered' },
    { key: 'Under Validation', label: 'Validation' },
    { key: 'Verified',         label: 'Verified' },
    { key: 'Issuing',          label: 'Issuing' },
    { key: 'Completed',        label: 'Completed' },
];

const lifecycleFunnel = computed(() => {
    const counts: Record<string, number> = {};
    for (const p of projects.value) counts[p.status] = (counts[p.status] ?? 0) + 1;
    const max = Math.max(1, ...Object.values(counts));
    return LIFECYCLE_STAGES.map(s => ({
        ...s,
        count: counts[s.key] ?? 0,
        pct: Math.round(((counts[s.key] ?? 0) / Math.max(1, totalProjects.value)) * 100),
        width: Math.max(8, Math.round(((counts[s.key] ?? 0) / max) * 100)),
    }));
});

// ─── Vintage distribution + retirement age ──────────────────────────────────

const vintageBuckets = computed(() => {
    const map: Record<string, { vintage: string; projects: number; credits: number }> = {};
    for (const p of projects.value) {
        const v = p.vintage || 'Unknown';
        if (!map[v]) map[v] = { vintage: v, projects: 0, credits: 0 };
        map[v].projects += 1;
        map[v].credits += p.totalIssued ?? 0;
    }
    return Object.values(map)
        .filter(b => /^\d{4}$/.test(b.vintage))
        .sort((a, b) => a.vintage.localeCompare(b.vintage));
});

const maxVintageCredits = computed(() => Math.max(1, ...vintageBuckets.value.map(b => b.credits)));

// ─── Sector breakdown (used by Buyer + Climate Impact) ───────────────────────

interface BinRow { label: string; projects: number; credits: number }

function topBins(rows: BinRow[], sortBy: 'projects' | 'credits', n = 8): BinRow[] {
    return [...rows]
        .sort((a, b) => (sortBy === 'projects' ? b.projects - a.projects : b.credits - a.credits))
        .slice(0, n);
}

const sectorRows = computed<BinRow[]>(() => {
    const map: Record<string, BinRow> = {};
    for (const p of projects.value) {
        const k = p.sector || 'Unknown';
        if (!map[k]) map[k] = { label: k, projects: 0, credits: 0 };
        map[k].projects += 1;
        map[k].credits += p.totalIssued ?? 0;
    }
    return Object.values(map);
});

const sectorTop = computed(() => topBins(sectorRows.value, 'credits'));
const sectorColors = computed(() => allocateDonutColors(sectorTop.value.length, 'sector'));

// ─── Registry breakdown ─────────────────────────────────────────────────────

const registryRows = computed<BinRow[]>(() => {
    const map: Record<string, BinRow> = {};
    for (const p of projects.value) {
        const k = p.registry || 'Unknown';
        if (!map[k]) map[k] = { label: k, projects: 0, credits: 0 };
        map[k].projects += 1;
        map[k].credits += p.totalIssued ?? 0;
    }
    return Object.values(map);
});

const registryTop = computed(() => topBins(registryRows.value, 'credits'));
const registryColors = computed(() => allocateDonutColors(registryTop.value.length, 'registry'));

// ─── Methodology breakdown ─────────────────────────────────────────────────

const methodologyRows = computed<BinRow[]>(() => {
    const map: Record<string, BinRow> = {};
    for (const p of projects.value) {
        const k = p.methodology || 'Unknown';
        if (!map[k]) map[k] = { label: k, projects: 0, credits: 0 };
        map[k].projects += 1;
        map[k].credits += p.totalIssued ?? 0;
    }
    return Object.values(map);
});

const methodologyTop = computed(() => topBins(methodologyRows.value, 'credits', 10));

// ─── Country breakdown ─────────────────────────────────────────────────────

const countryRows = computed<BinRow[]>(() => {
    const map: Record<string, BinRow> = {};
    for (const p of projects.value) {
        const k = p.country || 'Unknown';
        if (!map[k]) map[k] = { label: k, projects: 0, credits: 0 };
        map[k].projects += 1;
        map[k].credits += p.totalIssued ?? 0;
    }
    return Object.values(map);
});

const countryTop = computed(() => topBins(countryRows.value, 'credits', 10));

// ─── Developer leaderboard ─────────────────────────────────────────────────

interface DeveloperBin { label: string; projects: number; credits: number; countries: Set<string>; sectors: Set<string> }

const developerStats = computed(() => {
    const map: Record<string, DeveloperBin> = {};
    for (const p of projects.value) {
        const k = p.developer || 'Unknown';
        if (!map[k]) map[k] = { label: k, projects: 0, credits: 0, countries: new Set(), sectors: new Set() };
        const r = map[k];
        r.projects += 1;
        r.credits += p.totalIssued ?? 0;
        if (p.country) r.countries.add(p.country);
        if (p.sector) r.sectors.add(p.sector);
    }
    return Object.values(map)
        .map(d => ({
            label: d.label,
            projects: d.projects,
            credits: d.credits,
            countryCount: d.countries.size,
            sectorCount: d.sectors.size,
        }))
        .sort((a, b) => b.credits - a.credits)
        .slice(0, 10);
});

// ─── Avg project size by sector (Developer benchmark) ─────────────────────

const avgSizeBySector = computed(() => {
    return sectorRows.value
        .filter(s => s.projects > 0)
        .map(s => ({
            label: s.label,
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
            name: sdg.name,
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
    const rows: Array<{ registry: string; cells: Array<{ stage: string; count: number }> }> = [];
    for (const reg of topRegistriesForHeat.value) {
        const cells = LIFECYCLE_STAGES.map(s => ({
            stage: s.label,
            count: projects.value.filter(p => p.registry === reg && p.status === s.key).length,
        }));
        rows.push({ registry: reg, cells });
    }
    return rows;
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
    for (const p of projects.value) {
        const y = parseInt(p.vintage);
        if (isNaN(y)) continue;
        const age = now - y;
        total += p.totalIssued ?? 0;
        if (age <= 2)  buckets.fresh  += p.totalIssued ?? 0;
        else if (age <= 5)  buckets.recent += p.totalIssued ?? 0;
        else if (age <= 10) buckets.older  += p.totalIssued ?? 0;
        else               buckets.legacy += p.totalIssued ?? 0;
    }
    return [
        { label: '≤ 2 years (Fresh)',   credits: buckets.fresh,  pct: total ? Math.round(buckets.fresh  / total * 100) : 0, color: 'bg-stat-green' },
        { label: '3 – 5 years (Recent)', credits: buckets.recent, pct: total ? Math.round(buckets.recent / total * 100) : 0, color: 'bg-stat-blue' },
        { label: '6 – 10 years (Older)', credits: buckets.older,  pct: total ? Math.round(buckets.older  / total * 100) : 0, color: 'bg-stat-amber' },
        { label: '> 10 years (Legacy)', credits: buckets.legacy, pct: total ? Math.round(buckets.legacy / total * 100) : 0, color: 'bg-stat-rose' },
    ];
});

function fmtCompact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
}
</script>

<template>
    <div class="space-y-0">
        <!-- Header -->
        <div class="px-6 pt-6 pb-2">
            <h1 class="text-2xl font-bold text-foreground">Carbon Market Analytics</h1>
            <p class="text-sm text-muted-foreground mt-1">
                Stakeholder-driven analytics across {{ totalProjects.toLocaleString() }} projects on
                <span class="font-medium text-foreground capitalize">{{ network }}</span>
            </p>
        </div>

        <!-- Headline KPI strip -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 px-6 pt-4 pb-6">
            <div
                v-for="k in headlineKpis"
                :key="k.label"
                class="rounded-xl border bg-card p-4"
                :title="k.hint"
            >
                <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{{ k.label }}</div>
                <div class="text-xl font-bold text-foreground mt-1.5 tabular-nums">{{ k.value }}</div>
                <div class="text-[11px] text-muted-foreground mt-1 leading-snug">{{ k.hint }}</div>
            </div>
        </div>

        <!-- Stakeholder tabs -->
        <div class="border-y bg-muted/20">
            <nav class="flex gap-0 overflow-x-auto px-6">
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
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Activity class="h-4 w-4 text-primary" />
                        Project Lifecycle Funnel
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">Distribution across the Guardian policy workflow stages</p>
                </div>
                <div class="px-5 py-5 space-y-2.5">
                    <div v-for="s in lifecycleFunnel" :key="s.key" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-28 shrink-0 font-medium">{{ s.label }}</span>
                        <div class="flex-1 h-9 bg-muted/40 rounded-md overflow-hidden relative">
                            <div
                                class="h-full bg-primary/80 transition-all duration-500"
                                :style="{ width: `${s.width}%` }"
                            />
                            <div class="absolute inset-0 flex items-center justify-end pr-3 gap-3">
                                <span class="text-[11px] font-semibold text-foreground tabular-nums">{{ s.count.toLocaleString() }}</span>
                                <span class="text-[10px] text-muted-foreground tabular-nums w-9 text-right">{{ s.pct }}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Vintage distribution -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Clock class="h-4 w-4 text-primary" />
                        Vintage Distribution
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">Credits issued grouped by project vintage year</p>
                </div>
                <div class="px-5 py-5">
                    <div v-if="vintageBuckets.length === 0" class="text-xs text-muted-foreground text-center py-8">
                        No vintage data available
                    </div>
                    <div v-else class="flex items-end gap-2 h-40">
                        <div v-for="b in vintageBuckets" :key="b.vintage" class="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                            <div class="text-[10px] font-medium text-foreground tabular-nums">{{ fmtCompact(b.credits) }}</div>
                            <div
                                class="w-full bg-primary/70 hover:bg-primary transition-colors rounded-sm relative group"
                                :style="{ height: `${(b.credits / maxVintageCredits) * 100}%`, minHeight: b.credits > 0 ? '3px' : '0' }"
                                :title="`${b.vintage}: ${formatCredits(b.credits)} credits across ${b.projects} project(s)`"
                            />
                            <div class="text-[10px] text-muted-foreground truncate w-full text-center">{{ b.vintage }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Issuance leaders side-by-side -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Layers class="h-4 w-4 text-primary" />
                            Top Sectors by Credits Issued
                        </h2>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="(s, i) in sectorTop" :key="s.label" class="flex items-center gap-3">
                            <span class="text-xs text-foreground w-28 shrink-0 truncate font-medium" :title="s.label">{{ s.label }}</span>
                            <div class="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                                <div class="h-full transition-all duration-500" :style="{ width: `${(s.credits / Math.max(1, sectorTop[0]?.credits)) * 100}%`, background: sectorColors[i] }" />
                            </div>
                            <span class="text-[11px] tabular-nums text-muted-foreground w-16 text-right">{{ fmtCompact(s.credits) }}</span>
                        </div>
                    </div>
                </div>

                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <MapPin class="h-4 w-4 text-primary" />
                            Top Host Countries by Credits
                        </h2>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="(c, i) in countryTop" :key="c.label" class="flex items-center gap-3">
                            <span class="text-xs font-bold text-muted-foreground w-5 tabular-nums">{{ i + 1 }}</span>
                            <span class="text-xs text-foreground flex-1 truncate font-medium" :title="c.label">{{ c.label }}</span>
                            <span class="text-[11px] tabular-nums text-muted-foreground">{{ c.projects }} proj</span>
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
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Clock class="h-4 w-4 text-primary" />
                        Supply Age Profile
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">Distribution of issued credits by vintage age — fresher vintages are preferred by most corporate buyers</p>
                </div>
                <div class="px-5 py-5 space-y-3">
                    <div v-for="s in supplyAge" :key="s.label" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-44 shrink-0 font-medium">{{ s.label }}</span>
                        <div class="flex-1 h-7 bg-muted/40 rounded overflow-hidden">
                            <div :class="s.color" class="h-full transition-all duration-500" :style="{ width: `${s.pct}%` }" />
                        </div>
                        <span class="text-[11px] tabular-nums text-muted-foreground w-20 text-right">{{ fmtCompact(s.credits) }}</span>
                        <span class="text-xs font-semibold text-foreground tabular-nums w-10 text-right">{{ s.pct }}%</span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Available supply by sector -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Leaf class="h-4 w-4 text-primary" />
                            Available Supply by Sector
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">Active credits (issued − retired)</p>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div
                            v-for="s in sectorRows.slice().sort((a, b) => b.credits - a.credits).slice(0, 8)"
                            :key="s.label"
                            class="flex items-center gap-3"
                        >
                            <span class="text-xs text-foreground w-28 shrink-0 truncate" :title="s.label">{{ s.label }}</span>
                            <div class="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                                <div class="h-full bg-stat-green transition-all duration-500" :style="{ width: `${(s.credits / Math.max(1, sectorTop[0]?.credits)) * 100}%` }" />
                            </div>
                            <span class="text-[11px] tabular-nums text-muted-foreground w-16 text-right">{{ fmtCompact(s.credits) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Methodology popularity -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Award class="h-4 w-4 text-primary" />
                            Methodology Adoption
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">Most-used methodologies by credit volume</p>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="(m, i) in methodologyTop" :key="m.label" class="flex items-center gap-3">
                            <span class="text-xs font-bold text-muted-foreground w-5 tabular-nums">{{ i + 1 }}</span>
                            <span class="text-xs text-foreground flex-1 truncate font-medium" :title="m.label">{{ m.label }}</span>
                            <span class="text-[10px] text-muted-foreground tabular-nums">{{ m.projects }}p</span>
                            <span class="text-xs font-semibold text-foreground tabular-nums w-16 text-right">{{ fmtCompact(m.credits) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SDG coverage -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Globe2 class="h-4 w-4 text-primary" />
                        SDG Co-benefit Coverage
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">Number of projects claiming each UN Sustainable Development Goal</p>
                </div>
                <div class="px-5 py-5">
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        <div
                            v-for="sdg in sdgCoverage"
                            :key="sdg.id"
                            class="rounded-lg border bg-card p-3 flex flex-col gap-1.5"
                            :style="{ borderLeftColor: sdg.color, borderLeftWidth: '3px' }"
                        >
                            <div class="flex items-center gap-2">
                                <img :src="`/sdgs/E-WEB-Goal-${String(sdg.id).padStart(2, '0')}.png`" :alt="`SDG ${sdg.id}`" class="h-7 w-7 rounded shrink-0" />
                                <div class="min-w-0">
                                    <div class="text-[10px] font-bold text-foreground">SDG {{ sdg.id }}</div>
                                    <div class="text-[10px] text-muted-foreground truncate" :title="sdg.name">{{ sdg.name }}</div>
                                </div>
                            </div>
                            <div class="h-1 bg-muted/40 rounded overflow-hidden">
                                <div class="h-full transition-all duration-500" :style="{ width: `${(sdg.projects / maxSdgProjects) * 100}%`, background: sdg.color }" />
                            </div>
                            <div class="flex items-center justify-between text-[10px]">
                                <span class="text-muted-foreground">{{ sdg.projects }} proj</span>
                                <span class="text-foreground font-semibold tabular-nums">{{ fmtCompact(sdg.credits) }}</span>
                            </div>
                        </div>
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
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <TrendingUp class="h-4 w-4 text-primary" />
                            Avg Project Size by Sector
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">Mean credits issued per project — benchmark for scoping new projects</p>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="s in avgSizeBySector" :key="s.label" class="flex items-center gap-3">
                            <span class="text-xs text-foreground w-28 shrink-0 truncate font-medium" :title="s.label">{{ s.label }}</span>
                            <div class="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                                <div class="h-full bg-stat-blue transition-all duration-500" :style="{ width: `${(s.avg / maxAvgSize) * 100}%` }" />
                            </div>
                            <span class="text-[11px] tabular-nums text-foreground w-16 text-right font-semibold">{{ fmtCompact(s.avg) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Pipeline / lifecycle for developers -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <CheckCircle2 class="h-4 w-4 text-primary" />
                            Status Distribution
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">Where projects sit in the policy workflow today</p>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="s in lifecycleFunnel" :key="s.key" class="flex items-center gap-3">
                            <span class="text-xs text-foreground w-24 shrink-0 font-medium">{{ s.label }}</span>
                            <div class="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                                <div class="h-full bg-stat-amber transition-all duration-500" :style="{ width: `${s.width}%` }" />
                            </div>
                            <span class="text-[11px] tabular-nums text-foreground w-12 text-right">{{ s.count }}</span>
                            <span class="text-[10px] text-muted-foreground tabular-nums w-9 text-right">{{ s.pct }}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top developers leaderboard -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Award class="h-4 w-4 text-primary" />
                        Top Developer Leaderboard
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">Ranked by total credits issued — multi-country and multi-sector reach</p>
                </div>
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-muted/20 border-b">
                            <th class="text-left py-2.5 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Rank</th>
                            <th class="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Developer</th>
                            <th class="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Projects</th>
                            <th class="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Countries</th>
                            <th class="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Sectors</th>
                            <th class="text-right py-2.5 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Credits</th>
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
                            <td colspan="6" class="py-8 px-5 text-center text-sm text-muted-foreground">No developer data available</td>
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
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <TrendingUp class="h-4 w-4 text-primary" />
                        Registry Throughput
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">Average credits issued per project, by registry — proxy for project-quality scale</p>
                </div>
                <div class="px-5 py-5 space-y-2.5">
                    <div v-for="r in registryThroughput" :key="r.label" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-32 shrink-0 truncate font-medium" :title="r.label">{{ r.label }}</span>
                        <div class="flex-1 h-6 bg-muted/40 rounded overflow-hidden">
                            <div class="h-full bg-primary/70 transition-all duration-500" :style="{ width: `${(r.avgPerProject / maxThroughput) * 100}%` }" />
                        </div>
                        <span class="text-[10px] text-muted-foreground tabular-nums w-12 text-right">{{ r.projects }}p</span>
                        <span class="text-xs font-semibold text-foreground tabular-nums w-20 text-right">{{ fmtCompact(r.avgPerProject) }} /proj</span>
                    </div>
                </div>
            </div>

            <!-- Status x Registry heatmap -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <BarChart3 class="h-4 w-4 text-primary" />
                        Pipeline Heatmap by Registry
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">Project count per lifecycle stage, top registries</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left py-2.5 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Registry</th>
                                <th v-for="s in LIFECYCLE_STAGES" :key="s.key" class="py-2.5 px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-center">{{ s.label }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in statusByRegistry" :key="row.registry" class="border-b last:border-b-0">
                                <td class="py-2.5 px-5 font-medium text-foreground text-xs whitespace-nowrap">{{ row.registry }}</td>
                                <td v-for="c in row.cells" :key="c.stage" class="p-1.5 text-center">
                                    <div :class="heatBg(c.count)" class="rounded text-xs font-semibold py-2 tabular-nums">
                                        {{ c.count }}
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="statusByRegistry.length === 0">
                                <td :colspan="LIFECYCLE_STAGES.length + 1" class="py-8 px-5 text-center text-sm text-muted-foreground">No registry data</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Registry market share -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Building2 class="h-4 w-4 text-primary" />
                        Registry Market Share
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">Share of total credits issued</p>
                </div>
                <div class="px-5 py-5 space-y-2.5">
                    <div v-for="(r, i) in registryTop" :key="r.label" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-32 shrink-0 truncate font-medium" :title="r.label">{{ r.label }}</span>
                        <div class="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                            <div class="h-full transition-all duration-500" :style="{ width: `${(r.credits / Math.max(1, registryTop[0]?.credits)) * 100}%`, background: registryColors[i] }" />
                        </div>
                        <span class="text-[11px] tabular-nums text-muted-foreground w-10 text-right">{{ r.projects }}p</span>
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
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Globe2 class="h-4 w-4 text-primary" />
                        SDG Alignment Matrix
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">All 17 Sustainable Development Goals — coverage and credit volume</p>
                </div>
                <div class="px-5 py-5">
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        <div
                            v-for="sdg in sdgCoverage"
                            :key="sdg.id"
                            class="rounded-lg border bg-card p-3"
                            :style="{ borderLeftColor: sdg.color, borderLeftWidth: '3px' }"
                        >
                            <div class="flex items-center gap-2 mb-2">
                                <img :src="`/sdgs/E-WEB-Goal-${String(sdg.id).padStart(2, '0')}.png`" :alt="`SDG ${sdg.id}`" class="h-8 w-8 rounded shrink-0" />
                                <div class="min-w-0 flex-1">
                                    <div class="text-[10px] font-bold text-foreground">SDG {{ sdg.id }}</div>
                                    <div class="text-[10px] text-muted-foreground truncate" :title="sdg.name">{{ sdg.name }}</div>
                                </div>
                            </div>
                            <div class="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                <span>Projects</span>
                                <span class="font-semibold text-foreground tabular-nums">{{ sdg.projects }}</span>
                            </div>
                            <div class="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Credits</span>
                                <span class="font-semibold text-foreground tabular-nums">{{ fmtCompact(sdg.credits) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Sector contribution -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Leaf class="h-4 w-4 text-primary" />
                            Sector Contribution to Total Supply
                        </h2>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="(s, i) in sectorTop" :key="s.label" class="flex items-center gap-3">
                            <span class="text-xs text-foreground w-28 shrink-0 truncate" :title="s.label">{{ s.label }}</span>
                            <div class="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                                <div class="h-full transition-all duration-500" :style="{ width: `${totalIssued ? (s.credits / totalIssued) * 100 : 0}%`, background: sectorColors[i] }" />
                            </div>
                            <span class="text-xs font-semibold text-foreground tabular-nums w-12 text-right">{{ totalIssued ? Math.round((s.credits / totalIssued) * 100) : 0 }}%</span>
                        </div>
                    </div>
                </div>

                <!-- Country contribution -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <MapPin class="h-4 w-4 text-primary" />
                            Country Contribution to Supply
                        </h2>
                    </div>
                    <div class="px-5 py-5 space-y-2.5">
                        <div v-for="c in countryTop" :key="c.label" class="flex items-center gap-3">
                            <span class="text-xs text-foreground w-28 shrink-0 truncate" :title="c.label">{{ c.label }}</span>
                            <div class="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                                <div class="h-full bg-stat-green transition-all duration-500" :style="{ width: `${totalIssued ? (c.credits / totalIssued) * 100 : 0}%` }" />
                            </div>
                            <span class="text-xs font-semibold text-foreground tabular-nums w-12 text-right">{{ totalIssued ? Math.round((c.credits / totalIssued) * 100) : 0 }}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Vintage concentration risk -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <AlertCircle class="h-4 w-4 text-stat-amber" />
                        Vintage Concentration
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">Risk signal: heavy concentration in older vintages may indicate weaker baseline integrity under CCP / ICVCM principles</p>
                </div>
                <div class="px-5 py-5 space-y-3">
                    <div v-for="s in supplyAge" :key="s.label" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-44 shrink-0 font-medium">{{ s.label }}</span>
                        <div class="flex-1 h-7 bg-muted/40 rounded overflow-hidden">
                            <div :class="s.color" class="h-full transition-all duration-500" :style="{ width: `${s.pct}%` }" />
                        </div>
                        <span class="text-xs font-semibold text-foreground tabular-nums w-10 text-right">{{ s.pct }}%</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
