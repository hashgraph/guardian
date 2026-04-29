<script setup lang="ts">
import { FolderKanban, FileJson, Sparkles } from 'lucide-vue-next';
import type { FilterOption } from '~/components/shared/FilterBar.vue';
import { formatCredits } from '~/lib/format';
import { SDG_LIST } from '~/lib/sdgs';
import { generateProjectVc } from '~/lib/mock-vc';
import { MOCK_TRANSFERS, MOCK_RETIREMENTS } from '~/data';
import { getMethodologyLongName } from '~/lib/methodologies';
import type { Project } from '~/types/models';

const { t } = useI18n();
const { projects, total, filterOptions } = useProjects();
const { resolvedCode } = useGeocodedCountries(projects);

const INVALID_COUNTRY = new Set([
    'not applicable', 'not specified', 'n/a', 'na', 'none', 'not stated',
    'not available', 'not provided', 'unknown',
    'point', 'multipoint', 'linestring', 'multilinestring',
    'polygon', 'multipolygon', 'geometrycollection',
]);
function displayCountry(p: Project): string | null {
    if (!p.country) return null;
    return INVALID_COUNTRY.has(p.country.toLowerCase().trim()) ? null : p.country;
}


// Aggregate transferred/retired per project
const transferredByProject = computed(() => {
    const map: Record<string, number> = {};
    for (const t of MOCK_TRANSFERS) { map[t.projectId] = (map[t.projectId] || 0) + t.quantity; }
    return map;
});
const retiredByProject = computed(() => {
    const map: Record<string, number> = {};
    for (const r of MOCK_RETIREMENTS) { map[r.projectId] = (map[r.projectId] || 0) + r.quantity; }
    return map;
});

const vcViewerOpen = ref(false);
const vcViewerTitle = ref('');
const vcViewerData = ref<Record<string, any> | null>(null);

function viewVc(p: Project) {
    vcViewerTitle.value = p.name;
    vcViewerData.value = generateProjectVc(p);
    vcViewerOpen.value = true;
}

const allProjects = computed(() => projects.value.map(p => ({
    ...p,
    creditsFormatted: formatCredits(p.credits),
    transferred: transferredByProject.value[p.id] || 0,
    transferredFormatted: formatCredits(transferredByProject.value[p.id] || 0),
    retired: retiredByProject.value[p.id] || 0,
    retiredFormatted: formatCredits(retiredByProject.value[p.id] || 0),
    methodologyLong: getMethodologyLongName(p.methodologyId, p.methodology),
})));

const { searchQuery, currentPage, paginated, filtered, totalPages, pageSize, activeFilters, sortKey, sortDir, toggleSort, setFilter, clearFilters, applyPreset } =
    useFilteredPagination(allProjects, {
        searchFields: ['name', 'country', 'methodology', 'registry', 'sector', 'sectoralScope'],
        pageSize: 8,
        defaultSort: { key: 'createdAt', dir: 'desc' },
        arrayFields: ['sdgs'],
    });

const presets = computed(() => [
    { label: t('projects.presets.issuingForestry'), filters: { status: 'Issuing', sector: 'Forestry and Land Use' } },
    { label: t('projects.presets.goldStandard'), filters: { registry: 'Gold Standard' } },
    { label: t('projects.presets.sdg13'), filters: { sdgs: '13' } },
    { label: t('projects.presets.underValidation'), filters: { status: 'Under Validation' } },
    { label: t('projects.presets.vintage2024'), filters: { vintage: '2024' } },
    { label: t('projects.presets.blueCarbon'), search: 'Blue Carbon' },
]);

// Summary statistics for filtered results
const summaryStats = computed(() => {
    const f = filtered.value;
    const totalIssuances = f.reduce((sum, p) => sum + (p.issuanceCount ?? 0), 0);
    const uniqueCountries = new Set(f.map(p => p.country)).size;
    const uniqueRegistries = new Set(f.map(p => p.registry)).size;
    return { totalIssuances, uniqueCountries, uniqueRegistries };
});

