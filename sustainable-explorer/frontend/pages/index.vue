<script setup lang="ts">
import { ref, computed } from 'vue';
import {
    Globe,
    Table2,
    Building2,
    Shield,
    FolderKanban,
    Coins,
    TrendingUp,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    CheckCircle2,
    Plus,
    Zap,
    Flame,
} from 'lucide-vue-next';
import { formatCredits, formatSmartCredits } from '~/lib/format';
import {
    allocateDonutColors,
    DONUT_OTHER_COLOR,
    mergeTopBinsWithOther,
} from '~/lib/chart-colors';
import { SectorType, SECTOR_I18N_KEYS } from '~/types/enums';

const { t } = useI18n();

const viewMode = ref<'map' | 'table'>('map');
const chartMode = ref<'projects' | 'credits'>('projects');
const selectedCountry = ref<string | null>(null);

// --- Filter dropdowns (sync with URL) ---
const route = useRoute();
const router = useRouter();

const selectedDeveloper = ref<string>((route.query.developer as string) || 'All Developers');
const selectedRegistry = ref<string>((route.query.registry as string) || 'All Registries');

const dashboardFilters = computed(() => ({
    developer: selectedDeveloper.value,
    registry: selectedRegistry.value,
}));

function syncDashboardUrl() {
    const query: Record<string, string> = {};
    if (selectedDeveloper.value && selectedDeveloper.value !== 'All Developers') query.developer = selectedDeveloper.value;
    if (selectedRegistry.value && selectedRegistry.value !== 'All Registries') query.registry = selectedRegistry.value;
    const currentNetwork = route.query.network;
    if (currentNetwork) query.network = currentNetwork as string;
    router.replace({ query });
}

const {
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
} = useDashboard(dashboardFilters);

type TimePeriod = 'monthly' | 'quarterly' | 'yearly';
const issuancePeriod = ref<TimePeriod>('monthly');
const retirementPeriod = ref<TimePeriod>('monthly');

const issuanceSeriesData = computed(() => buildIssuanceSeries(issuancePeriod.value));
const issuanceSeriesTotal = computed(() =>
    formatSmartCredits(issuanceSeriesData.value.reduce((s, d) => s + d.value, 0)),
);

const retirementSeriesData = computed(() => buildRetirementSeries(retirementPeriod.value));
const retirementSeriesTotal = computed(() =>
    formatSmartCredits(retirementSeriesData.value.reduce((s, d) => s + d.value, 0)),
);

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
    return merged.map((b, i) => ({
        ...b,
        color: colors[i]!,
    }));
}

const UNDEFINED_SECTOR_COLOR = '#a1a1aa';

function translateSector(raw: string): string {
    const key = SECTOR_I18N_KEYS[raw];
    return key ? t(`dashboard.sectorTypes.${key}`) : raw;
}

const sectorDonutRows = computed(() => {
    const bins = sectorBreakdown.value.map(({ label, projectCount, creditCount }) => ({
        label,
        projectCount,
        creditCount,
    }));
    const undefinedBin = bins.find(b => b.label === SectorType.Undefined);
    const namedBins = bins.filter(b => b.label !== SectorType.Undefined);
    const rows = buildDonutRows(namedBins, chartMode.value, 'sector');
    if (undefinedBin) {
        rows.push({ ...undefinedBin, color: UNDEFINED_SECTOR_COLOR });
    }
    return rows;
});

