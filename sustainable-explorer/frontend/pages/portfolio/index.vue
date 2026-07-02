<script setup lang="ts">
import {
    Coins,
    FolderKanban,
    Flame,
    Star,
    LayoutGrid,
    TrendingUp,
    Plus,
    X,
    BarChart2,
    PieChart,
    Building2,
    Flag,
    Target,
    Activity,
    RefreshCw,
    Layers,
    CheckCircle2,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { formatCredits, formatSmartCredits } from '~/lib/format';
import {
    allocateDonutColors,
    DONUT_OTHER_COLOR,
    mergeTopBinsWithOther,
} from '~/lib/chart-colors';
import { SectorType, SECTOR_I18N_KEYS } from '~/types/enums';
import { DEFAULT_WIDGETS } from '~/composables/usePortfolioWidgets';

// The customizable dashboard is a logged-in-only feature — guests get
// redirected home (with the sign-in modal opened) rather than a functional
// guest-mode page, so no watchlist/filters/widgets/chart state is ever built
// up in localStorage for a user who was never meant to have this feature.
definePageMeta({ middleware: 'auth' });

const { t } = useI18n();

const {
    buildRetirementSeries,
    totalRetired,
    pending,
} = useDashboard();
const { projects: allProjects } = useProjects();   // full list for watchlist modal candidates

const { watchlistItems, addItem, removeItem, hasItem, count: watchlistCount } = usePortfolioWatchlist();
const { widgets, widgetVisible, toggleWidget, setWidget, widgetGroups } = usePortfolioWidgets();
const { isAuthenticated } = useAuth();
const { hydrateFromApi, pushType } = usePortfolioSync();
const {
    watchlistFilters,
    setFilter: setWatchlistFilter,
    clearFilters: clearWatchlistFilters,
    hasActiveFilters: hasActiveWatchlistFilters,
    filterOptions: watchlistFilterOptions,
    matchesFilters: matchesWatchlistFilters,
    activeFilterChips: watchlistFilterChips,
    activeFilterSummary: watchlistFilterSummary,
} = usePortfolioWatchlistFilters();

// Icon/color per filter category for the small removable chips shown in the
// watchlist bar. Static (not interpolated) class strings so Tailwind's
// content scanner picks them up — same pattern the old per-type watchlist
// breakdown chips used before this feature replaced them with filters.
const watchlistFilterChipIcon: Record<string, typeof Flag> = {
    country: Flag,
    methodology: Layers,
    registry: Building2,
};
const watchlistFilterChipClass: Record<string, string> = {
    country: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    methodology: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    registry: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

// All chart data filtered by the active watchlist (falls back to full dataset when empty)
const {
    isFiltered,
    filteredProjects,
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
    filteredSdgStats,
    recentActivity,
    dataPending,
} = usePortfolioDashboard(watchlistItems);

// Period toggles
type TimePeriod = 'monthly' | 'quarterly' | 'yearly';
const issuancePeriod = ref<TimePeriod>('monthly');
const retirementPeriod = ref<TimePeriod>('monthly');

const issuanceSeriesData = computed(() => buildIssuanceSeries(issuancePeriod.value));
// Sum raw values (stored in millions), convert back to credits, then smart-format.
// Avoids "0M total" when total credits < 100 000.
const issuanceSeriesTotal = computed(() =>
    formatSmartCredits(issuanceSeriesData.value.reduce((s, d) => s + d.value, 0) * 1_000_000),
);

const retirementSeriesData = computed(() => buildRetirementSeries(retirementPeriod.value));
const retirementSeriesTotal = computed(() =>
    formatSmartCredits(retirementSeriesData.value.reduce((s, d) => s + d.value, 0) * 1_000_000),
);

// Chart mode for sector/registry donuts
const chartMode = ref<'projects' | 'credits'>('projects');

const UNDEFINED_SECTOR_COLOR = '#a1a1aa';

function translateSector(raw: string): string {
    const key = SECTOR_I18N_KEYS[raw];
    return key ? t(`dashboard.sectorTypes.${key}`) : raw;
}

function buildDonutRows(
    bins: { label: string; projectCount: number; creditCount: number }[],
    mode: 'projects' | 'credits',
    seedPrefix: string,
) {
    if (bins.length === 0) return [];
    const merged = mergeTopBinsWithOther(bins, mode, t('dashboard.otherCategory'));
    const hasOtherAggregate = bins.length > 15;
    const mainSliceCount = hasOtherAggregate ? 15 : merged.length;
    const val = (b: (typeof merged)[number]) =>
        mode === 'projects' ? b.projectCount : b.creditCount;
    const seed = `${seedPrefix}|${mode}|${merged.map(b => `${b.label}:${val(b)}`).join('|')}`;
    const colors = allocateDonutColors(mainSliceCount, seed);
    if (hasOtherAggregate) colors.push(DONUT_OTHER_COLOR);
    return merged.map((b, i) => ({ ...b, color: colors[i]! }));
}

const sectorDonutRows = computed(() => {
    const bins = sectorBreakdown.value.map(({ label, projectCount, creditCount }) => ({
        label, projectCount, creditCount,
    }));
    const undefinedBin = bins.find(b => b.label === SectorType.Undefined);
    const namedBins = bins.filter(b => b.label !== SectorType.Undefined);
    const rows = buildDonutRows(namedBins, chartMode.value, 'sector');
    if (undefinedBin) rows.push({ ...undefinedBin, color: UNDEFINED_SECTOR_COLOR });
    return rows;
});

const registryDonutRows = computed(() =>
    buildDonutRows(
        registryBreakdown.value.map(({ label, projectCount, creditCount }) => ({ label, projectCount, creditCount })),
        chartMode.value,
        'registry',
    ),
);

const sectorChartSegments = computed(() =>
    sectorDonutRows.value.map(s => ({
        label: translateSector(s.label),
        value: chartMode.value === 'projects' ? s.projectCount : s.creditCount,
        color: s.color,
    })),
);

const registryChartSegments = computed(() =>
    registryDonutRows.value.map(s => ({
        label: s.label,
        value: chartMode.value === 'projects' ? s.projectCount : s.creditCount,
        color: s.color,
    })),
);

const sectorTotal = computed(() => sectorChartSegments.value.reduce((sum, s) => sum + s.value, 0));
const registryTotal = computed(() => registryChartSegments.value.reduce((sum, s) => sum + s.value, 0));


// Top SDGs — by project count or credit supply depending on chartMode
const topSdgs = computed(() => {
    const useCredits = chartMode.value === 'credits';
    const sorted = [...filteredSdgStats.value]
        .sort((a, b) => (useCredits ? b.credits - a.credits : b.projects - a.projects))
        .slice(0, 8);
    const max = (useCredits ? sorted[0]?.credits : sorted[0]?.projects) ?? 1;
    return sorted.map(s => {
        const val = useCredits ? s.credits : s.projects;
        return {
            name: s.name,
            count: val,
            width: max > 0 ? Math.round((val / max) * 100) : 0,
            color: s.color,
        };
    });
});

// SDG coverage bar viz (all SDGs) — filtered by watchlist, mode-aware
const sdgCoverage = computed(() => {
    const useCredits = chartMode.value === 'credits';
    const sorted = [...filteredSdgStats.value].sort((a, b) => a.id - b.id);
    const max = Math.max(...sorted.map(s => useCredits ? s.credits : s.projects), 1);
    return sorted.map(s => {
        const val = useCredits ? s.credits : s.projects;
        return {
            id: s.id,
            name: `SDG ${s.id}`,
            shortName: s.name.length > 20 ? `${s.name.slice(0, 18)}…` : s.name,
            projects: val,
            width: max > 0 ? Math.round((val / max) * 100) : 0,
            color: s.color || 'var(--color-primary)',
        };
    });
});


// Activity icons (mirror index.vue)
const activityIcons: Record<string, any> = {
    project: FolderKanban,
    credit: Coins,
    policy: CheckCircle2,
    verification: CheckCircle2,
    registry: Building2,
    retirement: Flame,
};

const activityColors: Record<string, string> = {
    project: 'text-stat-green',
    credit: 'text-stat-amber',
    policy: 'text-stat-blue',
    verification: 'text-primary',
    registry: 'text-stat-rose',
    retirement: 'text-stat-amber',
};

// KPI values
const kpiTotalIssued = computed(() => formatCredits(totalCreditsIssued.value));
const kpiActiveSupply = computed(() => formatCredits(Math.max(0, totalCreditsIssued.value - totalRetired.value)));
const kpiTotalRetired = computed(() => formatCredits(totalRetired.value));
const kpiActiveProjects = computed(() => activeProjectsCount.value.toLocaleString());

// Sync status
const { network } = useNetwork();
const { data: syncStatus } = useSyncSummaryApi({ network });
const lastSyncFormatted = computed(() => {
    const raw = syncStatus.value?.lastSyncedAt;
    if (!raw) return '—';
    return new Date(raw).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
});

// Modal state
const showWatchlistModal = ref(false);
const showWidgetLibraryModal = ref(false);
const showChartBuilderModal = ref(false);

// Watchlist modal — projects only. Uncapped; narrowed by search + the
// persisted country/methodology/registry filters (usePortfolioWatchlistFilters).
const watchlistSearch = ref('');

const watchlistCandidates = computed(() => {
    const q = watchlistSearch.value.toLowerCase();
    return allProjects.value
        .filter(p =>
            (!q || p.name?.toLowerCase().includes(q) || p.registry?.toLowerCase().includes(q)) &&
            matchesWatchlistFilters(p),
        )
        .map(p => ({
            id: p.id,
            type: 'project' as const,
            name: p.name,
            meta: p.registry ?? '',
        }));
});

function openWatchlist() {
    showWatchlistModal.value = true;
    watchlistSearch.value = '';
}

function clearWatchlist() {
    watchlistItems.value = [];
}

// Used by the "filtered" banner's single Clear action — watchlist and
// filters are two different ways of scoping the dashboard (see
// usePortfolioDashboard's precedence), so "go back to seeing everything"
// has to reset both, not just whichever one currently has priority.
// Clearing the watchlist first means it's already empty by the time
// watchlistFilters changes, so the clear-on-filter-change watcher's
// "watchlist non-empty" guard is false and no spurious Undo toast fires.
function clearWatchlistAndFilters() {
    watchlistItems.value = [];
    clearWatchlistFilters();
}

// Chart builder
type ChartType = 'line' | 'bar' | 'donut';

interface CustomChartConfig {
    title: string;
    type: ChartType;
    xAxis: string;
    yAxis: string;
}

const chartTitle = ref('');
const chartType = ref<ChartType>('line');
const xAxis = ref('month');
const yAxis = ref('credits');

const xAxisOptions = computed(() => [
    { value: 'month', label: t('portfolio.modal.chartBuilder.axes.month') },
    { value: 'vintage', label: t('portfolio.modal.chartBuilder.axes.vintage') },
    { value: 'sector', label: t('portfolio.modal.chartBuilder.axes.sector') },
    { value: 'country', label: t('portfolio.modal.chartBuilder.axes.country') },
    { value: 'registry', label: t('portfolio.modal.chartBuilder.axes.registry') },
    { value: 'sdg', label: t('portfolio.modal.chartBuilder.axes.sdg') },
]);
const yAxisOptions = computed(() => [
    { value: 'credits', label: t('portfolio.modal.chartBuilder.axes.credits') },
    { value: 'projects', label: t('portfolio.modal.chartBuilder.axes.projects') },
    { value: 'retirements', label: t('portfolio.modal.chartBuilder.axes.retirements') },
]);

// Custom charts are hydrated from / synced to the server via usePortfolioSync
// (Portfolio is a logged-in-only feature — no localStorage layer needed).
const customCharts = ref<CustomChartConfig[]>([]);

// Maps an xAxis+yAxis combination to { label, value }[] used by line & bar charts
function getChartRawData(cfg: CustomChartConfig): { label: string; value: number }[] {
    const { xAxis, yAxis } = cfg;
    if (xAxis === 'month') {
        return yAxis === 'retirements'
            ? retirementSeriesData.value
            : issuanceSeriesData.value;
    }
    if (xAxis === 'vintage') {
        return vintageDistribution.value.map(v => ({
            label: String(v.year),
            value: yAxis === 'projects' ? v.projects : v.credits,
        }));
    }
    if (xAxis === 'sector') {
        return sectorBreakdown.value.map(s => ({
            label: translateSector(s.label),
            value: yAxis === 'projects' ? s.projectCount : s.creditCount,
        }));
    }
    if (xAxis === 'country') {
        return countryRaw.value.map(c => ({
            label: c.name,
            value: yAxis === 'projects' ? c.projects : c.credits,
        }));
    }
    if (xAxis === 'registry') {
        return registries.value.map(r => ({
            label: r.name,
            value: yAxis === 'projects' ? r.projects : r.policies,
        }));
    }
    if (xAxis === 'sdg') {
        return filteredSdgStats.value.map(s => ({
            label: `SDG ${s.id}`,
            value: yAxis === 'credits' ? s.credits : s.projects,
        }));
    }
    return [];
}

// Donut segments with colours
function getChartSegments(cfg: CustomChartConfig) {
    const rows = getChartRawData(cfg);
    if (rows.length === 0) return [];
    const colors = allocateDonutColors(Math.min(rows.length, 15), `custom|${cfg.xAxis}|${cfg.yAxis}`);
    return rows.map((r, i) => ({ label: r.label, value: r.value, color: colors[i] ?? DONUT_OTHER_COLOR }));
}

// Bar rows with percentage widths
function getChartBarRows(cfg: CustomChartConfig) {
    const rows = getChartRawData(cfg);
    const max = Math.max(...rows.map(r => r.value), 1);
    return rows.slice(0, 10).map(r => ({
        label: r.label,
        value: r.value,
        display: formatCredits(r.value),
        width: Math.round((r.value / max) * 100),
    }));
}

function addCustomChart() {
    if (!chartTitle.value.trim() || customCharts.value.length >= 5) return;
    customCharts.value = [...customCharts.value, {
        title: chartTitle.value.trim(),
        type: chartType.value,
        xAxis: xAxis.value,
        yAxis: yAxis.value,
    }];
    chartTitle.value = '';
    chartType.value = 'line';
    xAxis.value = 'month';
    yAxis.value = 'credits';
    showChartBuilderModal.value = false;
}

function removeCustomChart(i: number) {
    customCharts.value = customCharts.value.filter((_, idx) => idx !== i);
}

// ── Watchlist chip overflow ──────────────────────────────────────────────────
// Keeps the chip row to a single line. After mount (and on container resize),
// we measure how many chips fit in the row and hide the rest behind "+N more".
const chipsRowRef = ref<HTMLElement | null>(null);
const visibleChipCount = ref(Infinity); // Infinity = all visible (before first measurement)

const hiddenChipCount = computed(() =>
    isFinite(visibleChipCount.value)
        ? Math.max(0, watchlistItems.value.length - visibleChipCount.value)
        : 0,
);

async function recalcChips(): Promise<void> {
    // Phase 1: make all chips visible so offsetWidth is measurable.
    visibleChipCount.value = Infinity;
    await nextTick();

    const el = chipsRowRef.value;
    if (!el || el.children.length === 0) return;

    const gap = 8; // gap-2
    const containerW = el.clientWidth;
    const chips = Array.from(el.children) as HTMLElement[];

    // Pass 1 — count how many fit without any badge.
    let used = 0, count = 0;
    for (const chip of chips) {
        const addGap = count > 0 ? gap : 0;
        if (used + addGap + chip.offsetWidth > containerW) break;
        used += addGap + chip.offsetWidth;
        count++;
    }

    if (count >= chips.length) {
        // All chips fit — no badge needed.
        visibleChipCount.value = chips.length;
        return;
    }

    // Pass 2 — some chips overflow; reserve ~68 px for the "+N more" badge.
    const badgeReserve = 68 + gap;
    let used2 = 0, count2 = 0;
    for (const chip of chips) {
        const addGap = count2 > 0 ? gap : 0;
        if (used2 + addGap + chip.offsetWidth > containerW - badgeReserve) break;
        used2 += addGap + chip.offsetWidth;
        count2++;
    }
    visibleChipCount.value = Math.max(1, count2);
}

let _chipsRO: ResizeObserver | null = null;

// Re-create the ResizeObserver whenever the chips row mounts or unmounts
// (the v-if on the row means the element comes and goes with the watchlist).
watch(chipsRowRef, (el) => {
    _chipsRO?.disconnect();
    _chipsRO = null;
    if (el) {
        _chipsRO = new ResizeObserver(() => { void recalcChips(); });
        _chipsRO.observe(el);
    }
});

// ── True only after the client has mounted and the server hydration below has
// had a chance to run. Guards ALL chart sections so the first visible render
// never flashes the unfiltered "all network" dataset before the user's saved
// watchlist/filters arrive — clientReady gates the transition from skeleton
// → real content on both SPA nav and hard reload.
const clientReady = ref(false);

// Combined guard: charts only show when the client is ready AND data is loaded.
const displayReady = computed(() => clientReady.value && !dataPending.value);

// Suppresses watchers during hydration — prevents applyRemote from triggering
// spurious PUT calls when it overwrites refs with server data on page load.
const hydrating = ref(false);

// Applies server-fetched preferences to local reactive state.
async function applyRemote(
    remote: Awaited<ReturnType<typeof hydrateFromApi>>,
): Promise<void> {
    if (!remote) return;
    hydrating.value = true;
    const remoteWatchlist = remote.watchlist ?? [];
    if (remoteWatchlist.length > 0) {
        // Server has saved items — server is the source of truth.
        watchlistItems.value = remoteWatchlist;
    } else if (watchlistItems.value.length > 0) {
        // Server returned empty but the current session already added items
        // this hasn't hit the server yet (e.g. mid-debounce, or a network
        // switch racing the initial save) — push them up rather than
        // dropping them silently.
        pushType('watchlist', watchlistItems.value, 0);
    }
    const remoteFilters = remote.watchlistFilters ?? {};
    if (Object.keys(remoteFilters).length > 0) {
        watchlistFilters.value = remoteFilters;
    } else if (hasActiveWatchlistFilters.value) {
        pushType('watchlist_filters', watchlistFilters.value, 0);
    }
    widgets.value = { ...DEFAULT_WIDGETS, ...(remote.widgets ?? {}) };
    customCharts.value = (remote.customCharts ?? []).slice(0, 5);
    await nextTick();
    hydrating.value = false;
}

// Push changes to API — one independent 800ms debounce per type.
// hydrating guard prevents spurious PUTs during initial hydration from the server.
watch(watchlistItems,   () => { if (!hydrating.value) pushType('watchlist',         watchlistItems.value); }, { deep: true });
watch(widgets,          () => { if (!hydrating.value) pushType('widgets',           widgets.value);        }, { deep: true });
watch(customCharts,     () => { if (!hydrating.value) pushType('custom_charts',     customCharts.value);   }, { deep: true });

// Explicit project picks and filters are two different ways of scoping the
// dashboard (see usePortfolioDashboard's precedence). Letting both linger at
// once is confusing — the watchlist would silently keep winning while the
// user thinks their filter change did something. So changing a filter while
// projects are watchlisted clears the watchlist, handing scope to the filter.
// This mirrors the app's existing convention for reversible destructive
// actions (e.g. API key revoke) — act immediately, no blocking confirm
// dialog, but surface an "Undo" toast rather than losing the selection
// silently. Guarded so Undo (which restores both refs) doesn't re-trigger itself.
const suppressFilterClearWatchlist = ref(false);
watch(watchlistFilters, (_newFilters, oldFilters) => {
    if (!hydrating.value && !suppressFilterClearWatchlist.value && watchlistItems.value.length > 0) {
        const previousWatchlist = watchlistItems.value;
        const previousFilters = oldFilters ? { ...oldFilters } : {};
        watchlistItems.value = [];
        toast(
            previousWatchlist.length === 1
                ? t('portfolio.watchlistClearedByFilterSingular')
                : t('portfolio.watchlistClearedByFilter', { count: previousWatchlist.length }),
            {
                action: {
                    label: t('common.undo'),
                    onClick: async () => {
                        suppressFilterClearWatchlist.value = true;
                        watchlistItems.value = previousWatchlist;
                        watchlistFilters.value = previousFilters;
                        await nextTick();
                        suppressFilterClearWatchlist.value = false;
                    },
                },
            },
        );
    }
    if (!hydrating.value) pushType('watchlist_filters', watchlistFilters.value);
}, { deep: true });

// Re-hydrate when the user logs in while on this page, or switches network.
watch([isAuthenticated, network], async ([authed]) => {
    if (authed) await applyRemote(await hydrateFromApi());
});

// Keyboard close
function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        showWatchlistModal.value = false;
        showWidgetLibraryModal.value = false;
        showChartBuilderModal.value = false;
    }
}