const filters = computed<FilterOption[]>(() => [
    {
        key: 'status',
        label: t('projects.filters.status'),
        options: filterOptions.value.statuses.map(s => ({ value: s, label: s })),
    },
    {
        key: 'registry',
        label: t('projects.filters.registry'),
        options: filterOptions.value.registries.map(r => ({ value: r, label: r })),
    },
    {
        key: 'vintage',
        label: t('projects.filters.vintage'),
        options: filterOptions.value.vintages.map(v => ({ value: v, label: v })),
    },
    {
        key: 'sector',
        label: t('projects.filters.sector'),
        options: filterOptions.value.sectors.map(s => ({ value: s, label: s })),
    },
    {
        key: 'sectoralScope',
        label: t('projects.filters.sectoralScope'),
        options: filterOptions.value.sectoralScopes.map(s => ({ value: s, label: s })),
    },
    {
        key: 'sdgs',
        label: t('projects.filters.sdgs'),
        multiSelect: true,
        options: SDG_LIST.map(s => ({
            value: String(s.id),
            label: `SDG ${s.id}: ${s.name}`,
            icon: `/sdgs/E-WEB-Goal-${String(s.id).padStart(2, '0')}.png`,
        })),
    },
]);

const statusColor: Record<string, string> = {
    Registered: 'bg-slate-100 text-slate-600',
    'Under Validation': 'bg-stat-amber/10 text-stat-amber',
    Verified: 'bg-stat-blue/10 text-stat-blue',
    Issuing: 'bg-stat-green/10 text-stat-green',
    Completed: 'bg-purple-50 text-purple-600',
};
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-4">
            <h1 class="text-2xl font-bold text-foreground">{{ $t('projects.title') }}</h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('projects.subtitle') }}</p>
        </div>

        <div class="px-6 pb-3">
            <FilterBar
                v-model="searchQuery"
                :filters="filters"
                :active-filters="activeFilters"
                :result-count="filtered.length"
                :total-count="total"
                :search-placeholder="$t('projects.searchPlaceholder')"
                @filter="setFilter"
                @clear="clearFilters"
            />

            <!-- Preset Templates -->
            <div class="flex items-center gap-2 mt-2.5 flex-wrap">
                <span class="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Sparkles class="h-3 w-3" /> {{ $t('projects.quickFilters') }}
                </span>
                <button
                    v-for="preset in presets"
                    :key="preset.label"
                    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    @click="applyPreset({ search: preset.search, filters: preset.filters } as any)"
                >
                    {{ preset.label }}
                </button>
            </div>
        </div>

        <!-- Summary Stats -->
        <div v-if="filtered.length !== total" class="px-6 pb-3">
            <div class="flex items-center gap-4 rounded-lg bg-muted/50 px-4 py-2.5 text-xs">
                <span class="font-medium text-foreground">{{ $t('projects.projectsFound', { count: filtered.length }) }}</span>
                <span class="text-muted-foreground">&middot;</span>
                <span class="text-muted-foreground">{{ $t('projects.totalIssuances') }} <strong class="text-foreground">{{ formatCredits(summaryStats.totalIssuances) }}</strong></span>
                <span class="text-muted-foreground">&middot;</span>
                <span class="text-muted-foreground">{{ $t('projects.countries') }} <strong class="text-foreground">{{ summaryStats.uniqueCountries }}</strong></span>
                <span class="text-muted-foreground">&middot;</span>
                <span class="text-muted-foreground">{{ $t('projects.registries') }} <strong class="text-foreground">{{ summaryStats.uniqueRegistries }}</strong></span>
            </div>
        </div>

        <div class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-x-auto">
                <table class="w-full text-sm min-w-[900px]">
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <SortableHeader :label="$t('projects.columns.project')" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.country')" sort-key="country" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.registry')" sort-key="registry" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.methodology')" sort-key="methodology" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.sector')" sort-key="sector" :tooltip="$t('projects.sectorTooltip')" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.issuances')" sort-key="issuanceCount" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.transferred')" sort-key="transferred" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.retired')" sort-key="retired" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.status')" sort-key="status" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[160px]">
                                <span class="inline-flex items-center gap-1">
                                    {{ $t('projects.columns.sdgs') }}
                                    <InfoTooltip :text="$t('projects.sdgsTooltip')" />
                                </span>
                            </th>
                            <th class="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"><span class="inline-flex items-center gap-1">{{ $t('projects.columns.rawData') }} <InfoTooltip :text="$t('tooltips.viewRawData')" /></span></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr
                            v-for="p in paginated"
                            :key="p.id"
                            class="hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                            <td class="py-3 px-4">
                                <NuxtLink :to="`/projects/${p.id}`" class="font-medium text-foreground hover:text-primary transition-colors">{{ p.name }}</NuxtLink>
                            </td>
                            <td class="py-3 px-4 text-muted-foreground">
                                <div class="group relative inline-flex items-center gap-1.5">
                                    <CountryFlag :code="resolvedCode(p)" size="sm" />
                                    <span class="hidden md:inline">{{ displayCountry(p) }}</span>
                                    <div v-if="displayCountry(p)" class="md:hidden pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-[100]">
                                        <div class="whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-[11px] text-background shadow-lg">
                                            {{ displayCountry(p) }}
                                        </div>
                                        <div class="mx-auto h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground" />
                                    </div>
                                </div>
                            </td>
                            <td class="py-3 px-4 text-muted-foreground text-xs">{{ p.registry }}</td>
                            <td class="py-3 px-4">
                                <div class="group relative inline-block">
                                    <span class="text-xs bg-muted rounded px-1.5 py-0.5 cursor-default">{{ p.methodology }}</span>
                                    <div class="pointer-events-none absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-[100] w-80">
                                        <div class="whitespace-normal rounded-md bg-foreground px-2.5 py-1.5 text-[11px] text-background shadow-lg leading-snug">
                                            {{ p.methodologyLong }}
                                        </div>
                                        <div class="ml-3 h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground" />
                                    </div>
                                </div>
                            </td>
                            <td class="py-3 px-4">
                                <div class="group relative inline-block">
                                    <span class="text-xs text-muted-foreground cursor-default">{{ p.sector }}</span>
                                    <div class="pointer-events-none absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-[100] max-w-xs">
                                        <div class="whitespace-normal rounded-md bg-foreground px-2.5 py-1.5 text-[11px] text-background shadow-lg leading-snug">
                                            {{ $t('projects.sectoralScope', { scope: p.sectoralScope }) }}
                                        </div>
                                        <div class="ml-3 h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground" />
                                    </div>
                                </div>
                            </td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">{{ p.issuanceCount ?? 0 }}</td>
                            <td class="py-3 px-4 text-right tabular-nums text-muted-foreground">{{ p.transferredFormatted }}</td>
                            <td class="py-3 px-4 text-right tabular-nums text-muted-foreground">{{ p.retiredFormatted }}</td>
                            <td class="py-3 px-4">
                                <span :class="[statusColor[p.status] || 'bg-muted text-muted-foreground', 'text-xs font-medium rounded-full px-2 py-0.5']">
                                    {{ p.status }}
                                </span>
                            </td>
                            <td class="py-3 px-4">
                                <SdgBadges :ids="p.sdgs" :max="4" />
                            </td>
                            <td class="py-3 px-3 text-center">
                                <button
                                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    :title="$t('common.viewRawData')"
                                    @click.stop="viewVc(p)"
                                >
                                    <FileJson class="h-3.5 w-3.5" />
                                </button>
                            </td>
                        </tr>
                        <tr v-if="paginated.length === 0">
                            <td colspan="11" class="py-12 text-center text-sm text-muted-foreground">{{ $t('projects.noMatch') }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <Pagination
                v-model:current-page="currentPage"
                :total-pages="totalPages"
                :total-items="filtered.length"
                :page-size="pageSize"
            />
        </div>

        <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
    </div>
</template>
