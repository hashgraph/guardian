<script setup lang="ts">
import { FileJson, Sparkles, Download, Loader2, Save } from 'lucide-vue-next';
import type { FilterOption } from '~/components/shared/FilterBar.vue';
import { formatCredits } from '~/lib/format';
import { naturalCompare, decodeMultiValue } from '~/lib/utils';
import { downloadCsv, csvDateStamp, buildCreditCsvRows } from '~/lib/csv-export';
import type { SavedSearchCriteria } from '~/composables/useSavedSearches';
import SavedSearchesRow from '~/components/saved-search/SavedSearchesRow.vue';

const { t, locale } = useI18n();
const { network } = useNetwork();

const localeTag = computed(() => (locale.value === 'es' ? 'es-ES' : 'en-US'));
const formatDate = (d: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString(localeTag.value);
};

const route = useRoute();
const projectKeyFilter = computed(() => route.query.projectKey as string | undefined);
const methodologyIdFilter = computed(() => route.query.methodologyId as string | undefined);
const registryDidFilter = computed(() => route.query.registryDid as string | undefined);
const sdgFilter = computed(() => {
    const raw = route.query.sdg || route.query.sdgs;
    return typeof raw === 'string' ? raw : undefined;
});

// Project keys matching the active SDG, used to scope the issuance query.
const sdgProjectKeys = ref<string[] | undefined>(undefined);

if (import.meta.client) {
    const runtimeConfig = useRuntimeConfig();
    const idsBaseURL = runtimeConfig.public.apiBaseUrl as string;

    watch(
        [sdgFilter, network],
        async () => {
            const sdgNum = parseInt(sdgFilter.value ?? '', 10);
            if (!sdgFilter.value || isNaN(sdgNum)) {
                sdgProjectKeys.value = undefined;
                return;
            }
            try {
                const res = await $fetch<{ items: Array<{ id: string; projectKey: string | null }> }>(
                    `/api/v1/${network.value}/projects/ids`,
                    { baseURL: idsBaseURL, query: { sdgs: String(sdgNum) } },
                );
                sdgProjectKeys.value = (res.items ?? [])
                    .map(i => i.projectKey || i.id)
                    .filter(Boolean);
            } catch {
                sdgProjectKeys.value = undefined;
            }
        },
        { immediate: true },
    );
}

const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref('');
const sortKey = ref<CreditSortKey | null>('mintDate');
const sortDir = ref<CreditSortDir | null>('desc');

const hideUnlinked = ref(route.query.linkedOnly === 'true');

// Column filters in API terms. FilterBar emits range types as "from|to".
const activeFilters = ref<Record<string, string>>({});

const apiFilters = computed<Record<string, string | string[]>>(() => {
    const f: Record<string, string | string[]> = {};
    const af = activeFilters.value;

    if (af.type) {
        const picked = decodeMultiValue(af.type);
        // The API takes a single token type; selecting both is the same as no filter.
        if (picked.length === 1) f.type = picked[0];
    }
    if (af.registry) f.registry = af.registry;

    if (af.supply) {
        const [min, max] = af.supply.split('|');
        if (min) f.supplyMin = min;
        if (max) f.supplyMax = max;
    }
    if (af.mintDate) {
        const [from, to] = af.mintDate.split('|');
        if (from) f.mintDateFrom = from;
        if (to) f.mintDateTo = to;
    }
    if (hideUnlinked.value) f.linkedOnly = 'true';

    return f;
});

const { credits, total, totalPages, pending, filters: creditFilters } = useCredits({
    page: currentPage,
    limit: pageSize,
    search: searchQuery,
    sortBy: sortKey,
    sortDir,
    filters: apiFilters,
    projectKey: projectKeyFilter,
    methodologyId: methodologyIdFilter,
    registryDid: registryDidFilter,
    projectKeys: sdgProjectKeys,
});

const { stats: summaryStats } = useCreditStats(searchQuery, creditFilters);

function toggleSort(key: CreditSortKey) {
    if (sortKey.value === key) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = key;
        sortDir.value = 'desc';
    }
    currentPage.value = 1;
}

function setFilter(key: string, value: string) {
    if (value === 'all' || !value) delete activeFilters.value[key];
    else activeFilters.value = { ...activeFilters.value, [key]: value };
    currentPage.value = 1;
}

function clearFilters() {
    activeFilters.value = {};
    currentPage.value = 1;
}

function applyPreset(preset: Record<string, string>) {
    activeFilters.value = { ...preset };
    currentPage.value = 1;
}

