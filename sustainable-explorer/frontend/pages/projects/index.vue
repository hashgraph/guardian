<script setup lang="ts">
import { FolderKanban, FileJson, Sparkles, CheckSquare, Square, X, Columns2 } from 'lucide-vue-next';
import type { FilterOption } from '~/components/shared/FilterBar.vue';
import { formatCredits } from '~/lib/format';
import { SDG_LIST } from '~/lib/sdgs';
import { generateProjectVc } from '~/lib/mock-vc';
import { MOCK_TRANSFERS, MOCK_RETIREMENTS } from '~/data';
import { getMethodologyLongName } from '~/lib/methodologies';
import type { Project } from '~/types/models';

const { t } = useI18n();
const { projects, total, filterOptions } = useProjects();
const { selectedEntries, canAdd, isSelected, toggleProject, removeProject, clearAll, goToCompare } = useProjectComparison();
const { resolvedCode, resolvedName } = useGeocodedCountries(projects);

const INVALID_COUNTRY = new Set([
    'not applicable', 'not specified', 'n/a', 'na', 'none', 'not stated',
    'not available', 'not provided', 'unknown',
    'point', 'multipoint', 'linestring', 'multilinestring',
    'polygon', 'multipolygon', 'geometrycollection',
]);
function displayCountry(p: Project): string | null {
    const name = resolvedName(p);
    if (!name) return null;
    return INVALID_COUNTRY.has(name.toLowerCase().trim()) ? null : name;
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
    // Override country with the resolved display name so filters and sorting
    // use the same value that appears in the column (not raw coordinates).
    country: displayCountry(p) ?? '',
})));

const countryFilterOptions = computed(() =>
    [...new Set(allProjects.value.map(p => p.country).filter(Boolean))].sort(),
);

const { searchQuery, currentPage, paginated, filtered, totalPages, pageSize, activeFilters, sortKey, sortDir, toggleSort, setFilter, clearFilters, applyPreset } =
    useFilteredPagination(allProjects, {
        searchFields: ['name', 'country', 'methodology', 'registry', 'sector', 'sectoralScope', 'developer'],
        pageSize: 10,
        defaultSort: { key: 'createdAt', dir: 'desc' },
        arrayFields: ['sdgs'],
    });