const registryDonutRows = computed(() =>
    buildDonutRows(
        registryBreakdown.value.map(({ label, projectCount, creditCount }) => ({
            label,
            projectCount,
            creditCount,
        })),
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

// Dashboard filters expressed as FilterBar options so the dashboard reuses
// the same chip-style filter visual idiom as Projects/Credits/Developers.
// Mapping convention: 'all' is FilterBar's no-filter sentinel; the dashboard
// composable wants the literal labels "All Developers" / "All Registries"
// so we translate at the boundary.
const ALL_DEVELOPERS = 'All Developers';
const ALL_REGISTRIES = 'All Registries';

const dashboardActiveFilters = computed<Record<string, string>>(() => ({
    developer: selectedDeveloper.value === ALL_DEVELOPERS ? 'all' : selectedDeveloper.value,
    registry: selectedRegistry.value === ALL_REGISTRIES ? 'all' : selectedRegistry.value,
}));

const dashboardFilterDefs = computed(() => [
    {
        key: 'developer',
        label: t('dashboard.allDevelopers'),
        options: developerOptions.value
            .filter(o => o !== ALL_DEVELOPERS)
            .map(o => ({ value: o, label: o })),
    },
    {
        key: 'registry',
        label: t('dashboard.allRegistries'),
        options: registryOptions.value
            .filter(o => o !== ALL_REGISTRIES)
            .map(o => ({ value: o, label: o })),
    },
]);

function applyDashboardFilter(key: string, value: string) {
    if (key === 'developer') {
        selectedDeveloper.value = value === 'all' ? ALL_DEVELOPERS : value;
    } else if (key === 'registry') {
        selectedRegistry.value = value === 'all' ? ALL_REGISTRIES : value;
    }
    syncDashboardUrl();
}

function clearFilters() {
    selectedDeveloper.value = ALL_DEVELOPERS;
    selectedRegistry.value = ALL_REGISTRIES;
    syncDashboardUrl();
}

// Unused: dummy ref so the v-model contract on FilterBar (text search) compiles.
const dashboardSearchRef = ref('');

const activeDetail = computed(() => {
    if (!selectedCountry.value) return null;
    return getCountryDetail(selectedCountry.value);
});

function onCountryClick(code: string) {
    selectedCountry.value = selectedCountry.value === code ? null : code;
}

// Route helpers for dashboard click-through navigation.
//
// Country table → projects page filtered by the country's display name. UNK
// (the "Unknown" bucket) has no meaningful country query, so caller short-
// circuits on c.code !== 'UNK' before invoking navigate().
function countryRouteFor(c: { name: string; code: string }) {
    if (c.code === 'UNK') return { path: '/projects' };
    return { path: '/projects', query: { country: c.name } };
}

// Sector legend → projects page filtered by sector. Untranslated label is
// what the API stores, so pass it verbatim. The "Other" aggregate bin (used
// when there are >15 sectors) has no canonical filter — link to the
// unfiltered list in that case.
function sectorRouteFor(label: string) {
    if (label === t('dashboard.otherCategory')) return { path: '/projects' };
    return { path: '/projects', query: { sector: label } };
}

// Activity icons mapping
const activityIcons: Record<string, any> = {
    project: Plus,
    credit: Coins,
    policy: CheckCircle2,
    verification: Shield,
    registry: Building2,
    retirement: Zap,
};

const activityColors: Record<string, string> = {
    project: 'text-stat-green',
    credit: 'text-stat-amber',
    policy: 'text-stat-blue',
    verification: 'text-primary',
    registry: 'text-stat-rose',
    retirement: 'text-stat-amber',
};

// --- Stat cards ---
const filteredStats = computed(() => {
    return [
        {
            label: t('dashboard.stats.registries'),
            value: String(stats.value.registries),
            change: '',
            trend: 'up',
            sub: t('dashboard.stats.registriesSub'),
            tooltip: t('dashboard.stats.registriesTooltip'),
            icon: Shield,
            accent: 'text-stat-blue',
            accentBg: 'bg-stat-blue/10',
            to: '/registries',
        },
        {
            label: t('dashboard.stats.methodologies'),
            value: String(stats.value.methodologies),
            change: '',
            trend: 'up',
            sub: t('dashboard.stats.methodologiesSub'),
            tooltip: t('dashboard.stats.methodologiesTooltip'),
            icon: FileText,
            accent: 'text-stat-green',
            accentBg: 'bg-stat-green/10',
            to: '/methodologies',
        },
        {
            label: t('dashboard.stats.projects'),
            value: stats.value.projects.toLocaleString(),
            change: '',
            trend: 'up',
            sub: t('dashboard.stats.projectsSub'),
            tooltip: t('dashboard.stats.projectsTooltip'),
            icon: FolderKanban,
            accent: 'text-stat-amber',
            accentBg: 'bg-stat-amber/10',
            to: '/projects',
        },
        {
            label: t('dashboard.stats.totalIssuances'),
            value: formatCredits(stats.value.totalCredits),
            change: '',
            trend: 'up',
            sub: t('dashboard.stats.totalIssuancesSub'),
            tooltip: t('dashboard.stats.totalIssuancesTooltip'),
            icon: Coins,
            accent: 'text-stat-rose',
            accentBg: 'bg-stat-rose/10',
            to: '/credits',
        },
        {
            label: t('dashboard.stats.totalRetired'),
            value: formatCredits(totalRetired.value),
            change: '',
            trend: 'up',
            sub: t('dashboard.stats.totalRetiredSub'),
            tooltip: t('dashboard.stats.totalRetiredTooltip'),
            icon: Flame,
            accent: 'text-orange-500',
            accentBg: 'bg-orange-500/10',
            to: '/credits',
        },
    ];
});
</script>

<template>
    <div class="space-y-0">
        <!-- Header -->
        <div class="px-6 pt-6 pb-5">
            <div class="flex items-start justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-foreground">{{ $t('dashboard.title') }}</h1>
                    <p class="text-sm text-muted-foreground mt-1">{{ $t('dashboard.subtitle') }}</p>
                </div>

                <!-- Filters — uses the same FilterBar component as Projects /
                     Credits / Developers so the chip-style visual idiom is
                     consistent across the app. -->
                <div class="flex items-center gap-2 shrink-0">
                    <InfoTooltip :text="$t('dashboard.filterTooltip')" position="bottom" />
                    <FilterBar
                        v-model="dashboardSearchRef"
                        :filters="dashboardFilterDefs"
                        :active-filters="dashboardActiveFilters"
                        :result-count="0"
                        :total-count="0"
                        :hide-search="true"
                        dropdown-align="right"
                        @filter="applyDashboardFilter"
                        @clear="clearFilters"
                    />
                </div>
            </div>
        </div>

        <!-- Stat Cards.
             Cards stagger in (50 ms each) on first paint so the dashboard
             "fills in" visually instead of pop-loading all five at once.
             Hover lifts the card 1px and deepens the shadow — transform/
             opacity only, no width/height animation, so there's no CLS.
             Stat values use tabular-nums to avoid horizontal jitter when the
             filter switches and numbers change. -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 px-6 pb-6">
            <template v-if="pending">
                <Skeleton v-for="n in 5" :key="n" class="h-24 rounded-xl" />
            </template>
            <AppLink
                v-else
                v-for="(s, i) in filteredStats"
                :key="s.label"
                :to="s.to"
                class="group rounded-xl border bg-card p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-border/80 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
                :style="`animation-delay: ${i * 50}ms; animation-fill-mode: backwards;`"
            >
                <div class="flex items-center justify-between mb-3">
                    <span class="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {{ s.label }}
                        <InfoTooltip :text="s.tooltip" />
                    </span>
                    <div :class="[s.accentBg, 'rounded-lg p-1.5 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-3']">
                        <component :is="s.icon" :class="[s.accent, 'h-3.5 w-3.5']" />
                    </div>
                </div>
                <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-bold text-foreground tabular-nums">{{ s.value }}</span>
                    <span v-if="s.change" class="flex items-center gap-0.5 text-xs font-medium text-stat-green">
                        <ArrowUpRight class="h-3 w-3" />
                        {{ s.change }}
                    </span>
                </div>
                <p class="text-xs text-muted-foreground mt-1">{{ s.sub }}</p>
            </AppLink>
        </div>

        <!-- Project Distribution -->
        <div class="border-t">
            <div class="flex items-center justify-between px-6 py-4">
                <div class="flex items-center gap-4">
                    <div>
                        <h2 class="text-base font-semibold text-foreground inline-flex items-center gap-1.5">{{ $t('dashboard.projectDistribution') }} <InfoTooltip :text="$t('dashboard.projectDistributionTooltip')" /></h2>
                        <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.projectDistributionSub') }}</p>
                    </div>
                </div>
                <div class="flex items-center rounded-lg border p-0.5">
                    <button
                        class="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors"
                        :class="viewMode === 'map'
                            ? 'bg-foreground text-background shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'"
                        @click="viewMode = 'map'"
                    >
                        <Globe class="h-3.5 w-3.5" />
                        {{ $t('dashboard.map') }}
                    </button>
                    <button
                        class="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors"
                        :class="viewMode === 'table'
                            ? 'bg-foreground text-background shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'"
                        @click="viewMode = 'table'"
                    >
                        <Table2 class="h-3.5 w-3.5" />
                        {{ $t('dashboard.table') }}
                    </button>
                </div>
            </div>
            <div class="px-6 pb-6">
                <!-- Map view with side panel -->
                <div v-if="viewMode === 'map'" class="rounded-xl border bg-card overflow-hidden">
                    <!-- Fixed height regardless of side-panel visibility so the
                         map doesn't jump (resize Leaflet) on every click. -->
                    <div class="flex h-[28rem]">
                        <!-- Map -->
                        <div class="flex-1 relative">
                            <ProjectMap :countries="mapCountries" :points="mapPoints" @country-click="onCountryClick" />
                        </div>

                        <CountryDetailPanel
                            :detail="activeDetail"
                            :country-code="selectedCountry"
                            @close="selectedCountry = null"
                        />
                    </div>
                </div>

                <!-- Table view -->
                <div v-else class="rounded-xl border bg-card overflow-hidden">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b bg-muted/30">
                                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('dashboard.country') }}</th>
                                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('dashboard.projectsCol') }}</th>
                                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('dashboard.issuancesCol') }}</th>
                                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('dashboard.methodologiesCol') }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <AppLink
                                v-for="c in countries"
                                :key="c.name"
                                :to="countryRouteFor(c)"
                                custom
                                v-slot="{ navigate }"
                            >
                                <tr
                                    class="hover:bg-muted/30 transition-colors"
                                    :class="c.code !== 'UNK' ? 'cursor-pointer' : ''"
                                    @click="c.code !== 'UNK' && navigate()"
                                >
                                    <td class="py-2.5 px-4">
                                        <span class="flex items-center gap-2">
                                            <CountryFlag :code="c.code" size="sm" />
                                            <span class="font-medium text-foreground">{{ c.name }}</span>
                                        </span>
                                    </td>
                                    <td class="py-2.5 px-4 text-right tabular-nums">{{ c.projects }}</td>
                                    <td class="py-2.5 px-4 text-right tabular-nums">{{ c.credits }}</td>
                                    <td class="py-2.5 px-4 text-right tabular-nums">{{ c.methodologies }}</td>
                                </tr>
                            </AppLink>
                            <tr v-if="countries.length === 0">
                                <td colspan="4" class="py-8 text-center text-sm text-muted-foreground">{{ $t('dashboard.noCountries') }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Sector & Registry Breakdown -->
        <div class="border-t">
            <div class="flex items-center justify-between px-6 py-4">
                <div>
                    <h2 class="text-base font-semibold text-foreground inline-flex items-center gap-1.5">{{ $t('dashboard.sectorRegistryBreakdown') }} <InfoTooltip :text="$t('dashboard.sectorRegistryBreakdownTooltip')" /></h2>
                    <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.sectorRegistryBreakdownSub') }}</p>
                </div>
                <div class="flex items-center rounded-lg border p-0.5">
                    <button
                        class="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors"
                        :class="chartMode === 'projects'
                            ? 'bg-foreground text-background shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'"
                        @click="chartMode = 'projects'"
                    >
                        {{ $t('dashboard.projectsToggle') }}
                    </button>
                    <button
                        class="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors"
                        :class="chartMode === 'credits'
                            ? 'bg-foreground text-background shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'"
                        @click="chartMode = 'credits'"
                    >
                        {{ $t('dashboard.issuancesToggle') }}
                    </button>
                </div>
            </div>
            <div class="px-6 pb-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Sector Breakdown -->
                    <div class="rounded-xl border bg-card p-5">
                        <h3 class="text-sm font-semibold text-foreground mb-4">{{ $t('dashboard.bySector') }}</h3>
                        <div class="flex items-start gap-5">
                            <DonutChart :segments="sectorChartSegments" :size="140" :hollow="true" />
                            <div class="space-y-2 flex-1 min-w-0 pt-1">
                                <AppLink
                                    v-for="s in sectorDonutRows"
                                    :key="s.label"
                                    :to="sectorRouteFor(s.label)"
                                    class="flex items-center gap-2 hover:bg-muted/30 -mx-1 px-1 rounded transition-colors"
                                >
                                    <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />
                                    <span class="text-xs text-muted-foreground truncate flex-1">{{ translateSector(s.label) }}</span>
                                    <span class="text-xs font-medium text-foreground tabular-nums shrink-0">
                                        {{ sectorTotal > 0 ? ((chartMode === 'projects' ? s.projectCount : s.creditCount) / sectorTotal * 100).toFixed(1) : '0.0' }}%
                                    </span>
                                    <span class="text-xs text-muted-foreground tabular-nums shrink-0">
                                        {{ chartMode === 'projects' ? `${s.projectCount} projects` : `${formatCredits(s.creditCount)}` }}
                                    </span>
                                </AppLink>
                            </div>
                        </div>
                    </div>

                    <!-- Registry Breakdown -->
                    <div class="rounded-xl border bg-card p-5">
                        <h3 class="text-sm font-semibold text-foreground mb-4">{{ $t('dashboard.byRegistry') }}</h3>
                        <div class="flex items-start gap-5">
                            <DonutChart :segments="registryChartSegments" :size="140" :hollow="true" />
                            <div class="space-y-2 flex-1 min-w-0 pt-1">
                                <AppLink
                                    v-for="s in registryDonutRows"
                                    :key="s.label"
                                    :to="{ path: '/projects', query: { registry: s.label } }"
                                    class="flex items-center gap-2 hover:bg-muted/30 -mx-1 px-1 rounded transition-colors"
                                >
                                    <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />
                                    <span class="text-xs text-muted-foreground truncate flex-1">{{ s.label }}</span>
                                    <span class="text-xs font-medium text-foreground tabular-nums shrink-0">
                                        {{ registryTotal > 0 ? ((chartMode === 'projects' ? s.projectCount : s.creditCount) / registryTotal * 100).toFixed(1) : '0.0' }}%
                                    </span>
                                    <span class="text-xs text-muted-foreground tabular-nums shrink-0">
                                        {{ chartMode === 'projects' ? `${s.projectCount} projects` : `${formatCredits(s.creditCount)}` }}
                                    </span>
                                </AppLink>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Two-column: Registries + Issuance -->
        <div class="border-t">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <!-- Top Registries -->
                <div class="lg:border-r">
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-foreground inline-flex items-center gap-1.5">{{ $t('dashboard.topRegistries') }} <InfoTooltip :text="$t('dashboard.topRegistriesTooltip')" /></h2>
                            <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.topRegistriesSub') }}</p>
                        </div>
                        <AppLink to="/registries" class="text-xs font-medium text-primary hover:underline">{{ $t('common.viewAll') }}</AppLink>
                    </div>
                    <div class="px-6 pb-6">
                        <div class="rounded-xl border bg-card overflow-hidden">
                            <div class="overflow-x-auto">
                            <table class="w-full text-sm table-fixed min-w-[420px]">
                                <thead>
                                    <tr class="border-b bg-muted/30">
                                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{{ $t('dashboard.name') }}</th>
                                        <th class="w-20 text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{{ $t('dashboard.policies') }}</th>
                                        <th class="w-20 text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{{ $t('dashboard.projectsCol') }}</th>
                                        <th class="w-28 text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{{ $t('dashboard.issuancesCol') }}</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y">
                                    <AppLink
                                        v-for="org in registries"
                                        :key="org.name"
                                        :to="{ path: '/registries', query: { displayName: org.name } }"
                                        custom
                                        v-slot="{ navigate }"
                                    >
                                        <tr
                                            class="hover:bg-muted/30 transition-colors cursor-pointer"
                                            @click="navigate()"
                                        >
                                            <td class="py-2.5 px-4">
                                                <span class="font-medium text-foreground break-all">{{ org.name }}</span>
                                            </td>
                                            <td class="py-2.5 px-4 text-right tabular-nums">
                                                <AppLink
                                                    :to="{ path: '/methodologies', query: { registryName: org.name } }"
                                                    class="hover:text-primary hover:underline"
                                                    @click.stop
                                                >{{ org.policies }}</AppLink>
                                            </td>
                                            <td class="py-2.5 px-4 text-right tabular-nums">
                                                <AppLink
                                                    :to="{ path: '/projects', query: { registry: org.name } }"
                                                    class="hover:text-primary hover:underline"
                                                    @click.stop
                                                >{{ org.projects }}</AppLink>
                                            </td>
                                            <td class="py-2.5 px-4 text-right tabular-nums text-muted-foreground">{{ org.credits }}</td>
                                        </tr>
                                    </AppLink>
                                    <tr v-if="registries.length === 0">
                                        <td colspan="4" class="py-8 text-center text-sm text-muted-foreground">{{ $t('dashboard.noRegistries') }}</td>
                                    </tr>
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Credit Issuance Trend -->
                <div>
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-foreground inline-flex items-center gap-1.5">{{ $t('dashboard.issuanceTrend') }} <InfoTooltip :text="$t('dashboard.issuanceTrendTooltip')" /></h2>
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
                            <AppLink to="/analytics" class="text-xs font-medium text-primary hover:underline">{{ $t('dashboard.analytics') }}</AppLink>
                        </div>
                    </div>
                    <div class="px-6 pb-6">
                        <div class="rounded-xl border bg-card p-5">
                            <TrendLineChart
                                :data="issuanceSeriesData"
                                color="hsl(142, 76%, 36%)"
                                fill-color="hsl(142, 76%, 36%, 0.08)"
                                :format-value="formatSmartCredits"
                                :empty-text="$t('dashboard.noIssuanceData')"
                            />
                            <div class="flex items-center justify-between mt-4 pt-3 border-t">
                                <span class="text-xs text-muted-foreground">{{ issuanceSeriesData.length }} {{ issuancePeriod === 'monthly' ? $t('dashboard.months') : issuancePeriod === 'quarterly' ? $t('dashboard.quarters') : $t('dashboard.years') }}</span>
                                <span class="text-sm font-semibold text-foreground">{{ issuanceSeriesTotal }} {{ $t('common.total') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Retirement Trend & Vintage Distribution -->
        <div class="border-t">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <!-- Retirement Trend -->
                <div class="lg:border-r">
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-foreground inline-flex items-center gap-1.5">{{ $t('dashboard.retirementTrend') }} <InfoTooltip :text="$t('dashboard.retirementTrendTooltip')" /></h2>
                            <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.volumeMillions') }}</p>
                        </div>
                        <div class="flex items-center rounded-lg border p-0.5">
                            <button
                                v-for="p in (['monthly', 'quarterly', 'yearly'] as const)"
                                :key="p"
                                class="rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors"
                                :class="retirementPeriod === p ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                                @click="retirementPeriod = p"
                            >
                                {{ p === 'monthly' ? 'Monthly' : p === 'quarterly' ? 'Quarterly' : 'Yearly' }}
                            </button>
                        </div>
                    </div>
                    <div class="px-6 pb-6">
                        <div class="rounded-xl border bg-card p-5">
                            <TrendLineChart
                                :data="retirementSeriesData"
                                color="hsl(24, 95%, 53%)"
                                fill-color="hsl(24, 95%, 53%, 0.08)"
                                :format-value="formatSmartCredits"
                                :empty-text="$t('dashboard.noRetirementData')"
                            />
                            <div class="flex items-center justify-between mt-4 pt-3 border-t">
                                <span class="text-xs text-muted-foreground">{{ retirementSeriesData.length }} {{ retirementPeriod === 'monthly' ? $t('dashboard.months') : retirementPeriod === 'quarterly' ? $t('dashboard.quarters') : $t('dashboard.years') }}</span>
                                <span class="text-sm font-semibold text-foreground">{{ retirementSeriesTotal }} {{ $t('common.total') }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Vintage Distribution -->
                <div>
                    <div class="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-foreground inline-flex items-center gap-1.5">{{ $t('dashboard.vintageDistribution') }} <InfoTooltip :text="$t('dashboard.vintageDistributionTooltip')" /></h2>
                            <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.vintageDistributionSub') }}</p>
                        </div>
                    </div>
                    <div class="px-6 pb-6">
                        <div class="rounded-xl border bg-card p-5">
                            <div v-if="vintageDistribution.length > 0" class="flex items-end gap-3 h-48">
                                <div
                                    v-for="v in vintageDistribution"
                                    :key="v.year"
                                    class="flex-1 flex flex-col items-center gap-2"
                                >
                                    <span class="text-[11px] font-medium text-muted-foreground tabular-nums">{{ formatCredits(v.credits) }}</span>
                                    <div
                                        class="w-full rounded-t-md bg-chart-2/80 hover:bg-chart-2 transition-colors"
                                        :style="{ height: `${(v.credits / vintageMax) * 140}px` }"
                                    />
                                    <span class="text-[11px] text-muted-foreground">{{ v.year }}</span>
                                </div>
                            </div>
                            <div v-else class="flex items-center justify-center h-48 text-sm text-muted-foreground">
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

        <!-- Network Activity (moved to bottom) -->
        <div class="border-t">
            <div class="px-6 py-4">
                <h2 class="text-base font-semibold text-foreground inline-flex items-center gap-1.5">{{ $t('dashboard.networkActivity') }} <InfoTooltip :text="$t('dashboard.networkActivityTooltip')" /></h2>
                <p class="text-xs text-muted-foreground mt-0.5">{{ $t('dashboard.networkActivitySub') }}</p>
            </div>
            <div class="px-6 pb-6">
                <div v-if="recentActivity.length > 0" class="rounded-xl border bg-card divide-y">
                    <div
                        v-for="(item, idx) in recentActivity"
                        :key="idx"
                        class="flex items-center gap-4 px-4 py-3"
                    >
                        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <component :is="activityIcons[item.type]" :class="[activityColors[item.type], 'h-4 w-4']" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-foreground">{{ item.action }}</p>
                            <p class="text-xs text-muted-foreground truncate">{{ item.detail }}</p>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <Clock class="h-3 w-3 text-muted-foreground/50" />
                            <span class="text-[11px] text-muted-foreground/70">{{ item.time }}</span>
                        </div>
                    </div>
                </div>
                <div v-else class="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">
                    {{ $t('dashboard.noActivity') }}
                </div>
            </div>
        </div>
    </div>
</template>