watch([searchQuery, pageSize, hideUnlinked], () => { currentPage.value = 1; });

const config = useRuntimeConfig();
const apiBaseURL = import.meta.server
    ? (config.apiBaseUrl as string)
    : (config.public.apiBaseUrl as string);

const vcViewerOpen = ref(false);
const vcViewerTitle = ref('');
const vcViewerData = ref<Record<string, any> | null>(null);

async function viewVc(c: any) {
    vcViewerTitle.value = c.name ?? c.tokenId ?? 'Credit';
    vcViewerOpen.value = true;
    vcViewerData.value = null;
    try {
        vcViewerData.value = await $fetch<Record<string, any>>(
            `/api/v1/${network.value}/credits/${encodeURIComponent(c.tokenId)}/raw`,
            { baseURL: apiBaseURL },
        );
    } catch (err) {
        vcViewerData.value = {
            error: 'Failed to load raw data',
            message: err instanceof Error ? err.message : String(err),
            tokenId: c.tokenId,
        };
    }
}

const rows = computed(() =>
    credits.value.map(c => ({
        ...c,
        supplyFormatted: formatCredits(c.supply),
    })),
);

const projectFilterName = computed(() => {
    if (!projectKeyFilter.value) return null;
    return rows.value[0]?.projectDisplay ?? null;
});

const methodologyFilterName = computed(() => {
    if (!methodologyIdFilter.value) return null;
    return rows.value[0]?.methodologyDisplay ?? null;
});

const registryFilterName = computed(() => {
    if (!registryDidFilter.value) return null;
    return rows.value[0]?.registry ?? null;
});

const skeletonRows = computed(() => Array.from({ length: pageSize.value }, (_, i) => i));

const TOKEN_TYPES = ['Fungible', 'Non-Fungible'];

const registryOptions = ref<string[]>([]);
if (import.meta.client) {
    const optCfg = useRuntimeConfig();
    const optBaseURL = optCfg.public.apiBaseUrl as string;
    watch(network, async () => {
        try {
            registryOptions.value = await $fetch<string[]>(
                `/api/v1/${network.value}/registries/options`,
                { baseURL: optBaseURL },
            );
        } catch {
            registryOptions.value = [];
        }
    }, { immediate: true });
}

const filters = computed<FilterOption[]>(() => [
    { key: 'type', label: t('credits.filters.tokenType'), multiSelect: true, options: TOKEN_TYPES.map(x => ({ value: x, label: t('credits.tokenTypes.' + x) })) },
    { key: 'registry', label: t('credits.filters.registry'), multiSelect: true, searchable: true, options: [...registryOptions.value].sort(naturalCompare).map(r => ({ value: r, label: r })) },
    { key: 'supply', label: t('credits.filters.supply'), type: 'numrange', options: [] },
    { key: 'mintDate', label: t('credits.filters.mintDate'), type: 'daterange', options: [] },
]);

// Human-friendly rendering of a filter value for the Save Search dialog's
// "Active Filters" summary. Range filters (supply, mintDate) are stored
// pipe-joined ("min|max") per useFilteredPagination's convention — shown as "A – B".
function formatFilterValue(value: string, key?: string): string {
    if (key === 'type') {
        const picked = decodeMultiValue(value);
        return picked.map(v => t('credits.tokenTypes.' + v) || v).join(', ');
    }
    if (!value.includes('|')) return value;
    const [from, to] = value.split('|');
    if (from && to) return `${from} – ${to}`;
    return from || to || value;
}

const filterSummary = computed(() => {
    const items: { label: string; value: string }[] = [];
    if (searchQuery.value.trim()) {
        items.push({ label: t('common.search'), value: searchQuery.value.trim() });
    }
    items.push(
        ...filters.value
            .filter(f => activeFilters.value[f.key] && activeFilters.value[f.key] !== 'all')
            .map(f => ({ label: f.label, value: formatFilterValue(activeFilters.value[f.key], f.key) })),
    );
    return items;
});

// applyPreset()'s sort.key is typed against this page's specific row union;
// a saved search's criteria.sort.key is a plain string (page-agnostic). Safe
// at runtime — it was produced by this same page's own sortKey when saved.
function applySavedSearch(criteria: SavedSearchCriteria) {
    applyPreset(criteria as any);
}

const { isAuthenticated } = useAuth();
const savedSearchesRef = ref<InstanceType<typeof SavedSearchesRow> | null>(null);

const typeColor: Record<string, string> = { Fungible: 'bg-stat-blue/10 text-stat-blue', 'Non-Fungible': 'bg-stat-amber/10 text-stat-amber' };