const presets = computed(() => [
    { label: t('projects.presets.goldStandard'), filters: { registry: 'Gold Standard' } as Record<string, string> },
    { label: t('projects.presets.sdg13'), filters: { sdgs: '13' } as Record<string, string> },
    { label: t('projects.presets.vintage2024'), filters: { vintage: '2024|2024' } as Record<string, string> },
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
        key: 'country',
        label: t('projects.filters.country'),
        searchable: true,
        options: countryFilterOptions.value.map(c => ({ value: c, label: c })),
    },
    {
        key: 'vintage',
        label: t('projects.filters.vintage'),
        type: 'yearrange' as const,
        options: [],
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
        key: 'developer',
        label: t('projects.filters.developer'),
        options: filterOptions.value.developers.map(d => ({ value: d, label: d })),
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
                    @click="applyPreset({ filters: preset.filters })"
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
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="overflow-x-auto">
                <table class="table-fixed text-sm" style="min-width: 1360px; width: 100%">
                    <colgroup>
                        <col style="width: 40px" />    <!-- compare -->
                        <col style="width: 240px" />   <!-- project name -->
                        <col style="width: 110px" />   <!-- country -->
                        <col style="width: 100px" />   <!-- registry -->
                        <col style="width: 150px" />   <!-- methodology -->
                        <col style="width: 120px" />   <!-- sector -->
                        <col style="width: 90px" />    <!-- issuances -->
                        <col style="width: 110px" />   <!-- transferred -->
                        <col style="width: 100px" />   <!-- retired -->
                        <col style="width: 110px" />   <!-- status -->
                        <col style="width: 130px" />   <!-- sdgs -->
                        <col style="width: 60px" />    <!-- raw data -->
                    </colgroup>
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <th class="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <span class="inline-flex items-center gap-1"><Columns2 class="h-3.5 w-3.5" /></span>
                            </th>
                            <SortableHeader :label="$t('projects.columns.project')" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.country')" sort-key="country" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.registry')" sort-key="registry" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.methodology')" sort-key="methodology" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.sector')" sort-key="sector" :tooltip="$t('projects.sectorTooltip')" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.issuances')" sort-key="issuanceCount" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.transferred')" sort-key="transferred" align="right" mock :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.retired')" sort-key="retired" align="right" mock :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('projects.columns.status')" sort-key="status" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                            class="hover:bg-muted/30 transition-colors cursor-pointer align-top"
                        >
                            <td class="py-3 px-3 text-center">
                                <button
                                    :class="[
                                        isSelected(p.id)
                                            ? 'text-primary bg-primary/10 hover:bg-primary/20'
                                            : (!canAdd ? 'opacity-40 cursor-not-allowed text-muted-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'),
                                        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                                    ]"
                                    :title="isSelected(p.id) ? $t('projects.compare.removeFromCompare') : (!canAdd ? $t('projects.compare.maxSelected') : $t('projects.compare.addToCompare'))"
                                    :disabled="!canAdd && !isSelected(p.id)"
                                    @click.stop="toggleProject(p.id, p.name)"
                                >
                                    <CheckSquare v-if="isSelected(p.id)" class="h-3.5 w-3.5" />
                                    <Square v-else class="h-3.5 w-3.5" />
                                </button>
                            </td>
                            <td class="py-3 px-4">
                                <NuxtLink :to="`/projects/${p.id}`" class="font-medium text-foreground hover:text-primary transition-colors break-words">{{ p.name }}</NuxtLink>
                            </td>
                            <td class="py-3 px-4 text-muted-foreground">
                                <template v-if="displayCountry(p)">
                                    <div class="group relative inline-flex items-center gap-1.5">
                                        <CountryFlag :code="resolvedCode(p)" size="sm" />
                                        <span class="hidden md:inline">{{ displayCountry(p) }}</span>
                                        <div class="md:hidden pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-[100]">
                                            <div class="whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-[11px] text-background shadow-lg">
                                                {{ displayCountry(p) }}
                                            </div>
                                            <div class="mx-auto h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground" />
                                        </div>
                                    </div>
                                </template>
                                <span v-else class="text-xs">—</span>
                            </td>
                            <td class="py-3 px-4 text-muted-foreground text-xs break-words">{{ p.registry }}</td>
                            <td class="py-3 px-4 max-w-0">
                                <span class="block text-xs bg-muted rounded px-1.5 py-0.5 cursor-default break-words">{{ p.methodology }}</span>
                            </td>
                            <td class="py-3 px-4">
                                <span class="block text-xs text-muted-foreground cursor-default truncate">{{ p.sector }}</span>
                            </td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">
                                <NuxtLink
                                    v-if="p.projectKey && p.issuanceCount"
                                    :to="`/credits?projectKey=${encodeURIComponent(p.projectKey)}`"
                                    class="hover:text-primary hover:underline transition-colors"
                                    @click.stop
                                >
                                    {{ p.issuanceCount }}
                                </NuxtLink>
                                <span v-else>{{ p.issuanceCount ?? 0 }}</span>
                            </td>
                            <td class="py-3 px-4 text-right tabular-nums text-muted-foreground">{{ p.transferredFormatted }}</td>
                            <td class="py-3 px-4 text-right tabular-nums text-muted-foreground">{{ p.retiredFormatted }}</td>
                            <td class="py-3 px-4">
                                <span :class="[statusColor[p.status] || 'bg-muted text-muted-foreground', 'text-xs font-medium rounded-full px-2 py-0.5']">
                                    {{ p.status }}
                                </span>
                            </td>
                            <td class="py-3 px-4">
                                <SdgBadges :ids="p.sdgs" :max="2" />
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
                            <td colspan="12" class="py-12 text-center text-sm text-muted-foreground">{{ $t('projects.noMatch') }}</td>
                        </tr>
                    </tbody>
                </table>
                </div>
            </div>

            <Pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :total-pages="totalPages"
                :total-items="filtered.length"
            />
        </div>

        <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
    </div>

    <!-- Floating comparison bar -->
    <Teleport to="body">
        <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-4"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-4"
        >
            <div v-if="selectedEntries.length > 0" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                <div class="pointer-events-auto flex items-center gap-3 rounded-xl border bg-card shadow-2xl px-4 py-3 min-w-[340px] max-w-[700px]">
                    <Columns2 class="h-4 w-4 text-primary shrink-0" />
                    <span class="text-sm font-medium text-foreground shrink-0">
                        {{ $t('projects.compare.comparing', { count: selectedEntries.length }) }}
                    </span>

                    <!-- Project chips -->
                    <div class="flex items-center gap-1.5 flex-1 flex-wrap min-w-0">
                        <span
                            v-for="entry in selectedEntries"
                            :key="entry.id"
                            class="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium max-w-[160px]"
                        >
                            <span class="truncate">{{ entry.name }}</span>
                            <button
                                class="shrink-0 rounded-full hover:bg-primary/20 transition-colors p-0.5"
                                :title="$t('common.close')"
                                @click="removeProject(entry.id)"
                            >
                                <X class="h-2.5 w-2.5" />
                            </button>
                        </span>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2 shrink-0">
                        <button
                            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            @click="clearAll"
                        >
                            {{ $t('projects.compare.clearAll') }}
                        </button>
                        <button
                            :disabled="selectedEntries.length < 2"
                            :class="[
                                selectedEntries.length >= 2
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                            ]"
                            @click="goToCompare"
                        >
                            <Columns2 class="h-3 w-3" />
                            {{ $t('projects.compare.compareButton') }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
