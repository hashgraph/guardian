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
    PackageOpen,
    ListPlus,
    Globe,
    Eye,
    ChevronLeft,
    ChevronRight,
    BarChartHorizontal,
    Donut,
    Radar,
    SquarePen,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { formatCredits, formatSmartCredits } from '~/lib/format';
import {
    allocateDonutColors,
    DONUT_OTHER_COLOR,
    mergeTopBinsWithOther,
} from '~/lib/chart-colors';
import { niceAxis } from '~/lib/chart-scale';
import { SectorType, SECTOR_I18N_KEYS } from '~/types/enums';
import { DEFAULT_WIDGETS } from '~/composables/usePortfolioWidgets';
import type { WatchlistItem, WatchlistItemType } from '~/composables/usePortfolioWatchlist';
import type { NetworkId } from '~/composables/useNetwork';
import type { RadarPoint } from '~/components/shared/RadarChart.vue';
import type { Project } from '~/types/models';

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

const { watchlistItems, removeItem, count: watchlistCount } = usePortfolioWatchlist();
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
} = usePortfolioWatchlistFilters();

// All chart data filtered by the active watchlist (empty watchlist ⇒ empty portfolio)
const {
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
    mapCountries,
    mapPoints,
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
        .slice(0, 10);
    return sorted.map(s => ({
        name: s.name,
        count: useCredits ? s.credits : s.projects,
        color: s.color,
    }));
});

// Shared numeric x-axis (0..niceMax) for the Top SDGs bar chart — SDGs have
// no target/goal, so bars are plotted against a real "nice" scale (rounded
// to a clean step like 1/2/5/10…) rather than each bar being sized relative
// to the top-ranked item, which would misleadingly look like progress
// toward a goal.
const sdgAxis = computed(() => niceAxis(Math.max(...topSdgs.value.map(s => s.count), 0)));