const downloading = ref(false);
const { dialogOpen: exportLimitOpen, pendingTotal: exportLimitTotal, confirmIfCapped, onConfirm: confirmExportLimit, onCancel: cancelExportLimit } = useExportLimit();

async function downloadCredits() {
    if (downloading.value) return;
    downloading.value = true;
    try {
        const { fetchCappedRows } = useApiDownload();
        const af = activeFilters.value;
        const query: Record<string, string | number> = {};
        const search = searchQuery.value?.trim();
        if (search) query.search = search;
        // type: API only handles single value; multi-select applied client-side below
        const types = decodeMultiValue(af.type);
        if (types.length === 1) query.type = types[0];
        if (af.registry) query.registry = af.registry;
        if (projectKeyFilter.value) query.projectKey = projectKeyFilter.value;
        if (methodologyIdFilter.value) query.methodologyId = methodologyIdFilter.value;
        if (registryDidFilter.value) query.registryDid = registryDidFilter.value;

        const { data: capped, total } = await fetchCappedRows(`/api/v1/${network.value}/credits`, query);
        if (!(await confirmIfCapped(total))) return;
        let allData = capped;

        // Apply client-side-only hideUnlinked filter
        if (hideUnlinked.value) allData = allData.filter(c => c.projectId);

        // type multi-select (backend only handles single value; OR match across selected types)
        if (types.length > 1) {
            allData = allData.filter(c => types.includes(c.type ?? ''));
        }
        // supply range stored as "min|max"
        if (af.supply) {
            const [min, max] = af.supply.split('|');
            if (min) allData = allData.filter(c => (c.supply ?? 0) >= parseFloat(min));
            if (max) allData = allData.filter(c => (c.supply ?? 0) <= parseFloat(max));
        }
        // mintDate range stored as "from|to" (YYYY-MM-DD)
        if (af.mintDate) {
            const [from, to] = af.mintDate.split('|');
            if (from) allData = allData.filter(c => (c.mintDate ?? '') >= from);
            if (to) allData = allData.filter(c => (c.mintDate ?? '') <= to);
        }

        if (sortKey.value && sortDir.value) {
            // Display keys don't exist on raw DTO — map them to the underlying field
            const DISPLAY_KEY_MAP: Record<string, string> = { methodologyDisplay: 'methodology', projectDisplay: 'project' };
            const key = DISPLAY_KEY_MAP[String(sortKey.value)] ?? String(sortKey.value);
            const dir = sortDir.value === 'asc' ? 1 : -1;
            allData = [...allData].sort((a, b) => {
                const aVal = (a as any)[key];
                const bVal = (b as any)[key];
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
                return naturalCompare(String(aVal), String(bVal)) * dir;
            });
        }

        const rows = buildCreditCsvRows(allData, network.value);
        downloadCsv(`issuances_export_${csvDateStamp()}.csv`, rows);
    } finally {
        downloading.value = false;
    }
}
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-4">
            <h1 class="text-2xl font-bold text-foreground">{{ $t('credits.title') }}</h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('credits.subtitle') }}</p>
        </div>

        <div v-if="projectKeyFilter" class="px-6 pb-2">
            <div class="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-sm">
                <span class="text-muted-foreground">{{ $t('credits.filteredByProject') }}</span>
                <span class="font-medium text-foreground">{{ projectFilterName ?? $t('credits.unknownProject') }}</span>
                <AppLink to="/credits" class="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {{ $t('credits.clearProjectFilter') }} ×
                </AppLink>
            </div>
        </div>

        <div v-if="methodologyIdFilter" class="px-6 pb-2">
            <div class="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-sm">
                <span class="text-muted-foreground">{{ $t('credits.filteredByMethodology') }}</span>
                <span class="font-medium text-foreground">{{ methodologyFilterName ?? $t('credits.unknownMethodology') }}</span>
                <AppLink to="/credits" class="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {{ $t('credits.clearMethodologyFilter') }} ×
                </AppLink>
            </div>
        </div>

        <div v-if="registryDidFilter" class="px-6 pb-2">
            <div class="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-sm">
                <span class="text-muted-foreground">{{ $t('credits.filteredByRegistry') }}</span>
                <span v-if="!pending" class="font-medium text-foreground">{{ registryFilterName ?? $t('credits.unknownRegistry') }}</span>
                <AppLink to="/credits" class="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {{ $t('credits.clearRegistryFilter') }} ×
                </AppLink>
            </div>
        </div>

        <div v-if="sdgFilter" class="px-6 pb-2">
            <div class="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-sm">
                <span class="text-muted-foreground">{{ $t('credits.filteredBySdg', { sdg: sdgFilter }) }}</span>
                <AppLink to="/credits" class="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {{ $t('credits.clearSdgFilter') }} ×
                </AppLink>
            </div>
        </div>

        <div class="px-6 pb-3">
            <FilterBar v-model="searchQuery" :filters="filters" :active-filters="activeFilters" :result-count="total" :total-count="total" :search-placeholder="$t('credits.searchPlaceholder')" @filter="setFilter" @clear="clearFilters">
                <template #before-clear>
                    <InfoTooltip
                        v-if="isAuthenticated"
                        v-show="savedSearchesRef?.hasActiveFilters"
                        :text="savedSearchesRef?.atLimit ? $t('savedSearch.limitReachedTooltip', { max: savedSearchesRef?.limit }) : ''"
                    >
                        <button
                            :class="[
                                'inline-flex items-center gap-1 rounded-md py-1.5 text-xs transition-colors',
                                savedSearchesRef?.atLimit
                                    ? 'text-muted-foreground/50 cursor-not-allowed'
                                    : 'text-muted-foreground hover:text-primary',
                            ]"
                            @click="!savedSearchesRef?.atLimit && savedSearchesRef?.open()"
                        >
                            <Save class="h-3 w-3" />
                            {{ $t('savedSearch.saveButton') }}
                        </button>
                    </InfoTooltip>
                </template>
            </FilterBar>
            <label class="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer">
                <input
                    type="checkbox"
                    class="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                    :checked="hideUnlinked"
                    @change="(e) => { hideUnlinked = (e.target as HTMLInputElement).checked; currentPage = 1; }"
                />
                {{ $t('credits.filters.hideUnlinked') }}
                <InfoTooltip :text="$t('credits.tooltips.hideUnlinked')" />
            </label>

            <!-- Preset Templates -->
            <div class="flex items-center gap-2 mt-2.5 flex-wrap">
                <span class="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Sparkles class="h-3 w-3" /> {{ $t('credits.quickFilters') }}
                </span>

                <SavedSearchesRow
                    ref="savedSearchesRef"
                    section="issuances"
                    :search-query="searchQuery"
                    :active-filters="activeFilters"
                    :sort-key="sortKey as string | null"
                    :sort-dir="sortDir"
                    :summary="filterSummary"
                    @apply="applySavedSearch"
                />

                <button
                    :disabled="downloading"
                    class="ml-auto inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="downloadCredits"
                >
                    <Loader2 v-if="downloading" class="h-3.5 w-3.5 animate-spin" />
                    <Download v-else class="h-3.5 w-3.5" />
                    {{ $t('credits.downloadData') }}
                </button>
            </div>
        </div>

        <!-- Summary Stats -->
        <div v-if="total > 0" class="px-6 pb-3">
            <div class="flex items-center gap-4 rounded-lg bg-muted/50 px-4 py-2.5 text-xs">
                <span class="font-medium text-foreground">{{ $t("credits.issuancesFound", { count: total }) }}</span>
                <span class="text-muted-foreground">&middot;</span>
                <span class="text-muted-foreground">{{ $t('credits.totalSupply') }} <strong class="text-foreground">{{ formatCredits(summaryStats.totalSupply) }}</strong></span>
                <span class="text-muted-foreground">&middot;</span>
                <span class="text-muted-foreground">{{ $t('credits.registries') }} <strong class="text-foreground">{{ summaryStats.uniqueRegistries }}</strong></span>
                <span class="text-muted-foreground">&middot;</span>
                <span class="text-muted-foreground">{{ $t('credits.projects') }} <strong class="text-foreground">{{ summaryStats.uniqueProjects }}</strong></span>
            </div>
        </div>

        <div class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="overflow-x-auto">
                <table class="text-sm w-full">
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <SortableHeader :label="$t('credits.columns.token')" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.symbol')" sort-key="symbol" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" class="w-px" />
                            <SortableHeader :label="$t('credits.columns.type')" sort-key="type" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" class="w-px" />
                            <SortableHeader :label="$t('credits.columns.supply')" sort-key="supply" :tooltip="$t('credits.supplyTooltip')" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" class="w-px" />
                            <SortableHeader :label="$t('credits.columns.mintDate')" sort-key="mintDate" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" class="w-px" />
                            <SortableHeader :label="$t('credits.columns.project')" sort-key="projectDisplay" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.methodology')" sort-key="methodologyDisplay" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.registry')" sort-key="registry" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" class="w-px" />
                            <th class="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"><span class="inline-flex items-center gap-0.5">{{ $t('credits.columns.rawData') }} <InfoTooltip :text="$t('tooltips.viewRawData')" /></span></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <!-- Loading skeleton -->
                        <template v-if="pending && credits.length === 0">
                            <tr v-for="i in skeletonRows" :key="`sk-${i}`">
                                <td v-for="col in 9" :key="col" class="py-3 px-4">
                                    <Skeleton class="h-4 w-full max-w-[120px]" />
                                </td>
                            </tr>
                        </template>

                        <!-- Data rows -->
                        <template v-else>
                            <tr v-for="c in rows" :key="`${c.tokenId}|${c.projectId ?? ''}|${c.mintConsensusTimestamp ?? ''}`" class="hover:bg-muted/30 transition-colors cursor-pointer" @click="navigateTo(c.projectId ? `/credits/${encodeURIComponent(c.tokenId)}?projectId=${encodeURIComponent(c.projectId)}` : `/credits/${encodeURIComponent(c.tokenId)}`)">
                                <td class="py-3 px-4 whitespace-nowrap">
                                    <div class="font-medium text-foreground">{{ c.name ?? '-' }}</div>
                                    <div class="text-[11px] text-muted-foreground/60 font-mono">{{ c.tokenId ?? '-' }}</div>
                                </td>
                                <td class="py-3 px-4 font-mono text-xs whitespace-nowrap">{{ c.symbol ?? '-' }}</td>
                                <td class="py-3 px-4 whitespace-nowrap"><span :class="[c.type ? typeColor[c.type] : '', 'text-xs font-medium rounded-full px-2 py-0.5']">{{ c.type ? $t('credits.tokenTypes.' + c.type) : '-' }}</span></td>
                                <td class="py-3 px-4 text-right tabular-nums font-medium whitespace-nowrap">{{ c.supplyFormatted }}</td>
                                <td class="py-3 px-4 text-muted-foreground text-xs tabular-nums whitespace-nowrap">{{ formatDate(c.mintDate) }}</td>
                                <td class="py-3 px-4 max-w-[200px]">
                                    <AppLink
                                        v-if="c.projectId && c.projectDisplay"
                                        :to="`/projects/${encodeURIComponent(c.projectId)}`"
                                        class="block text-muted-foreground hover:text-primary hover:underline transition-colors"
                                        @click.stop
                                    >
                                        <TruncatedText :text="c.projectDisplay" />
                                    </AppLink>
                                    <span v-else class="text-muted-foreground/40">-</span>
                                </td>
                                <td class="py-3 px-4 max-w-[180px]">
                                    <AppLink
                                        v-if="c.methodologyId && c.methodologyDisplay"
                                        :to="`/methodologies/${encodeURIComponent(c.methodologyId)}`"
                                        class="text-muted-foreground hover:text-primary hover:underline transition-colors"
                                        @click.stop
                                    >
                                        <TruncatedText :text="c.methodologyDisplay" />
                                    </AppLink>
                                    <span v-else class="text-muted-foreground/40">-</span>
                                </td>
                                <td class="py-3 px-4 whitespace-nowrap">
                                    <AppLink
                                        v-if="c.registryDid && c.registry"
                                        :to="`/registries/${encodeURIComponent(c.registryDid)}`"
                                        class="text-muted-foreground hover:text-primary hover:underline transition-colors"
                                        :title="c.registryDid"
                                        @click.stop
                                    >
                                        {{ c.registry }}
                                    </AppLink>
                                    <span v-else class="text-muted-foreground">{{ c.registry ?? '-' }}</span>
                                </td>
                                <td class="py-3 px-3 text-center">
                                    <button
                                        class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                        :title="$t('common.viewRawData')"
                                        @click.stop="viewVc(c)"
                                    >
                                        <FileJson class="h-3.5 w-3.5" />
                                    </button>
                                </td>
                            </tr>
                            <tr v-if="rows.length === 0"><td colspan="9" class="py-12 text-center text-sm text-muted-foreground">{{ $t('credits.noMatch') }}</td></tr>
                        </template>
                    </tbody>
                </table>
                </div>
            </div>
            <Pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total-pages="totalPages" :total-items="total" />
        </div>

        <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
        <ExportLimitDialog :open="exportLimitOpen" :total="exportLimitTotal" @confirm="confirmExportLimit" @cancel="cancelExportLimit" />
    </div>
</template>
