<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next';
import type { FilterOption } from '~/components/shared/FilterBar.vue';

const { t } = useI18n();
const { methodologies, total, filterOptions } = useMethodologies();

const allMethodologies = computed(() => methodologies.value);

const { searchQuery, currentPage, paginated, filtered, totalPages, pageSize, activeFilters, sortKey, sortDir, toggleSort, setFilter, clearFilters } =
    useFilteredPagination(allMethodologies, {
        searchFields: ['name', 'registry', 'category'],
        pageSize: 8,
        defaultSort: { key: 'projects', dir: 'desc' },
    });

const filters = computed<FilterOption[]>(() => [
    {
        key: 'registry',
        label: t('methodologies.filters.registry'),
        options: filterOptions.value.registries.map((r: string) => ({ value: r, label: r })),
    },
    {
        key: 'category',
        label: t('methodologies.filters.category'),
        options: filterOptions.value.categories.map((c: string) => ({ value: c, label: c })),
    },
]);

const categoryColor: Record<string, string> = {
    Forestry: 'bg-stat-green/10 text-stat-green',
    'Renewable Energy': 'bg-stat-blue/10 text-stat-blue',
    'Energy Efficiency': 'bg-stat-amber/10 text-stat-amber',
    'Blue Carbon': 'bg-chart-2/10 text-chart-2',
    Agriculture: 'bg-chart-3/10 text-chart-3',
    Water: 'bg-chart-5/10 text-chart-5',
    Waste: 'bg-stat-rose/10 text-stat-rose',
};
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-4">
            <h1 class="text-2xl font-bold text-foreground">{{ $t('methodologies.title') }}</h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('methodologies.subtitle') }}</p>
        </div>

        <div class="px-6 pb-3">
            <FilterBar
                v-model="searchQuery"
                :filters="filters"
                :active-filters="activeFilters"
                :result-count="filtered.length"
                :total-count="total"
                :search-placeholder="$t('methodologies.searchPlaceholder')"
                @filter="setFilter"
                @clear="clearFilters"
            />
        </div>

        <div class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <SortableHeader :label="$t('methodologies.columns.methodology')" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('methodologies.columns.registry')" sort-key="registry" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('methodologies.columns.category')" sort-key="category" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('methodologies.columns.projects')" sort-key="projects" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('methodologies.columns.issuances')" sort-key="credits" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('methodologies.columns.schemas')" sort-key="schemas" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr v-for="m in paginated" :key="m.id" class="hover:bg-muted/30 transition-colors cursor-pointer">
                            <td class="py-3 px-4">
                                <span class="font-medium text-foreground hover:text-primary transition-colors">{{ m.name }}</span>
                            </td>
                            <td class="py-3 px-4 text-muted-foreground">{{ m.registry }}</td>
                            <td class="py-3 px-4">
                                <span :class="[categoryColor[m.category] || 'bg-muted text-muted-foreground', 'text-xs font-medium rounded-full px-2 py-0.5']">
                                    {{ m.category }}
                                </span>
                            </td>
                            <td class="py-3 px-4 text-right tabular-nums">{{ m.projects }}</td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">{{ m.credits }}</td>
                            <td class="py-3 px-4 text-right tabular-nums">{{ m.schemas }}</td>
                        </tr>
                        <tr v-if="paginated.length === 0">
                            <td colspan="6" class="py-12 text-center text-sm text-muted-foreground">{{ $t('methodologies.noMatch') }}</td>
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
    </div>
</template>