// SDG coverage radar (all SDGs) — filtered by watchlist, mode-aware. Axis
// labels use just the SDG number ("1".."17") since 17 axes is too tight for
// full names around the perimeter; the full name shows in the hover tooltip.
const sdgCoverage = computed<RadarPoint[]>(() => {
    const useCredits = chartMode.value === 'credits';
    const sorted = [...filteredSdgStats.value].sort((a, b) => a.id - b.id);
    return sorted.map(s => ({
        id: s.id,
        label: String(s.id),
        fullLabel: s.name,
        value: useCredits ? s.credits : s.projects,
    }));
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

// Draft selection edited while the modal is open. Add/Remove/Add All only
// mutate this — the committed `watchlistItems` (and therefore the whole
// portfolio dashboard) only changes when "Update Watchlist" is clicked.
const pendingWatchlist = ref<WatchlistItem[]>([]);

function pendingHasItem(id: string, type: WatchlistItemType): boolean {
    return pendingWatchlist.value.some(i => i.id === id && i.type === type);
}

function pendingAddItem(item: WatchlistItem): void {
    if (pendingHasItem(item.id, item.type)) return;
    pendingWatchlist.value = [...pendingWatchlist.value, item];
}

function pendingRemoveItem(id: string, type: WatchlistItemType): void {
    pendingWatchlist.value = pendingWatchlist.value.filter(i => !(i.id === id && i.type === type));
}

// When checked, shows only the items currently in the pending draft —
// bypasses Country/Methodology/Registry so the user can review their full
// selection regardless of the filters currently applied. Search still narrows.
const showSelectedOnly = ref(false);

const watchlistCandidates = computed(() => {
    const q = watchlistSearch.value.toLowerCase();
    const base = showSelectedOnly.value
        ? allProjects.value.filter(p => pendingHasItem(p.id, 'project'))
        : allProjects.value.filter(p => matchesWatchlistFilters(p));
    return base
        .filter(p => !q || p.name?.toLowerCase().includes(q) || p.registry?.toLowerCase().includes(q))
        .map(p => ({
            id: p.id,
            type: 'project' as const,
            name: p.name,
            meta: p.registry ?? '',
        }));
});

// Merges every currently-filtered/searched candidate into the pending draft
// in one shot — no network calls (the full project list is already loaded)
// and no per-item mutation, so this stays O(n) even for large result sets.
function addAllMatching() {
    const additions = watchlistCandidates.value.filter(c => !pendingHasItem(c.id, c.type));
    pendingWatchlist.value = [...pendingWatchlist.value, ...additions];
    toast(t('portfolio.modal.watchlist.addAllSuccess', { count: additions.length }));
}

function openWatchlist() {
    pendingWatchlist.value = [...watchlistItems.value];
    watchlistSearch.value = '';
    showSelectedOnly.value = false;
    showWatchlistModal.value = true;
}

// Discards the draft — used by Cancel, the header close button, backdrop
// click, and Escape. Only "Update Watchlist" commits pendingWatchlist.
function closeWatchlistModal() {
    showWatchlistModal.value = false;
}

function updateWatchlist() {
    watchlistItems.value = pendingWatchlist.value;
    showWatchlistModal.value = false;
}

function clearWatchlist() {
    watchlistItems.value = [];
}

// Chart builder
// 'bar' is kept as the horizontal-bar value (not renamed) so charts synced
// before this change keep rendering correctly — it used to be the only bar
// orientation, now BarChart renders it with orientation="horizontal".
// 'column' is the new vertical-bar type.
type ChartType = 'line' | 'bar' | 'column' | 'pie' | 'donut' | 'radar';

interface CustomChartConfig {
    id: string;
    title: string;
    type: ChartType;
    xAxis: string;
    yAxis: string;
}

const chartTitle = ref('');
const chartType = ref<ChartType>('line');
const xAxis = ref('month');
const yAxis = ref('credits');
// Set while editing an existing chart (see openChartBuilder/saveCustomChart)
// — null means the modal is in "add" mode.
const editingChartId = ref<string | null>(null);

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

// Donut/Pie segments with colours (DonutChart's `hollow` prop distinguishes
// the two visually — same segment data either way).
function getChartSegments(cfg: CustomChartConfig) {
    const rows = getChartRawData(cfg);
    if (rows.length === 0) return [];
    const colors = allocateDonutColors(Math.min(rows.length, 15), `custom|${cfg.xAxis}|${cfg.yAxis}`);
    return rows.map((r, i) => ({ label: r.label, value: r.value, color: colors[i] ?? DONUT_OTHER_COLOR }));
}

// RadarChart needs at least 3 axes to draw a meaningful shape.
function getChartRadarPoints(cfg: CustomChartConfig): RadarPoint[] {
    return getChartRawData(cfg).map((r, i) => ({ id: i, label: r.label, fullLabel: r.label, value: r.value }));
}

function resetChartForm(): void {
    chartTitle.value = '';
    chartType.value = 'line';
    xAxis.value = 'month';
    yAxis.value = 'credits';
    editingChartId.value = null;
}

// Opens the builder in "add" mode (no arg) or "edit" mode (existing chart,
// form pre-filled) — the same modal/save path handles both.
function openChartBuilder(existing?: CustomChartConfig): void {
    if (existing) {
        editingChartId.value = existing.id;
        chartTitle.value = existing.title;
        chartType.value = existing.type;
        xAxis.value = existing.xAxis;
        yAxis.value = existing.yAxis;
    } else {
        resetChartForm();
    }
    showChartBuilderModal.value = true;
}

function saveCustomChart(): void {
    if (!chartTitle.value.trim()) return;
    const patch = {
        title: chartTitle.value.trim(),
        type: chartType.value,
        xAxis: xAxis.value,
        yAxis: yAxis.value,
    };
    if (editingChartId.value) {
        const id = editingChartId.value;
        customCharts.value = customCharts.value.map(c => c.id === id ? { ...c, ...patch } : c);
    } else {
        if (customCharts.value.length >= 5) return;
        customCharts.value = [...customCharts.value, { id: crypto.randomUUID(), ...patch }];
    }
    showChartBuilderModal.value = false;
    resetChartForm();
}

function removeCustomChart(id: string): void {
    customCharts.value = customCharts.value.filter(c => c.id !== id);
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

// ── Watched Projects carousel ────────────────────────────────────────────────
// Paged, not free-scrolling: the outer row is `overflow-hidden` and an inner
// track is translated by whole multiples of 100% so a "page" is always
// exactly `watchedCardsPerPage` full cards — never a partial card peeking in,
// and never wider than the row itself (a free-scrolling row here was
// overflowing the whole page horizontally instead of scrolling locally).
const watchedContainerWidth = ref(0);

function updateWatchedContainerWidth(): void {
    watchedContainerWidth.value = window.innerWidth;
}

// Viewport-width breakpoints (not the narrower content-area width, and not
// literal Tailwind bp values) — tuned by eye for when each card count stops
// looking cramped, since the sidebar nav eats a fixed chunk of the viewport
// that plain Tailwind breakpoints don't account for.
const watchedCardsPerPage = computed(() => {
    const w = watchedContainerWidth.value;
    if (w >= 1920) return 5;
    if (w >= 1510) return 4;
    if (w >= 1170) return 3;
    if (w >= 875) return 2;
    return 1;
});

// Fixed per-card width (not flex-1) so a partial last page — fewer cards
// than a full page — doesn't stretch those cards wider than every other
// page's cards; the row just ends with empty space instead.
const watchedCardWidth = computed(() => {
    const n = watchedCardsPerPage.value;
    return `calc((100% - ${(n - 1) * 12}px) / ${n})`;
});

// Each "page" needs a *definite pixel* width, measured from the actual
// viewport box (not `w-full`/percentage). A percentage width on a
// flex-shrink:0 child of the track is ambiguous — the track has no explicit
// width of its own, so browsers can resolve "100%" against the track's
// content-driven size instead of the viewport's, which both let a sliver of
// the next page peek through and made translateX(N%) (relative to the
// track's own, now-ambiguous, box) jump by the wrong amount. Measuring in
// pixels sidesteps that entirely.
const watchedViewportRef = ref<HTMLElement | null>(null);
const watchedViewportPx = ref(0);
let _watchedRO: ResizeObserver | null = null;

watch(watchedViewportRef, (el) => {
    _watchedRO?.disconnect();
    _watchedRO = null;
    if (el) {
        _watchedRO = new ResizeObserver(() => { watchedViewportPx.value = el.clientWidth; });
        _watchedRO.observe(el);
        watchedViewportPx.value = el.clientWidth;
    }
});

const watchedPages = computed(() => {
    const size = watchedCardsPerPage.value;
    const pages: Project[][] = [];
    for (let i = 0; i < filteredProjects.value.length; i += size) {
        pages.push(filteredProjects.value.slice(i, i + size));
    }
    return pages;
});

const watchedPageIndex = ref(0);

// Snap back into range whenever the page count shrinks — a resize to a
// narrower breakpoint (fewer cards per page, more pages) is always still in
// range, but a resize to a wider one can leave a stale index past the end.
watch(watchedPages, (pages) => {
    if (watchedPageIndex.value > pages.length - 1) watchedPageIndex.value = Math.max(0, pages.length - 1);
});

function goWatchedPage(direction: 'left' | 'right'): void {
    watchedPageIndex.value = direction === 'left'
        ? Math.max(0, watchedPageIndex.value - 1)
        : Math.min(watchedPages.value.length - 1, watchedPageIndex.value + 1);
}

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

// The network whose data local watchlist/widgets/filters/customCharts refs
// currently reflect. Watchlists (and the rest of these preferences) are
// stored per-network server-side (see usePortfolioSync) — this lets a
// network switch tell them apart from a same-network re-hydration.
let hydratedNetwork: NetworkId | null = null;

// Applies server-fetched preferences to local reactive state.
//
// `sameNetwork` distinguishes a same-network refresh (login / re-mount) from
// a network switch. This is the ONLY place these refs are mutated at
// hydration time, and every mutation sits inside the
// `hydrating = true … await nextTick(); hydrating = false` bracket below —
// the await flushes the deep persist watchers while `hydrating` is still
// true, so none of them can fire a spurious PUT. (A previous version reset
// these refs in the network-switch watcher itself, *before* calling
// applyRemote, then flipped `hydrating` back to false synchronously. Because
// Vue's deep watchers flush asynchronously, that reset was still observed by
// the persist watchers below with `hydrating === false` during the
// `await hydrateFromApi()` gap, scheduling a stray 800ms-delayed PUT of an
// empty watchlist against the newly-switched-to network — which then fired
// *after* the real data had been restored locally, silently wiping it back
// to empty on the server. Keeping every mutation inside this single guarded
// bracket removes that window structurally instead of patching its timing.)
async function applyRemote(
    remote: Awaited<ReturnType<typeof hydrateFromApi>>,
    sameNetwork: boolean,
): Promise<void> {
    hydrating.value = true;
    if (!remote) {
        // Fetch failed / not authenticated. A network switch must still not
        // leave the previous network's data on screen; a same-network
        // refresh leaves current in-memory state untouched.
        if (!sameNetwork) {
            watchlistItems.value = [];
            watchlistFilters.value = {};
            widgets.value = { ...DEFAULT_WIDGETS };
            customCharts.value = [];
        }
        await nextTick();
        hydrating.value = false;
        return;
    }
    const remoteWatchlist = remote.watchlist ?? [];
    if (remoteWatchlist.length > 0) {
        // Server has saved items — server is the source of truth.
        watchlistItems.value = remoteWatchlist;
    } else if (sameNetwork && watchlistItems.value.length > 0) {
        // Same-network re-hydration: the server returned empty but this
        // session already added items that haven't hit the server yet
        // (mid-debounce) — push them up rather than dropping them. Gated on
        // `sameNetwork` so a network switch can never re-upload one
        // network's watchlist onto another's — that case falls to the
        // `else` below, which adopts the new network's empty state instead.
        pushType('watchlist', watchlistItems.value, 0);
    } else {
        watchlistItems.value = [];
    }
    const remoteFilters = remote.watchlistFilters ?? {};
    if (Object.keys(remoteFilters).length > 0) {
        watchlistFilters.value = remoteFilters;
    } else if (sameNetwork && hasActiveWatchlistFilters.value) {
        pushType('watchlist_filters', watchlistFilters.value, 0);
    } else {
        watchlistFilters.value = {};
    }
    widgets.value = { ...DEFAULT_WIDGETS, ...(remote.widgets ?? {}) };
    // Backfill id for charts synced before it existed — deep-watched below,
    // so the backfilled id persists to the server on the next debounced push.
    customCharts.value = (remote.customCharts ?? []).slice(0, 5)
        .map(c => ({ ...c, id: c.id ?? crypto.randomUUID(), type: c.type as ChartType }));
    await nextTick();
    hydrating.value = false;
}

// Push changes to API — one independent 800ms debounce per type.
// hydrating guard prevents spurious PUTs during initial hydration from the server.
watch(watchlistItems,   () => { if (!hydrating.value) pushType('watchlist',         watchlistItems.value); }, { deep: true });
watch(widgets,          () => { if (!hydrating.value) pushType('widgets',           widgets.value);        }, { deep: true });
watch(customCharts,     () => { if (!hydrating.value) pushType('custom_charts',     customCharts.value);   }, { deep: true });

// Country/Methodology/Registry filters only narrow the "Manage Watchlist"
// modal's candidate list (see usePortfolioWatchlistFilters) — they no longer
// affect the committed watchlist or the dashboard, so this just persists the
// filter selection for next time the modal opens.
watch(watchlistFilters, () => {
    if (!hydrating.value) pushType('watchlist_filters', watchlistFilters.value);
}, { deep: true });

// Re-hydrate when the user logs in while on this page, or switches network.
// All "discard the previous network's local state" logic lives inside
// applyRemote (gated on sameNetwork) — this handler never mutates the
// watchlist/filters/widgets refs itself.
watch([isAuthenticated, network], async ([authed, net]) => {
    if (!authed) return;
    const sameNetwork = hydratedNetwork === null || net === hydratedNetwork;
    await applyRemote(await hydrateFromApi(), sameNetwork);
    hydratedNetwork = net;
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
    window.addEventListener('resize', updateWatchedContainerWidth);
    updateWatchedContainerWidth();
    // Without a localStorage pre-population step, state starts empty on
    // mount — wait for the server hydration to resolve before flipping
    // clientReady, so the skeleton stays up rather than flashing the
    // unfiltered "all network" dataset before the user's saved
    // watchlist/filters arrive.
    if (isAuthenticated.value) await applyRemote(await hydrateFromApi(), true);
    hydratedNetwork = network.value;
    clientReady.value = true;
    void recalcChips();
});
onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', updateWatchedContainerWidth);
    _chipsRO?.disconnect();
    _watchedRO?.disconnect();
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
                        @click="openChartBuilder()"
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
                </div>
            </div>
        </div>

        <!-- WATCHLIST CARD (identity/chips when populated, empty state when not) -->
        <div class="px-6 pb-4">
            <div class="rounded-xl border bg-card p-4">
                <div class="flex items-center justify-between gap-2 flex-wrap mb-3">
                    <div class="flex items-center gap-2 flex-wrap">
                        <Star class="h-3.5 w-3.5 text-stat-amber fill-stat-amber shrink-0" />
                        <span class="text-sm font-medium text-foreground">{{ $t('portfolio.watchlist') }}</span>
                        <Skeleton v-if="!displayReady" class="h-4 w-6 rounded-full" />
                        <span v-else class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {{ watchlistCount }}
                        </span>
                    </div>
                    <div v-if="displayReady && watchlistItems.length > 0" class="flex items-center gap-3">
                        <button
                            class="inline-flex items-center gap-1 rounded-md py-1 text-[11px] transition-colors text-muted-foreground hover:text-primary"
                            @click="clearWatchlist()"
                        >
                            <X class="h-3 w-3" />
                            {{ $t('portfolio.clearWatchlist') }}
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

                <!-- While hydrating we don't yet know whether this network's
                     watchlist is empty — show a neutral placeholder rather
                     than committing to either the chip row or the "empty"
                     message, which would otherwise flash briefly on every
                     reload/network switch before flipping to the real state. -->
                <Skeleton v-if="!displayReady" class="h-9 rounded-lg" />
                <template v-else-if="watchlistItems.length > 0">
                    <div class="flex items-center gap-2 min-w-0">
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
                </template>
                <div v-else class="flex flex-col items-center text-center gap-2 py-6">
                    <PackageOpen class="h-6 w-6 text-muted-foreground" />
                    <p class="text-sm font-semibold text-foreground">{{ $t('portfolio.empty.title') }}</p>
                    <p class="text-xs text-muted-foreground max-w-md">{{ $t('portfolio.empty.description') }}</p>
                    <button
                        class="mt-1 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        @click="openWatchlist()"
                    >
                        <Star class="h-3.5 w-3.5" />
                        {{ $t('portfolio.empty.cta') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- LOADING PLACEHOLDER — shown while hydrating, before we know
             whether this network's watchlist actually has anything in it.
             Deliberately title-less/generic: the real sections below reveal
             their titles only once we're certain there's something to show
             under them, so a reload/network switch never flashes a full
             scaffold of chart titles for a portfolio that turns out empty. -->
        <div v-if="!displayReady" class="px-6 pb-8 space-y-4">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton v-for="n in 4" :key="n" class="h-28 rounded-xl" />
            </div>
            <Skeleton class="h-[28rem] rounded-xl" />
            <Skeleton class="h-64 rounded-xl" />
        </div>

        <!-- STATS & CHARTS — only once we're certain the watchlist has items. -->
        <template v-else-if="watchlistCount > 0">

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

        <!-- WATCHED PROJECTS -->
        <div v-if="filteredProjects.length > 0" class="border-t">
            <div class="flex items-center justify-between px-6 py-4 flex-wrap gap-2">
                <div class="flex items-center gap-2 min-w-0 flex-wrap">
                    <Eye class="h-4 w-4 text-primary shrink-0" />
                    <h2 class="text-sm font-semibold text-foreground shrink-0">{{ $t('portfolio.watchedProjects.title') }}</h2>
                    <span class="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary shrink-0">
                        {{ filteredProjects.length }}
                    </span>
                    <span class="text-xs text-muted-foreground truncate">{{ $t('portfolio.watchedProjects.subtitle') }}</span>
                </div>
                <!-- Same page-button pattern as components/shared/Pagination.vue
                     (the table pagination control) — prev/next arrows plus
                     numbered pages, collapsing to an ellipsis past 7 pages. -->
                <div v-if="watchedPages.length > 1" class="flex items-center gap-2 shrink-0">
                    <button
                        class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors"
                        :class="watchedPageIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted hover:text-foreground'"
                        :disabled="watchedPageIndex === 0"
                        :aria-label="$t('portfolio.watchedProjects.scrollLeft')"
                        @click="goWatchedPage('left')"
                    >
                        <ChevronLeft class="h-3.5 w-3.5" />
                    </button>

                    <span class="text-xs text-muted-foreground tabular-nums">
                        {{ $t('portfolio.watchedProjects.pageOf', { current: watchedPageIndex + 1, total: watchedPages.length }) }}
                    </span>

                    <button
                        class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors"
                        :class="watchedPageIndex === watchedPages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted hover:text-foreground'"
                        :disabled="watchedPageIndex === watchedPages.length - 1"
                        :aria-label="$t('portfolio.watchedProjects.scrollRight')"
                        @click="goWatchedPage('right')"
                    >
                        <ChevronRight class="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <!-- overflow-hidden clips everything outside the current page — the
                 row can never grow wider than its own box, so it can't drag the
                 whole page into horizontal scroll the way free-scrolling did.
                 The ref/measurement lives on this unpadded inner div (not the
                 px-6 wrapper around it) so clientWidth reflects the actual
                 space available to the cards, not that plus the page padding. -->
            <div class="px-6 pb-5">
                <div ref="watchedViewportRef" class="overflow-hidden">
                    <div
                        class="flex transition-transform duration-300 ease-out"
                        :style="{ transform: `translateX(-${watchedPageIndex * watchedViewportPx}px)` }"
                    >
                        <div
                            v-for="(page, pageIdx) in watchedPages"
                            :key="pageIdx"
                            class="flex gap-3 shrink-0"
                            :style="{ width: `${watchedViewportPx}px` }"
                        >
                            <WatchedProjectCard
                                v-for="p in page"
                                :key="p.id"
                                :project="p"
                                class="shrink-0"
                                :style="{ width: watchedCardWidth }"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- PROJECT DISTRIBUTION (map) -->
        <div v-if="widgetVisible('projectMap')" class="border-t">
            <div class="flex items-center justify-between px-6 py-4">
                <div>
                    <h2 class="text-base font-semibold text-foreground inline-flex items-center gap-1.5">
                        {{ $t('dashboard.projectDistribution') }}
                        <InfoTooltip :text="$t('dashboard.projectDistributionTooltip')" />
                    </h2>
                    <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.projectDistributionSub') }}</p>
                </div>
                <button
                    class="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    :title="$t('portfolio.removeWidget')"
                    @click="setWidget('projectMap', false)"
                >
                    <X class="h-3.5 w-3.5" />
                </button>
            </div>
            <div class="px-6 pb-6">
                <Skeleton v-if="!displayReady" class="h-[28rem] rounded-xl" />
                <div v-else class="rounded-xl border bg-card overflow-hidden">
                    <div class="h-[28rem]">
                        <ProjectMap :countries="mapCountries" :points="mapPoints" auto-fit />
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
                <div v-for="chart in displayReady ? customCharts : []" :key="chart.id" class="rounded-xl border bg-card p-5">
                    <!-- Card header -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2 min-w-0">
                            <component
                                :is="{ line: TrendingUp, column: BarChart2, bar: BarChartHorizontal, pie: PieChart, donut: Donut, radar: Radar }[chart.type] ?? BarChart2"
                                class="h-3.5 w-3.5 text-muted-foreground shrink-0"
                            />
                            <span class="text-sm font-semibold text-foreground truncate">{{ chart.title }}</span>
                        </div>
                        <div class="flex items-center gap-4 shrink-0">
                            <button
                                class="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                :title="$t('portfolio.editWidget')"
                                @click="openChartBuilder(chart)"
                            >
                                <SquarePen class="h-3.5 w-3.5" />
                            </button>
                            <button
                                class="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                :title="$t('portfolio.removeWidget')"
                                @click="removeCustomChart(chart.id)"
                            >
                                <X class="h-3.5 w-3.5" />
                            </button>
                        </div>
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

                    <!-- COLUMN chart → BarChart (vertical) -->
                    <template v-else-if="chart.type === 'column'">
                        <BarChart :data="getChartRawData(chart)" orientation="vertical" :empty-text="$t('portfolio.noData')" />
                    </template>

                    <!-- BAR chart → BarChart (horizontal) -->
                    <template v-else-if="chart.type === 'bar'">
                        <BarChart :data="getChartRawData(chart)" orientation="horizontal" :empty-text="$t('portfolio.noData')" />
                    </template>

                    <!-- PIE / DONUT chart → DonutChart + legend (pie = filled, donut = ring) -->
                    <template v-else-if="chart.type === 'pie' || chart.type === 'donut'">
                        <div v-if="getChartSegments(chart).length > 0" class="flex items-start gap-4">
                            <DonutChart :segments="getChartSegments(chart)" :size="100" :hollow="chart.type === 'donut'" />
                            <div class="space-y-1.5 flex-1 min-w-0 max-h-52 overflow-y-auto pt-1 pr-1">
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

                    <!-- RADAR chart → RadarChart -->
                    <template v-else-if="chart.type === 'radar'">
                        <div v-if="getChartRadarPoints(chart).length >= 3" class="flex items-center justify-center">
                            <RadarChart :points="getChartRadarPoints(chart)" color="hsl(162, 63%, 41%)" />
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
                @click="customCharts.length < 5 && openChartBuilder()"
            >
                <Plus class="h-4 w-4" />
                {{ customCharts.length < 5 ? $t('portfolio.addCustomChart') : $t('portfolio.chartLimitReached') }}
            </button>
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
                            <DonutChart :segments="sectorChartSegments" :size="120" :hollow="true" />
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
                            <DonutChart :segments="registryChartSegments" :size="120" :hollow="true" />
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

                    <!-- SDG Coverage Radar -->
                    <div v-if="widgetVisible('sdgRadar')" class="rounded-xl border bg-card p-5">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-semibold text-foreground">{{ $t('portfolio.sections.sdgCoverage') }}</h3>
                            <div class="flex items-center gap-2">
                                <span class="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                    {{ $t('portfolio.sdgGoalsCount', { n: sdgCoverage.length }) }}
                                </span>
                                <button class="text-muted-foreground/40 hover:text-muted-foreground transition-colors" @click="setWidget('sdgRadar', false)"><X class="h-3.5 w-3.5" /></button>
                            </div>
                        </div>
                        <Skeleton v-if="!displayReady" class="h-64 rounded-xl" />
                        <div v-else-if="sdgCoverage.length > 0" class="flex items-center justify-center">
                            <RadarChart :points="sdgCoverage" color="hsl(142, 76%, 36%)" />
                        </div>
                        <div v-else class="py-4 text-center text-xs text-muted-foreground">
                            {{ $t('portfolio.noData') }}
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
                        <div v-else-if="topSdgs.length > 0" class="rounded-xl border bg-card p-5">
                            <!-- Horizontal bar chart plotted against a real numeric x-axis
                                 (see sdgAxis) — SDGs have no target/goal, so bars are
                                 compared on a shared scale rather than sized relative to
                                 the top-ranked item or filled as a "percent complete" track. -->
                            <div class="flex gap-3">
                                <div class="flex flex-col gap-3 shrink-0">
                                    <div v-for="sdg in topSdgs" :key="sdg.name" class="h-6 flex items-center max-w-[130px]">
                                        <span class="min-w-0 truncate text-xs text-foreground" :title="sdg.name">{{ sdg.name }}</span>
                                    </div>
                                </div>
                                <div class="relative flex-1 min-w-0">
                                    <!-- Y-axis + gridlines, spanning the full bar stack -->
                                    <div
                                        v-for="(tick, i) in sdgAxis.ticks"
                                        :key="i"
                                        class="absolute top-0 bottom-5 w-px"
                                        :class="i === 0 ? 'bg-border' : 'bg-border/50'"
                                        :style="{ left: `${(tick / sdgAxis.max) * 100}%` }"
                                    />
                                    <!-- Bars -->
                                    <div class="flex flex-col gap-3">
                                        <div v-for="sdg in topSdgs" :key="sdg.name" class="relative h-6">
                                            <InfoTooltip
                                                :text="`${sdg.name}: ${sdg.count}`"
                                                class="absolute inset-y-0 left-0 items-center transition-all duration-500"
                                                :style="{ width: `${Math.max((sdg.count / sdgAxis.max) * 100, 2)}%` }"
                                            >
                                                <div class="h-full w-full rounded-r-md" :style="{ backgroundColor: sdg.color || 'var(--color-primary)' }" />
                                                <span class="ml-2 text-xs font-medium text-foreground tabular-nums whitespace-nowrap">{{ sdg.count }}</span>
                                            </InfoTooltip>
                                        </div>
                                    </div>
                                    <!-- X-axis -->
                                    <div class="relative h-5 mt-2 border-t border-border">
                                        <span
                                            v-for="(tick, i) in sdgAxis.ticks"
                                            :key="i"
                                            class="absolute top-1.5 text-[10px] text-muted-foreground tabular-nums"
                                            :class="i === 0 ? 'left-0' : i === sdgAxis.ticks.length - 1 ? 'right-0' : '-translate-x-1/2'"
                                            :style="i !== 0 && i !== sdgAxis.ticks.length - 1 ? { left: `${(tick / sdgAxis.max) * 100}%` } : {}"
                                        >{{ tick }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-else class="rounded-xl border bg-card p-5 py-4 text-center text-xs text-muted-foreground">
                            {{ $t('portfolio.noData') }}
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

        </template>

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
                    @click.self="closeWatchlistModal()"
                >
                    <div class="bg-card rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col shadow-2xl">
                        <!-- Header -->
                        <div class="flex items-start justify-between px-6 py-5 border-b shrink-0">
                            <div>
                                <h2 class="text-base font-semibold text-foreground">{{ $t('portfolio.modal.watchlist.title') }}</h2>
                                <p class="text-xs text-muted-foreground mt-1">{{ $t('portfolio.modal.watchlist.subtitle') }}</p>
                            </div>
                            <button class="text-muted-foreground hover:text-foreground transition-colors" @click="closeWatchlistModal()">
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
                            <div class="mt-2 flex items-center justify-between gap-3 flex-wrap">
                                <label class="inline-flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer">
                                    <input
                                        type="checkbox"
                                        class="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                                        :checked="showSelectedOnly"
                                        @change="(e) => { showSelectedOnly = (e.target as HTMLInputElement).checked; }"
                                    />
                                    {{ $t('portfolio.modal.watchlist.showSelectedOnly') }}
                                </label>
                                <button
                                    v-if="watchlistCandidates.length > 0"
                                    type="button"
                                    class="inline-flex items-center gap-1 rounded-md py-1.5 text-xs transition-colors text-muted-foreground hover:text-primary"
                                    @click="addAllMatching()"
                                >
                                    <ListPlus class="h-3 w-3" />
                                    {{ $t('portfolio.modal.watchlist.addAll') }}
                                </button>
                            </div>
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
                                    v-if="pendingHasItem(item.id, item.type)"
                                    class="flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5 transition-colors shrink-0"
                                    @click="pendingRemoveItem(item.id, item.type)"
                                >
                                    <X class="h-3 w-3" />
                                    {{ $t('portfolio.modal.watchlist.remove') }}
                                </button>
                                <button
                                    v-else
                                    class="flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-xs text-primary hover:bg-primary/5 transition-colors shrink-0"
                                    @click="pendingAddItem({ id: item.id, type: item.type, name: item.name, meta: item.meta })"
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
                            <span class="text-xs text-muted-foreground">{{ $t('portfolio.modal.watchlist.footer', { count: pendingWatchlist.length }) }}</span>
                            <div class="flex items-center gap-2">
                                <button
                                    class="rounded-lg px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                    @click="closeWatchlistModal()"
                                >
                                    {{ $t('portfolio.modal.watchlist.cancel') }}
                                </button>
                                <button
                                    class="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                                    @click="updateWatchlist()"
                                >
                                    {{ $t('portfolio.modal.watchlist.update') }}
                                </button>
                            </div>
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
                                                    :is="{ certificate: Coins, stack: Layers, flame: Flame, plant: FolderKanban, 'chart-line': TrendingUp, 'chart-bar': BarChart2, 'chart-donut': PieChart, target: Target, globe: Globe, flag: Flag, building: Building2, activity: Activity, refresh: RefreshCw }[w.iconName] ?? Activity"
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
                                <h2 class="text-base font-semibold text-foreground">
                                    {{ editingChartId ? $t('portfolio.modal.chartBuilder.editTitle') : $t('portfolio.modal.chartBuilder.title') }}
                                </h2>
                                <p class="text-xs text-muted-foreground mt-1">
                                    {{ editingChartId ? $t('portfolio.modal.chartBuilder.editSubtitle') : $t('portfolio.modal.chartBuilder.subtitle', { used: customCharts.length, max: 5 }) }}
                                </p>
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
                                            { type: 'column', icon: BarChart2, label: $t('portfolio.modal.chartBuilder.types.column') },
                                            { type: 'bar', icon: BarChartHorizontal, label: $t('portfolio.modal.chartBuilder.types.bar') },
                                            { type: 'pie', icon: PieChart, label: $t('portfolio.modal.chartBuilder.types.pie') },
                                            { type: 'donut', icon: Donut, label: $t('portfolio.modal.chartBuilder.types.donut') },
                                            { type: 'radar', icon: Radar, label: $t('portfolio.modal.chartBuilder.types.radar') },
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
                                :disabled="!chartTitle.trim() || (!editingChartId && customCharts.length >= 5)"
                                @click="saveCustomChart()"
                            >
                                <component :is="editingChartId ? SquarePen : Plus" class="h-3.5 w-3.5" />
                                {{ editingChartId ? $t('portfolio.modal.chartBuilder.update') : $t('portfolio.modal.chartBuilder.add') }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

    </div>
</template>
