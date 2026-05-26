<script setup lang="ts">
import { FileJson } from 'lucide-vue-next';
import type { FilterOption } from '~/components/shared/FilterBar.vue';
import { formatCredits } from '~/lib/format';

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
const { credits, total, pending } = useCredits(projectKeyFilter);

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

const hideUnlinked = ref(false);

const allCredits = computed(() => {
    const mapped = credits.value.map(c => ({
        ...c,
        supplyFormatted: formatCredits(c.supply),
    }));
    return hideUnlinked.value ? mapped.filter(c => c.projectId) : mapped;
});

const projectFilterName = computed(() => {
    if (!projectKeyFilter.value) return null;
    return allCredits.value[0]?.projectDisplay ?? null;
});

const { searchQuery, currentPage, paginated, filtered, totalPages, pageSize, activeFilters, sortKey, sortDir, toggleSort, setFilter, clearFilters } =
    useFilteredPagination(allCredits, {
        searchFields: ['name', 'symbol', 'tokenId', 'projectDisplay', 'methodologyDisplay', 'registry'],
        pageSize: 10,
        defaultSort: { key: 'supply', dir: 'desc' },
        excludeFromQuery: ['projectKey'],
    });

const skeletonRows = computed(() => Array.from({ length: pageSize.value }, (_, i) => i));

// Derive filter options from allCredits so the dropdowns reflect whatever is
// currently visible (respects hideUnlinked toggle and projectKey filter).
const visibleFilterOptions = computed(() => ({
    types: [...new Set(allCredits.value.map(c => c.type).filter((t): t is NonNullable<typeof t> => t !== null))].sort(),
    registries: [...new Set(allCredits.value.map(c => c.registry).filter((r): r is NonNullable<typeof r> => r !== null))].sort(),
}));

const filters = computed<FilterOption[]>(() => [
    { key: 'type', label: t('credits.filters.tokenType'), options: visibleFilterOptions.value.types.map(x => ({ value: x, label: x })) },
    { key: 'registry', label: t('credits.filters.registry'), options: visibleFilterOptions.value.registries.map(r => ({ value: r, label: r })) },
]);

const typeColor: Record<string, string> = { Fungible: 'bg-stat-blue/10 text-stat-blue', 'Non-Fungible': 'bg-stat-amber/10 text-stat-amber' };
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
                <NuxtLink to="/credits" class="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {{ $t('credits.clearProjectFilter') }} ×
                </NuxtLink>
            </div>
        </div>

        <div class="px-6 pb-3">
            <FilterBar v-model="searchQuery" :filters="filters" :active-filters="activeFilters" :result-count="filtered.length" :total-count="total" :search-placeholder="$t('credits.searchPlaceholder')" @filter="setFilter" @clear="clearFilters" />
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
        </div>

        <div class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="overflow-x-auto">
                <table class="table-fixed text-sm" style="min-width: 1100px; width: 100%">
                    <colgroup>
                        <col style="width: 200px" />   <!-- token -->
                        <col style="width: 80px" />    <!-- symbol -->
                        <col style="width: 110px" />   <!-- type -->
                        <col style="width: 90px" />    <!-- supply -->
                        <col style="width: 100px" />   <!-- mint date -->
                        <col style="width: 200px" />   <!-- project -->
                        <col style="width: 170px" />   <!-- methodology -->
                        <col style="width: 120px" />   <!-- registry -->
                        <col style="width: 60px" />    <!-- raw data -->
                    </colgroup>
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <SortableHeader :label="$t('credits.columns.token')" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.symbol')" sort-key="symbol" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.type')" sort-key="type" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.supply')" sort-key="supply" align="right" :tooltip="$t('credits.supplyTooltip')" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.mintDate')" sort-key="mintDate" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.project')" sort-key="projectDisplay" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.methodology')" sort-key="methodologyDisplay" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.registry')" sort-key="registry" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <th class="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"><span class="inline-flex items-center gap-1">{{ $t('credits.columns.rawData') }} <InfoTooltip :text="$t('tooltips.viewRawData')" /></span></th>
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
                            <tr v-for="c in paginated" :key="c.tokenId" class="hover:bg-muted/30 transition-colors cursor-pointer">
                                <td class="py-3 px-4 overflow-hidden">
                                    <TruncatedText :text="c.name" class="font-medium text-foreground" />
                                    <TruncatedText :text="c.tokenId" class="text-[11px] text-muted-foreground/60 font-mono" />
                                </td>
                                <td class="py-3 px-4 overflow-hidden font-mono text-xs">
                                    <TruncatedText :text="c.symbol" />
                                </td>
                                <td class="py-3 px-4"><span :class="[c.type ? typeColor[c.type] : '', 'text-xs font-medium rounded-full px-2 py-0.5']">{{ c.type ?? '-' }}</span></td>
                                <td class="py-3 px-4 text-right tabular-nums font-medium">{{ c.supplyFormatted }}</td>
                                <td class="py-3 px-4 text-muted-foreground text-xs tabular-nums whitespace-nowrap">{{ formatDate(c.mintDate) }}</td>
                                <td class="py-3 px-4 overflow-hidden">
                                    <NuxtLink
                                        v-if="c.projectId && c.projectDisplay"
                                        :to="`/projects/${encodeURIComponent(c.projectId)}`"
                                        class="block text-muted-foreground hover:text-primary hover:underline transition-colors"
                                        @click.stop
                                    >
                                        <TruncatedText :text="c.projectDisplay" />
                                    </NuxtLink>
                                    <span v-else class="text-muted-foreground/40">-</span>
                                </td>
                                <td class="py-3 px-4 overflow-hidden text-muted-foreground">
                                    <TruncatedText v-if="c.methodologyDisplay" :text="c.methodologyDisplay" />
                                    <span v-else class="text-muted-foreground/40">-</span>
                                </td>
                                <td class="py-3 px-4 overflow-hidden text-muted-foreground">
                                    <TruncatedText :text="c.registry" fallback="-" />
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
                            <tr v-if="paginated.length === 0"><td colspan="9" class="py-12 text-center text-sm text-muted-foreground">{{ $t('credits.noMatch') }}</td></tr>
                        </template>
                    </tbody>
                </table>
                </div>
            </div>
            <Pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total-pages="totalPages" :total-items="filtered.length" />
        </div>

        <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
    </div>
</template>
