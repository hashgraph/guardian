<script setup lang="ts">
import { Users, Globe, FolderKanban } from 'lucide-vue-next';
import type { FilterOption } from '~/components/shared/FilterBar.vue';

const { developers, total, filterOptions } = useDevelopers();

const allDevelopers = computed(() => developers.value);

const { searchQuery, currentPage, paginated, filtered, totalPages, pageSize, activeFilters, sortKey, sortDir, toggleSort, setFilter, clearFilters } =
    useFilteredPagination(allDevelopers, {
        searchFields: ['name', 'country'],
        pageSize: 10,
        defaultSort: { key: 'projects', dir: 'desc' },
    });

const filters = computed<FilterOption[]>(() => [
    {
        key: 'status',
        label: 'Status',
        options: filterOptions.value.statuses.map(s => ({ value: s, label: s })),
    },
]);

const statusColor: Record<string, string> = {
    Active: 'bg-stat-green/10 text-stat-green',
    Inactive: 'bg-muted text-muted-foreground',
};
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-4">
            <h1 class="text-2xl font-bold text-foreground">Project Developers</h1>
            <p class="text-sm text-muted-foreground mt-1">Organizations developing and managing carbon offset projects</p>
        </div>

        <div class="px-6 pb-3">
            <FilterBar
                v-model="searchQuery"
                :filters="filters"
                :active-filters="activeFilters"
                :result-count="filtered.length"
                :total-count="total"
                search-placeholder="Search developers, categories, registries..."
                @filter="setFilter"
                @clear="clearFilters"
            />
        </div>

        <div class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <SortableHeader label="Developer" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader label="HQ" sort-key="country" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader label="Countries" sort-key="countries" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader label="Projects" sort-key="projects" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader label="Issued" sort-key="totalIssued" align="right" tooltip="Total issuances across all projects by this developer." :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader label="Retired" sort-key="totalRetired" align="right" tooltip="Issuances permanently retired (used for offsetting). Retired issuances cannot be traded or reused." :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Categories</th>
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Registries</th>
                            <SortableHeader label="Status" sort-key="status" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr
                            v-for="d in paginated"
                            :key="d.id"
                            class="hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                            <td class="py-3 px-4">
                                <div class="flex items-center gap-2.5">
                                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stat-blue/10">
                                        <Users class="h-4 w-4 text-stat-blue" />
                                    </div>
                                    <span class="font-medium text-foreground hover:text-primary transition-colors">{{ d.name }}</span>
                                </div>
                            </td>
                            <td class="py-3 px-4 text-muted-foreground whitespace-nowrap">{{ d.country }}</td>
                            <td class="py-3 px-4 text-right tabular-nums">{{ d.countries }}</td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">{{ d.projects }}</td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">{{ d.totalIssued }}</td>
                            <td class="py-3 px-4 text-right tabular-nums text-muted-foreground">{{ d.totalRetired }}</td>
                            <td class="py-3 px-4">
                                <div class="flex flex-wrap gap-1 max-w-[200px]">
                                    <span
                                        v-for="cat in d.categories.slice(0, 2)"
                                        :key="cat"
                                        class="text-[10px] bg-muted rounded px-1.5 py-0.5 whitespace-nowrap"
                                    >{{ cat }}</span>
                                    <span
                                        v-if="d.categories.length > 2"
                                        class="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground"
                                    >+{{ d.categories.length - 2 }}</span>
                                </div>
                            </td>
                            <td class="py-3 px-4">
                                <div class="flex flex-wrap gap-1">
                                    <span
                                        v-for="reg in d.registries.slice(0, 2)"
                                        :key="reg"
                                        class="text-[10px] bg-primary/8 text-primary rounded px-1.5 py-0.5 whitespace-nowrap"
                                    >{{ reg }}</span>
                                    <span
                                        v-if="d.registries.length > 2"
                                        class="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground"
                                    >+{{ d.registries.length - 2 }}</span>
                                </div>
                            </td>
                            <td class="py-3 px-4">
                                <span :class="[statusColor[d.status], 'text-xs font-medium rounded-full px-2 py-0.5']">
                                    {{ d.status }}
                                </span>
                            </td>
                        </tr>
                        <tr v-if="paginated.length === 0">
                            <td colspan="9" class="py-12 text-center text-sm text-muted-foreground">No developers match your filters</td>
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