// Re-measure chips whenever the watchlist changes (items added/removed).
watch(watchlistItems, () => { void recalcChips(); }, { deep: true });

onMounted(async () => {
    window.addEventListener('keydown', onKeydown);
    // Without a localStorage pre-population step, state starts empty on
    // mount — wait for the server hydration to resolve before flipping
    // clientReady, so the skeleton stays up rather than flashing the
    // unfiltered "all network" dataset before the user's saved
    // watchlist/filters arrive.
    if (isAuthenticated.value) await applyRemote(await hydrateFromApi());
    clientReady.value = true;
    void recalcChips();
});
onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
    _chipsRO?.disconnect();
});
</script>

<template>
    <div class="space-y-0">

        <!-- PAGE HEADER -->
        <div class="px-6 pt-6 pb-4">
            <div class="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 class="text-2xl font-bold text-foreground">{{ $t('portfolio.title') }}</h1>
                    <p class="text-sm text-muted-foreground mt-1">
                        {{ $t('portfolio.subtitle', { count: watchlistCount }) }}
                    </p>
                </div>
                <div class="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                        class="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
                        @click="showChartBuilderModal = true"
                    >
                        <TrendingUp class="h-3.5 w-3.5" />
                        {{ $t('portfolio.addCustomChart') }}
                    </button>
                    <button
                        class="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
                        @click="showWidgetLibraryModal = true"
                    >
                        <LayoutGrid class="h-3.5 w-3.5" />
                        {{ $t('portfolio.widgetLibrary') }}
                    </button>
                    <button
                        class="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        @click="openWatchlist()"
                    >
                        <Star class="h-3.5 w-3.5" />
                        {{ $t('portfolio.manageWatchlist') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- WATCHLIST BAR -->
        <div class="px-6 pb-4">
            <div class="rounded-xl border bg-card p-4">
                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        <Star class="h-3.5 w-3.5 text-stat-amber fill-stat-amber shrink-0" />
                        <span class="text-sm font-medium text-foreground">{{ $t('portfolio.watchlist') }}</span>
                        <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {{ watchlistCount }}
                        </span>
                        <span v-if="watchlistFilterChips.length > 0" class="text-muted-foreground/40 text-[11px]">·</span>
                        <button
                            v-for="chip in watchlistFilterChips"
                            :key="chip.key"
                            type="button"
                            :title="`${chip.full} — click to clear`"
                            class="group inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors"
                            :class="watchlistFilterChipClass[chip.key]"
                            @click="setWatchlistFilter(chip.key, '')"
                        >
                            <component :is="watchlistFilterChipIcon[chip.key]" class="h-2.5 w-2.5 shrink-0" />
                            <span class="truncate max-w-[120px]">{{ chip.chipText }}</span>
                            <X class="h-2.5 w-2.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                    <button
                        class="text-xs font-medium text-primary hover:underline"
                        @click="openWatchlist()"
                    >
                        + {{ $t('portfolio.addItems') }}
                    </button>
                </div>
                <div v-if="watchlistItems.length > 0" class="flex items-center gap-2 min-w-0">
                    <div ref="chipsRowRef" class="flex flex-nowrap gap-2 overflow-hidden flex-1 min-w-0">
                        <WatchlistChip
                            v-for="(item, idx) in watchlistItems"
                            :key="item.id"
                            v-show="idx < visibleChipCount"
                            :label="item.name"
                            @remove="removeItem(item.id, item.type)"
                        />
                    </div>
                    <button
                        v-if="hiddenChipCount > 0"
                        class="shrink-0 whitespace-nowrap rounded-full border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        @click="openWatchlist()"
                    >
                        +{{ hiddenChipCount }} more
                    </button>
                </div>
                <div v-else class="text-center py-2 text-xs text-muted-foreground">
                    {{ $t('portfolio.watchlistEmpty') }}
                    <button class="text-primary font-medium hover:underline ml-1" @click="openWatchlist()">
                        {{ $t('portfolio.addItemsCta') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- FILTER ACTIVE BANNER -->
        <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
        >
            <div v-if="isFiltered" class="mx-6 mb-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-2.5 flex items-center gap-2.5">
                <Star class="h-3.5 w-3.5 text-primary shrink-0 fill-primary/30" />
                <span v-if="watchlistCount > 0" class="text-xs text-foreground">
                    Showing data for <span class="font-semibold text-primary">{{ watchlistCount }} watchlisted {{ watchlistCount === 1 ? 'item' : 'items' }}</span> — all charts and KPIs are filtered.
                </span>
                <span v-else class="text-xs text-foreground">
                    Showing data for projects matching <span class="font-semibold text-primary">{{ watchlistFilterSummary }}</span> — all charts and KPIs are filtered.
                </span>
                <button
                    class="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    @click="clearWatchlistAndFilters()"
                >
                    Clear filter
                </button>
            </div>
        </Transition>

        <!-- KPI CARDS -->
        <div class="px-6 pb-5">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <template v-if="!displayReady">
                    <Skeleton v-for="n in 4" :key="n" class="h-28 rounded-xl" />
                </template>
                <template v-else>
                    <PortfolioKpiCard
                        v-if="widgetVisible('totalIssued')"
                        :label="$t('portfolio.kpi.totalIssued.label')"
                        :value="kpiTotalIssued"
                        :sub="$t('portfolio.kpi.totalIssued.sub')"
                        :footer="$t('portfolio.kpi.totalIssued.footer')"
                        footer-accent="text-primary"
                        :icon="Coins"
                        accent-bg="bg-primary/10"
                        widget-key="totalIssued"
                        @remove="setWidget('totalIssued', false)"
                    />
                    <PortfolioKpiCard
                        v-if="widgetVisible('activeSupply')"
                        :label="$t('portfolio.kpi.activeSupply.label')"
                        :value="kpiActiveSupply"
                        :sub="$t('portfolio.kpi.activeSupply.sub')"
                        :footer="$t('portfolio.kpi.activeSupply.footer')"
                        :icon="Layers"
                        widget-key="activeSupply"
                        @remove="setWidget('activeSupply', false)"
                    />
                    <PortfolioKpiCard
                        v-if="widgetVisible('totalRetired')"
                        :label="$t('portfolio.kpi.totalRetired.label')"
                        :value="kpiTotalRetired"
                        :sub="$t('portfolio.kpi.totalRetired.sub')"
                        :footer="$t('portfolio.kpi.totalRetired.footer')"
                        :icon="Flame"
                        widget-key="totalRetired"
                        @remove="setWidget('totalRetired', false)"
                    />
                    <PortfolioKpiCard
                        v-if="widgetVisible('activeProjects')"
                        :label="$t('portfolio.kpi.activeProjects.label')"
                        :value="kpiActiveProjects"
                        :sub="$t('portfolio.kpi.activeProjects.sub')"
                        :footer="$t('portfolio.kpi.activeProjects.footer', { n: watchlistCount })"
                        footer-accent="text-primary"
                        :icon="FolderKanban"
                        accent-bg="bg-stat-amber/10"
                        widget-key="activeProjects"
                        @remove="setWidget('activeProjects', false)"
                    />
                </template>
            </div>
        </div>

        <!-- ROW 1: Issuance Trend + Vintage Distribution -->
        <div v-if="widgetVisible('issuanceTrend') || widgetVisible('vintageDist')" class="border-t">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x">

                <!-- Issuance Trend (spans 2/3) -->
                <div v-if="widgetVisible('issuanceTrend')" class="lg:col-span-2">
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-foreground inline-flex items-center gap-1.5">
                                {{ $t('dashboard.issuanceTrend') }}
                                <InfoTooltip :text="$t('dashboard.issuanceTrendTooltip')" />
                            </h2>
                            <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.volumeMillions') }}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="flex items-center rounded-lg border p-0.5">
                                <button
                                    v-for="p in (['monthly', 'quarterly', 'yearly'] as const)"
                                    :key="p"
                                    class="rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors"
                                    :class="issuancePeriod === p ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                                    @click="issuancePeriod = p"
                                >
                                    {{ p === 'monthly' ? $t('dashboard.monthly') : p === 'quarterly' ? $t('dashboard.quarterly') : $t('dashboard.yearly') }}
                                </button>
                            </div>
                            <NuxtLink to="/analytics" class="text-xs font-medium text-primary hover:underline">{{ $t('dashboard.analytics') }}</NuxtLink>
                            <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" :title="$t('portfolio.removeWidget')" @click="setWidget('issuanceTrend', false)">
                                <X class="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                    <div class="px-6 pb-6">
                        <Skeleton v-if="!displayReady" class="h-52 rounded-xl" />
                        <div v-else class="rounded-xl border bg-card p-5">
                            <TrendLineChart
                                :data="issuanceSeriesData"
                                color="hsl(142, 76%, 36%)"
                                fill-color="hsl(142, 76%, 36%, 0.08)"
                                :empty-text="$t('dashboard.noIssuanceData')"
                            />
                            <div class="flex items-center justify-between mt-4 pt-3 border-t">
                                <span class="text-xs text-muted-foreground">
                                    {{ issuanceSeriesData.length }}
                                    {{ issuancePeriod === 'monthly' ? $t('dashboard.months') : issuancePeriod === 'quarterly' ? $t('dashboard.quarters') : $t('dashboard.years') }}
                                </span>
                                <span class="text-sm font-semibold text-foreground">{{ issuanceSeriesTotal }} total</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Vintage Distribution -->
                <div v-if="widgetVisible('vintageDist')" class="flex flex-col">
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.sections.vintageDist') }}</h2>
                            <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.vintageDistributionSub') }}</p>
                        </div>
                        <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" :title="$t('portfolio.removeWidget')" @click="setWidget('vintageDist', false)">
                            <X class="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div class="px-6 pb-6 flex-1 flex flex-col">
                        <Skeleton v-if="!displayReady" class="flex-1 rounded-xl" />
                        <div v-else class="rounded-xl border bg-card p-5 flex-1 flex flex-col overflow-hidden">
                            <div v-if="vintageDistribution.length > 0" class="flex items-end gap-2 flex-1 min-h-[12rem]">
                                <div
                                    v-for="v in vintageDistribution"
                                    :key="v.year"
                                    class="flex-1 min-w-0 flex flex-col items-center gap-1"
                                >
                                    <span class="text-[10px] font-medium text-muted-foreground tabular-nums">{{ formatSmartCredits(v.credits) }}</span>
                                    <div
                                        class="w-full rounded-t-md bg-chart-2/80 hover:bg-chart-2 transition-colors"
                                        :style="{ height: `${vintageMax > 0 ? (v.credits / vintageMax) * 130 : 0}px` }"
                                    />
                                    <span class="text-[10px] text-muted-foreground">{{ v.year }}</span>
                                </div>
                            </div>
                            <div v-else class="flex-1 flex items-center justify-center min-h-[12rem] text-sm text-muted-foreground">
                                {{ $t('dashboard.noVintageData') }}
                            </div>
                            <div class="flex items-center justify-between mt-4 pt-3 border-t">
                                <span class="text-xs text-muted-foreground">{{ vintageDistribution.length }} {{ $t('dashboard.vintages') }}</span>
                                <span class="text-sm font-semibold text-foreground">{{ vintageDistribution.reduce((s, v) => s + v.projects, 0) }} {{ $t('dashboard.projectsSuffix') }}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- ROW 2: Sector + Registry + SDG Coverage -->
        <div v-if="widgetVisible('projectsSector') || widgetVisible('projectsByRegistry') || widgetVisible('sdgRadar')" class="border-t">
            <div class="flex items-center justify-between px-6 py-4">
                <div>
                    <h2 class="text-base font-semibold text-foreground">{{ chartMode === 'credits' ? $t('portfolio.sections.issuanceBreakdowns') : $t('portfolio.sections.breakdowns') }}</h2>
                </div>
                <div class="flex items-center rounded-lg border p-0.5">
                    <button
                        class="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors"
                        :class="chartMode === 'projects' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                        @click="chartMode = 'projects'"
                    >
                        {{ $t('dashboard.projectsToggle') }}
                    </button>
                    <button
                        class="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors"
                        :class="chartMode === 'credits' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                        @click="chartMode = 'credits'"
                    >
                        {{ $t('dashboard.issuancesToggle') }}
                    </button>
                </div>
            </div>
            <div class="px-6 pb-6">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    <!-- Projects by Sector -->
                    <div v-if="widgetVisible('projectsSector')" class="rounded-xl border bg-card p-5">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-semibold text-foreground">{{ $t('portfolio.sections.bySector') }}</h3>
                            <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" @click="setWidget('projectsSector', false)"><X class="h-3.5 w-3.5" /></button>
                        </div>
                        <Skeleton v-if="!displayReady" class="h-32 rounded-xl" />
                        <div v-else class="flex items-start gap-4">
                            <DonutChart :segments="sectorChartSegments" :size="120" />
                            <div class="space-y-1.5 flex-1 min-w-0 pt-1">
                                <div v-for="s in sectorDonutRows" :key="s.label" class="flex items-center gap-2 min-w-0">
                                    <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />
                                    <span class="text-[11px] text-muted-foreground truncate flex-1">{{ translateSector(s.label) }}</span>
                                    <span class="text-[11px] font-medium text-foreground tabular-nums shrink-0">
                                        {{ sectorTotal > 0 ? ((chartMode === 'projects' ? s.projectCount : s.creditCount) / sectorTotal * 100).toFixed(1) : '0.0' }}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Projects by Registry -->
                    <div v-if="widgetVisible('projectsByRegistry')" class="rounded-xl border bg-card p-5">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-semibold text-foreground">{{ $t('portfolio.sections.byRegistry') }}</h3>
                            <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" @click="setWidget('projectsByRegistry', false)"><X class="h-3.5 w-3.5" /></button>
                        </div>
                        <Skeleton v-if="!displayReady" class="h-32 rounded-xl" />
                        <div v-else class="flex items-start gap-4">
                            <DonutChart :segments="registryChartSegments" :size="120" />
                            <div class="space-y-1.5 flex-1 min-w-0 pt-1">
                                <div v-for="s in registryDonutRows" :key="s.label" class="flex items-center gap-2 min-w-0">
                                    <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />
                                    <span class="text-[11px] text-muted-foreground truncate flex-1">{{ s.label }}</span>
                                    <span class="text-[11px] font-medium text-foreground tabular-nums shrink-0">
                                        {{ registryTotal > 0 ? ((chartMode === 'projects' ? s.projectCount : s.creditCount) / registryTotal * 100).toFixed(1) : '0.0' }}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SDG Coverage (horizontal bars — no radar/Chart.js) -->
                    <div v-if="widgetVisible('sdgRadar')" class="rounded-xl border bg-card p-5">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-semibold text-foreground">{{ $t('portfolio.sections.sdgCoverage') }}</h3>
                            <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" @click="setWidget('sdgRadar', false)"><X class="h-3.5 w-3.5" /></button>
                        </div>
                        <Skeleton v-if="!displayReady" class="h-64 rounded-xl" />
                        <div v-else class="space-y-2 max-h-64 overflow-y-auto pr-1">
                            <div v-for="sdg in sdgCoverage" :key="sdg.id" class="flex items-center gap-2">
                                <span class="text-[10px] font-semibold text-muted-foreground w-8 shrink-0 tabular-nums">{{ sdg.name }}</span>
                                <div class="flex-1 h-3 bg-muted/40 rounded-full overflow-hidden">
                                    <div
                                        class="h-full rounded-full transition-all duration-500"
                                        :style="{ width: `${sdg.width}%`, backgroundColor: sdg.color }"
                                    />
                                </div>
                                <span class="text-[10px] text-muted-foreground tabular-nums w-6 text-right shrink-0">{{ sdg.projects }}</span>
                            </div>
                            <div v-if="sdgCoverage.length === 0" class="py-4 text-center text-xs text-muted-foreground">
                                {{ $t('portfolio.noData') }}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        <!-- ROW 3: Top Countries + Top Registries -->
        <div v-if="widgetVisible('topCountries') || widgetVisible('topRegistries')" class="border-t">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x">

                <!-- Top Countries -->
                <div v-if="widgetVisible('topCountries')">
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.sections.topCountries') }}</h2>
                            <p class="text-xs text-muted-foreground mt-0.5">{{ $t('portfolio.sections.topCountriesSub') }}</p>
                        </div>
                        <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" @click="setWidget('topCountries', false)"><X class="h-3.5 w-3.5" /></button>
                    </div>
                    <div class="px-6 pb-6">
                        <Skeleton v-if="!displayReady" class="h-48 rounded-xl" />
                        <div v-else class="rounded-xl border bg-card p-5 space-y-3">
                            <div v-for="c in topCountries" :key="c.name" class="flex items-center gap-3">
                                <span class="text-xs text-foreground min-w-[90px] truncate">{{ c.name }}</span>
                                <div class="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                                    <div
                                        class="h-full rounded-full bg-primary/70 transition-all duration-500"
                                        :style="{ width: `${c.width}%` }"
                                    />
                                </div>
                                <span class="text-xs text-muted-foreground tabular-nums min-w-[40px] text-right shrink-0">{{ c.val }}</span>
                            </div>
                            <div v-if="topCountries.length === 0" class="py-4 text-center text-xs text-muted-foreground">
                                {{ $t('portfolio.noData') }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Top Registries -->
                <div v-if="widgetVisible('topRegistries')">
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.sections.topRegistries') }}</h2>
                            <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.topRegistriesSub') }}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <NuxtLink to="/registries" class="text-xs font-medium text-primary hover:underline">{{ $t('common.viewAll') }}</NuxtLink>
                            <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" @click="setWidget('topRegistries', false)"><X class="h-3.5 w-3.5" /></button>
                        </div>
                    </div>
                    <div class="px-6 pb-6">
                        <Skeleton v-if="!displayReady" class="h-48 rounded-xl" />
                        <div v-else class="rounded-xl border bg-card overflow-hidden">
                            <table class="w-full text-sm table-fixed">
                                <colgroup>
                                    <!-- NAME: flexible, takes all remaining width -->
                                    <col class="min-w-0" />
                                    <!-- Numeric cols: fixed, compact -->
                                    <col class="w-16 sm:w-20" />
                                    <col class="w-20 sm:w-24" />
                                    <col class="w-20 sm:w-24" />
                                </colgroup>
                                <thead>
                                    <tr class="border-b bg-muted/30">
                                        <th class="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{{ $t('dashboard.name') }}</th>
                                        <th class="text-right py-2.5 px-2 sm:px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">{{ $t('dashboard.policies') }}</th>
                                        <th class="text-right py-2.5 px-2 sm:px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">{{ $t('dashboard.projectsCol') }}</th>
                                        <th class="text-right py-2.5 px-2 sm:px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">{{ $t('dashboard.issuancesCol') }}</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y">
                                    <NuxtLink
                                        v-for="org in registries"
                                        :key="org.name"
                                        :to="{ path: '/registries', query: { displayName: org.name } }"
                                        custom
                                        v-slot="{ navigate }"
                                    >
                                        <tr class="hover:bg-muted/30 transition-colors cursor-pointer" @click="navigate()">
                                            <td class="py-2.5 px-3 min-w-0">
                                                <span class="font-medium text-foreground break-words hyphens-auto">{{ org.name }}</span>
                                            </td>
                                            <td class="py-2.5 px-2 sm:px-3 text-right tabular-nums text-muted-foreground text-xs">{{ org.policies }}</td>
                                            <td class="py-2.5 px-2 sm:px-3 text-right tabular-nums text-primary font-medium text-xs">{{ org.projects }}</td>
                                            <td class="py-2.5 px-2 sm:px-3 text-right tabular-nums text-muted-foreground text-xs">{{ org.credits }}</td>
                                        </tr>
                                    </NuxtLink>
                                    <tr v-if="registries.length === 0">
                                        <td colspan="4" class="py-8 text-center text-sm text-muted-foreground">{{ $t('dashboard.noRegistries') }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- ROW 4: Recent Issuances + Top SDGs -->
        <div v-if="widgetVisible('recentIssuances') || widgetVisible('sdgTopList')" class="border-t">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x">

                <!-- Recent Issuances -->
                <div v-if="widgetVisible('recentIssuances')">
                    <div class="flex items-center justify-between px-6 py-4">
                        <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.sections.recentIssuances') }}</h2>
                        <div class="flex items-center gap-2">
                            <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{{ $t('portfolio.lastFive') }}</span>
                            <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" @click="setWidget('recentIssuances', false)"><X class="h-3.5 w-3.5" /></button>
                        </div>
                    </div>
                    <div class="px-6 pb-6">
                        <Skeleton v-if="!displayReady" class="h-48 rounded-xl" />
                        <div v-else class="rounded-xl border bg-card divide-y">
                            <div v-for="token in recentIssuances" :key="token.name" class="flex items-center gap-3 px-4 py-3">
                                <span class="flex-1 text-sm text-foreground truncate font-medium">{{ token.name }}</span>
                                <Badge variant="outline" class="text-[10px] shrink-0">{{ token.type }}</Badge>
                                <span class="text-xs font-semibold text-foreground tabular-nums shrink-0">{{ token.amount }}</span>
                                <span class="text-[11px] text-muted-foreground shrink-0">{{ token.date }}</span>
                            </div>
                            <div v-if="recentIssuances.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
                                {{ $t('portfolio.noData') }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Top SDGs -->
                <div v-if="widgetVisible('sdgTopList')">
                    <div class="flex items-center justify-between px-6 py-4">
                        <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.sections.topSdgs') }}</h2>
                        <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" @click="setWidget('sdgTopList', false)"><X class="h-3.5 w-3.5" /></button>
                    </div>
                    <div class="px-6 pb-6">
                        <Skeleton v-if="!displayReady" class="h-48 rounded-xl" />
                        <div v-else class="rounded-xl border bg-card p-5 space-y-3">
                            <div v-for="sdg in topSdgs" :key="sdg.name" class="flex items-center gap-3">
                                <span class="text-xs text-foreground min-w-[110px] truncate">{{ sdg.name }}</span>
                                <div class="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                                    <div
                                        class="h-full rounded-full transition-all duration-500"
                                        :style="{ width: `${sdg.width}%`, backgroundColor: sdg.color || 'var(--color-primary)' }"
                                    />
                                </div>
                                <span class="text-xs text-muted-foreground tabular-nums min-w-[28px] text-right shrink-0">{{ sdg.count }}</span>
                            </div>
                            <div v-if="topSdgs.length === 0" class="py-4 text-center text-xs text-muted-foreground">
                                {{ $t('portfolio.noData') }}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- ROW 5: Network Activity + Retirement Trend -->
        <div v-if="widgetVisible('networkActivity') || widgetVisible('retirementTrend')" class="border-t">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x">

                <!-- Network Activity -->
                <div v-if="widgetVisible('networkActivity')">
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.sections.networkActivity') }}</h2>
                            <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.networkActivitySub') }}</p>
                        </div>
                        <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" @click="setWidget('networkActivity', false)"><X class="h-3.5 w-3.5" /></button>
                    </div>
                    <div class="px-6 pb-6">
                        <Skeleton v-if="!displayReady" class="h-48 rounded-xl" />
                        <template v-else>
                            <div v-if="recentActivity.length > 0" class="rounded-xl border bg-card divide-y">
                                <div
                                    v-for="(item, idx) in recentActivity"
                                    :key="idx"
                                    class="flex items-center gap-4 px-4 py-3"
                                >
                                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                        <component :is="activityIcons[item.type] ?? Activity" :class="[activityColors[item.type] ?? 'text-muted-foreground', 'h-4 w-4']" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm font-medium text-foreground">{{ item.action }}</p>
                                        <p class="text-xs text-muted-foreground truncate">{{ item.detail }}</p>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">
                                {{ $t('dashboard.noActivity') }}
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Retirement Trend -->
                <div v-if="widgetVisible('retirementTrend')">
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-foreground inline-flex items-center gap-1.5">
                                {{ $t('dashboard.retirementTrend') }}
                                <InfoTooltip :text="$t('dashboard.retirementTrendTooltip')" />
                            </h2>
                            <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.volumeMillions') }}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="flex items-center rounded-lg border p-0.5">
                                <button
                                    v-for="p in (['monthly', 'quarterly', 'yearly'] as const)"
                                    :key="p"
                                    class="rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors"
                                    :class="retirementPeriod === p ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                                    @click="retirementPeriod = p"
                                >
                                    {{ p === 'monthly' ? $t('dashboard.monthly') : p === 'quarterly' ? $t('dashboard.quarterly') : $t('dashboard.yearly') }}
                                </button>
                            </div>
                            <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" :title="$t('portfolio.removeWidget')" @click="setWidget('retirementTrend', false)"><X class="h-3.5 w-3.5" /></button>
                        </div>
                    </div>
                    <div class="px-6 pb-6">
                        <Skeleton v-if="!displayReady" class="h-48 rounded-xl" />
                        <div v-else class="rounded-xl border bg-card p-5">
                            <TrendLineChart
                                :data="retirementSeriesData"
                                color="hsl(24, 95%, 53%)"
                                fill-color="hsl(24, 95%, 53%, 0.08)"
                                :empty-text="$t('dashboard.noRetirementData')"
                            />
                            <div class="flex items-center justify-between mt-4 pt-3 border-t">
                                <span class="text-xs text-muted-foreground">{{ retirementSeriesData.length }} {{ retirementPeriod === 'monthly' ? $t('dashboard.months') : retirementPeriod === 'quarterly' ? $t('dashboard.quarters') : $t('dashboard.years') }}</span>
                                <span class="text-sm font-semibold text-foreground">{{ retirementSeriesTotal }} total</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- SYNC STATUS -->
        <div v-if="widgetVisible('syncStatus')" class="border-t">
            <div class="px-6 py-4 flex items-center justify-between">
                <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.sections.syncStatus') }}</h2>
                <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" @click="setWidget('syncStatus', false)"><X class="h-3.5 w-3.5" /></button>
            </div>
            <div class="px-6 pb-6">
                <div class="rounded-xl border bg-card p-5 flex items-center gap-3">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <RefreshCw class="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-foreground">{{ $t('portfolio.syncedLabel') }} {{ lastSyncFormatted }}</p>
                        <p class="text-xs text-muted-foreground mt-0.5">{{ $t('portfolio.syncedSub', { projects: activeProjectsCount }) }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- CUSTOM CHARTS -->
        <div v-if="customCharts.length > 0" class="border-t">
            <div class="px-6 py-4">
                <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.sections.customCharts') }}</h2>
            </div>
            <div class="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <template v-if="!displayReady">
                    <Skeleton v-for="i in customCharts.length" :key="i" class="h-52 rounded-xl" />
                </template>
                <div v-for="(chart, i) in displayReady ? customCharts : []" :key="i" class="rounded-xl border bg-card p-5">
                    <!-- Card header -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <component
                                :is="chart.type === 'line' ? TrendingUp : chart.type === 'bar' ? BarChart2 : PieChart"
                                class="h-3.5 w-3.5 text-muted-foreground"
                            />
                            <span class="text-sm font-semibold text-foreground">{{ chart.title }}</span>
                        </div>
                        <button
                            class="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                            :title="$t('portfolio.removeWidget')"
                            @click="removeCustomChart(i)"
                        >
                            <X class="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <!-- LINE chart → TrendLineChart -->
                    <template v-if="chart.type === 'line'">
                        <TrendLineChart
                            :data="getChartRawData(chart)"
                            color="hsl(162, 63%, 41%)"
                            fill-color="hsl(162, 63%, 41%, 0.08)"
                            :empty-text="$t('portfolio.noData')"
                        />
                        <div class="flex justify-between mt-3 pt-2 border-t">
                            <span class="text-[10px] text-muted-foreground">{{ getChartRawData(chart).length }} points</span>
                            <span class="text-[10px] font-medium text-foreground tabular-nums">
                                {{ formatCredits(getChartRawData(chart).reduce((s, r) => s + r.value, 0)) }} total
                            </span>
                        </div>
                    </template>

                    <!-- BAR chart → horizontal progress bars -->
                    <template v-else-if="chart.type === 'bar'">
                        <div v-if="getChartBarRows(chart).length > 0" class="space-y-2 max-h-52 overflow-y-auto pr-1">
                            <div v-for="row in getChartBarRows(chart)" :key="row.label" class="flex items-center gap-2">
                                <span class="text-[11px] text-foreground truncate min-w-0 flex-1">{{ row.label }}</span>
                                <div class="w-24 h-2 bg-muted/40 rounded-full overflow-hidden shrink-0">
                                    <div
                                        class="h-full rounded-full bg-primary/70 transition-all duration-500"
                                        :style="{ width: `${row.width}%` }"
                                    />
                                </div>
                                <span class="text-[10px] text-muted-foreground tabular-nums w-12 text-right shrink-0">{{ row.display }}</span>
                            </div>
                        </div>
                        <div v-else class="flex items-center justify-center h-24 text-xs text-muted-foreground">
                            {{ $t('portfolio.noData') }}
                        </div>
                    </template>

                    <!-- DONUT chart → DonutChart + legend -->
                    <template v-else-if="chart.type === 'donut'">
                        <div v-if="getChartSegments(chart).length > 0" class="flex items-start gap-4">
                            <DonutChart :segments="getChartSegments(chart)" :size="100" />
                            <div class="space-y-1.5 flex-1 min-w-0 overflow-y-auto max-h-28 pt-1 pr-1">
                                <div
                                    v-for="seg in getChartSegments(chart).slice(0, 8)"
                                    :key="seg.label"
                                    class="flex items-center gap-1.5 min-w-0"
                                >
                                    <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: seg.color }" />
                                    <span class="text-[10px] text-muted-foreground truncate flex-1">{{ seg.label }}</span>
                                    <span class="text-[10px] font-medium text-foreground tabular-nums shrink-0">{{ formatCredits(seg.value) }}</span>
                                </div>
                            </div>
                        </div>
                        <div v-else class="flex items-center justify-center h-24 text-xs text-muted-foreground">
                            {{ $t('portfolio.noData') }}
                        </div>
                    </template>

                </div>
            </div>
        </div>

        <!-- ADD CUSTOM CHART CTA -->
        <div class="px-6 pb-8">
            <button
                class="w-full rounded-xl border-2 border-dashed border-border/60 bg-transparent py-4 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="customCharts.length >= 5"
                @click="customCharts.length < 5 && (showChartBuilderModal = true)"
            >
                <Plus class="h-4 w-4" />
                {{ customCharts.length < 5 ? $t('portfolio.addCustomChart') : $t('portfolio.chartLimitReached') }}
            </button>
        </div>

        <!-- ══════════════════════════════════════════════ -->
        <!-- MODAL: MANAGE WATCHLIST                       -->
        <!-- ══════════════════════════════════════════════ -->
        <Teleport to="body">
            <Transition
                enter-active-class="transition-opacity duration-200"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-150"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="showWatchlistModal"
                    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    @click.self="showWatchlistModal = false"
                >
                    <div class="bg-card rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col shadow-2xl">
                        <!-- Header -->
                        <div class="flex items-start justify-between px-6 py-5 border-b shrink-0">
                            <div>
                                <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.modal.watchlist.title') }}</h2>
                                <p class="text-xs text-muted-foreground mt-1">{{ $t('portfolio.modal.watchlist.subtitle') }}</p>
                            </div>
                            <button class="text-muted-foreground hover:text-foreground transition-colors" @click="showWatchlistModal = false">
                                <X class="h-5 w-5" />
                            </button>
                        </div>
                        <!-- Filters (multi-select, mirrors the Projects table's FilterBar) -->
                        <div class="px-6 py-3 border-b shrink-0">
                            <FilterBar
                                model-value=""
                                :filters="watchlistFilterOptions"
                                :active-filters="watchlistFilters"
                                :result-count="watchlistCandidates.length"
                                :total-count="allProjects.length"
                                hide-search
                                @filter="setWatchlistFilter"
                                @clear="clearWatchlistFilters"
                            />
                        </div>
                        <!-- Search -->
                        <div class="px-6 py-3 border-b shrink-0">
                            <Input
                                v-model="watchlistSearch"
                                :placeholder="$t('common.searchEllipsis')"
                                class="text-sm"
                            />
                        </div>
                        <!-- List -->
                        <div class="flex-1 overflow-y-auto px-6 py-2">
                            <div v-for="item in watchlistCandidates" :key="item.id" class="flex items-center justify-between py-3 border-b last:border-0 gap-4">
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-foreground truncate">{{ item.name }}</p>
                                    <p v-if="item.meta" class="text-[11px] text-muted-foreground mt-0.5">{{ item.meta }}</p>
                                </div>
                                <button
                                    v-if="hasItem(item.id, item.type)"
                                    class="flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5 transition-colors shrink-0"
                                    @click="removeItem(item.id, item.type)"
                                >
                                    <X class="h-3 w-3" />
                                    {{ $t('portfolio.modal.watchlist.remove') }}
                                </button>
                                <button
                                    v-else
                                    class="flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-xs text-primary hover:bg-primary/5 transition-colors shrink-0"
                                    @click="addItem({ id: item.id, type: item.type, name: item.name, meta: item.meta })"
                                >
                                    <Plus class="h-3 w-3" />
                                    {{ $t('portfolio.modal.watchlist.add') }}
                                </button>
                            </div>
                            <div v-if="watchlistCandidates.length === 0" class="py-8 text-center text-sm text-muted-foreground">
                                {{ $t('common.noResults') }}
                            </div>
                        </div>
                        <!-- Footer -->
                        <div class="px-6 py-4 border-t flex items-center justify-between shrink-0">
                            <span class="text-xs text-muted-foreground">{{ $t('portfolio.modal.watchlist.footer', { count: watchlistCount }) }}</span>
                            <button
                                class="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                                @click="showWatchlistModal = false"
                            >
                                {{ $t('portfolio.modal.watchlist.done') }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- ══════════════════════════════════════════════ -->
        <!-- MODAL: WIDGET LIBRARY                         -->
        <!-- ══════════════════════════════════════════════ -->
        <Teleport to="body">
            <Transition
                enter-active-class="transition-opacity duration-200"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-150"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="showWidgetLibraryModal"
                    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    @click.self="showWidgetLibraryModal = false"
                >
                    <div class="bg-card rounded-2xl w-full max-w-3xl max-h-[86vh] flex flex-col shadow-2xl">
                        <!-- Header -->
                        <div class="flex items-start justify-between px-6 py-5 border-b shrink-0">
                            <div>
                                <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.modal.widgets.title') }}</h2>
                                <p class="text-xs text-muted-foreground mt-1">{{ $t('portfolio.modal.widgets.subtitle') }}</p>
                            </div>
                            <button class="text-muted-foreground hover:text-foreground transition-colors" @click="showWidgetLibraryModal = false">
                                <X class="h-5 w-5" />
                            </button>
                        </div>
                        <!-- Groups -->
                        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                            <div v-for="group in widgetGroups" :key="group.groupLabelKey">
                                <p class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{{ $t(group.groupLabelKey) }}</p>
                                <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    <button
                                        v-for="w in group.widgets"
                                        :key="w.key"
                                        class="flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-150"
                                        :class="widgetVisible(w.key)
                                            ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                                            : 'border-border bg-card hover:bg-muted/40'"
                                        @click="toggleWidget(w.key)"
                                    >
                                        <div class="flex w-full items-start justify-between">
                                            <div
                                                class="flex h-7 w-7 items-center justify-center rounded-lg"
                                                :class="widgetVisible(w.key) ? 'bg-primary/15' : 'bg-muted'"
                                            >
                                                <component
                                                    :is="{ certificate: Coins, stack: Layers, flame: Flame, plant: FolderKanban, 'chart-line': TrendingUp, 'chart-bar': BarChart2, 'chart-donut': PieChart, target: Target, flag: Flag, building: Building2, activity: Activity, refresh: RefreshCw }[w.iconName] ?? Activity"
                                                    class="h-3.5 w-3.5"
                                                    :class="widgetVisible(w.key) ? 'text-primary' : 'text-muted-foreground'"
                                                />
                                            </div>
                                            <div
                                                class="flex h-5 w-5 items-center justify-center rounded-full transition-colors"
                                                :class="widgetVisible(w.key) ? 'bg-primary' : 'bg-muted border border-border'"
                                            >
                                                <CheckCircle2 v-if="widgetVisible(w.key)" class="h-3 w-3 text-primary-foreground" />
                                            </div>
                                        </div>
                                        <p class="text-xs font-semibold text-foreground">{{ $t(w.labelKey) }}</p>
                                        <p class="text-[10px] text-muted-foreground leading-relaxed">{{ $t(w.descKey) }}</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <!-- Footer -->
                        <div class="px-6 py-4 border-t flex justify-end shrink-0">
                            <button
                                class="rounded-lg bg-primary px-5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                                @click="showWidgetLibraryModal = false"
                            >
                                {{ $t('portfolio.modal.widgets.apply') }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- ══════════════════════════════════════════════ -->
        <!-- MODAL: CUSTOM CHART BUILDER                   -->
        <!-- ══════════════════════════════════════════════ -->
        <Teleport to="body">
            <Transition
                enter-active-class="transition-opacity duration-200"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-150"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="showChartBuilderModal"
                    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    @click.self="showChartBuilderModal = false"
                >
                    <div class="bg-card rounded-2xl w-full max-w-lg flex flex-col shadow-2xl">
                        <!-- Header -->
                        <div class="flex items-start justify-between px-6 py-5 border-b">
                            <div>
                                <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.modal.chartBuilder.title') }}</h2>
                                <p class="text-xs text-muted-foreground mt-1">{{ $t('portfolio.modal.chartBuilder.subtitle', { used: customCharts.length, max: 5 }) }}</p>
                            </div>
                            <button class="text-muted-foreground hover:text-foreground transition-colors" @click="showChartBuilderModal = false">
                                <X class="h-5 w-5" />
                            </button>
                        </div>
                        <!-- Body -->
                        <div class="px-6 py-5 space-y-5">
                            <!-- Title -->
                            <div>
                                <label class="text-xs font-medium text-foreground block mb-1.5">{{ $t('portfolio.modal.chartBuilder.chartTitle') }}</label>
                                <Input
                                    v-model="chartTitle"
                                    :placeholder="$t('portfolio.modal.chartBuilder.titlePlaceholder')"
                                    class="text-sm"
                                />
                            </div>
                            <!-- Chart Type -->
                            <div>
                                <label class="text-xs font-medium text-foreground block mb-2">{{ $t('portfolio.modal.chartBuilder.chartType') }}</label>
                                <div class="grid grid-cols-3 gap-2">
                                    <button
                                        v-for="ct in [
                                            { type: 'line', icon: TrendingUp, label: $t('portfolio.modal.chartBuilder.types.line') },
                                            { type: 'bar', icon: BarChart2, label: $t('portfolio.modal.chartBuilder.types.bar') },
                                            { type: 'donut', icon: PieChart, label: $t('portfolio.modal.chartBuilder.types.donut') },
                                        ]"
                                        :key="ct.type"
                                        class="flex flex-col items-center gap-2 rounded-xl border py-3 text-xs font-medium transition-all duration-150"
                                        :class="chartType === ct.type ? 'border-primary/40 bg-primary/8 text-primary' : 'border-border text-muted-foreground hover:bg-muted/40'"
                                        @click="chartType = ct.type as ChartType"
                                    >
                                        <component :is="ct.icon" class="h-5 w-5" />
                                        {{ ct.label }}
                                    </button>
                                </div>
                            </div>
                            <!-- Axes -->
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-xs font-medium text-foreground block mb-1.5">{{ $t('portfolio.modal.chartBuilder.xAxis') }}</label>
                                    <SingleSelect v-model="xAxis" :options="xAxisOptions" />
                                </div>
                                <div>
                                    <label class="text-xs font-medium text-foreground block mb-1.5">{{ $t('portfolio.modal.chartBuilder.yAxis') }}</label>
                                    <SingleSelect v-model="yAxis" :options="yAxisOptions" />
                                </div>
                            </div>
                            <!-- Info note -->
                            <div class="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
                                <Activity class="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <p class="text-[11px] text-muted-foreground leading-relaxed">{{ $t('portfolio.modal.chartBuilder.note') }}</p>
                            </div>
                        </div>
                        <!-- Footer -->
                        <div class="px-6 py-4 border-t flex items-center justify-between">
                            <button
                                class="rounded-lg border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
                                @click="showChartBuilderModal = false"
                            >
                                {{ $t('common.close') }}
                            </button>
                            <button
                                class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                                :disabled="!chartTitle.trim() || customCharts.length >= 5"
                                @click="addCustomChart()"
                            >
                                <Plus class="h-3.5 w-3.5" />
                                {{ $t('portfolio.modal.chartBuilder.add') }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

    </div>
</template>
