<script setup lang="ts">
import { Coins, FileJson } from 'lucide-vue-next';
import type { FilterOption } from '~/components/shared/FilterBar.vue';
import { formatCredits } from '~/lib/format';

const { t } = useI18n();
const { network } = useNetwork();
const { credits, total, filterOptions } = useCredits();

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

const allCredits = computed(() => credits.value.map(c => ({
    ...c,
    supplyFormatted: formatCredits(c.supply),
})));

const { searchQuery, currentPage, paginated, filtered, totalPages, pageSize, activeFilters, sortKey, sortDir, toggleSort, setFilter, clearFilters } =
    useFilteredPagination(allCredits, {
        searchFields: ['name', 'symbol', 'tokenId', 'project', 'registry'],
        pageSize: 8,
        defaultSort: { key: 'supply', dir: 'desc' },
    });

const filters = computed<FilterOption[]>(() => [
    { key: 'type', label: t('credits.filters.tokenType'), options: filterOptions.value.types.map((x: string) => ({ value: x, label: x })) },
    { key: 'registry', label: t('credits.filters.registry'), options: filterOptions.value.registries.map((r: string) => ({ value: r, label: r })) },
]);

const typeColor: Record<string, string> = { Fungible: 'bg-stat-blue/10 text-stat-blue', 'Non-Fungible': 'bg-stat-amber/10 text-stat-amber' };
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-4">
            <h1 class="text-2xl font-bold text-foreground">{{ $t('credits.title') }}</h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('credits.subtitle') }}</p>
        </div>

        <div class="px-6 pb-3">
            <FilterBar v-model="searchQuery" :filters="filters" :active-filters="activeFilters" :result-count="filtered.length" :total-count="total" :search-placeholder="$t('credits.searchPlaceholder')" @filter="setFilter" @clear="clearFilters" />
        </div>

        <div class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <SortableHeader :label="$t('credits.columns.token')" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.symbol')" sort-key="symbol" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.type')" sort-key="type" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.supply')" sort-key="supply" align="right" :tooltip="$t('credits.supplyTooltip')" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.project')" sort-key="project" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('credits.columns.registry')" sort-key="registry" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <th class="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"><span class="inline-flex items-center gap-1">{{ $t('credits.columns.rawData') }} <InfoTooltip :text="$t('tooltips.viewRawData')" /></span></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr v-for="c in paginated" :key="c.tokenId" class="hover:bg-muted/30 transition-colors cursor-pointer">
                            <td class="py-3 px-4"><div><span class="font-medium text-foreground">{{ c.name }}</span><p class="text-[11px] text-muted-foreground/60 font-mono">{{ c.tokenId }}</p></div></td>
                            <td class="py-3 px-4 font-mono text-xs">{{ c.symbol }}</td>
                            <td class="py-3 px-4"><span :class="[typeColor[c.type], 'text-xs font-medium rounded-full px-2 py-0.5']">{{ c.type }}</span></td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">{{ c.supplyFormatted }}</td>
                            <td class="py-3 px-4 text-muted-foreground">
                                <NuxtLink
                                    v-if="c.projectId"
                                    :to="`/projects/${encodeURIComponent(c.projectId)}`"
                                    class="hover:text-primary hover:underline transition-colors"
                                    @click.stop
                                >
                                    {{ c.project }}
                                </NuxtLink>
                                <span v-else>{{ c.project }}</span>
                            </td>
                            <td class="py-3 px-4 text-muted-foreground">{{ c.registry }}</td>
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
                        <tr v-if="paginated.length === 0"><td colspan="7" class="py-12 text-center text-sm text-muted-foreground">{{ $t('credits.noMatch') }}</td></tr>
                    </tbody>
                </table>
            </div>
            <Pagination v-model:current-page="currentPage" :total-pages="totalPages" :total-items="filtered.length" :page-size="pageSize" />
        </div>

        <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
    </div>
</template>
