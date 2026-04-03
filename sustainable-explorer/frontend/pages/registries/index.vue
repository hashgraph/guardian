<script setup lang="ts">
import { Building2 } from 'lucide-vue-next';
import type { FilterOption } from '~/components/shared/FilterBar.vue';

const { registries, total, filterOptions } = useRegistries();

const allRegistries = computed(() => registries.value);

const { searchQuery, currentPage, paginated, filtered, totalPages, pageSize, activeFilters, sortKey, sortDir, toggleSort, setFilter, clearFilters } =
    useFilteredPagination(allRegistries, {
        searchFields: ['name', 'did', 'network'],
        pageSize: 8,
        defaultSort: { key: 'projects', dir: 'desc' },
    });

const filters = computed<FilterOption[]>(() => [
    {
        key: 'status',
        label: 'Status',
        options: filterOptions.value.statuses.map(s => ({ value: s, label: s })),
    },
    {
        key: 'network',
        label: 'Network',
        options: filterOptions.value.networks.map(n => ({ value: n, label: n })),
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
            <h1 class="text-2xl font-bold text-foreground">Registries</h1>
            <p class="text-sm text-muted-foreground mt-1">Standard Registries operating on the Guardian network</p>
        </div>

        <div class="px-6 pb-3">
            <FilterBar
                v-model="searchQuery"
                :filters="filters"
                :active-filters="activeFilters"
                :result-count="filtered.length"
                :total-count="total"
                search-placeholder="Search registries..."
                @filter="setFilter"
                @clear="clearFilters"
            />
        </div>

        <div class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <SortableHeader label="Registry" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">DID</th>
                            <SortableHeader label="Policies" sort-key="policies" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader label="Projects" sort-key="projects" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader label="Users" sort-key="users" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader label="Issuances" sort-key="credits" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader label="Status" sort-key="status" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader label="Network" sort-key="network" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr
                            v-for="r in paginated"
                            :key="r.id"
                            class="hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                            <td class="py-3 px-4">
                                <div class="flex items-center gap-2.5">
                                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <Building2 class="h-4 w-4 text-primary" />
                                    </div>
                                    <span class="font-medium text-foreground hover:text-primary transition-colors">{{ r.name }}</span>
                                </div>
                            </td>
                            <td class="py-3 px-4">
                                <span class="text-[11px] text-muted-foreground/60 font-mono truncate block max-w-[160px]">{{ r.did }}</span>
                            </td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">{{ r.policies }}</td>
                            <td class="py-3 px-4 text-right tabular-nums">{{ r.projects }}</td>
                            <td class="py-3 px-4 text-right tabular-nums">{{ r.users }}</td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">{{ r.credits }}</td>
                            <td class="py-3 px-4">
                                <span :class="[statusColor[r.status], 'text-xs font-medium rounded-full px-2 py-0.5']">
                                    {{ r.status }}
                                </span>
                            </td>
                            <td class="py-3 px-4">
                                <span class="text-xs bg-muted rounded px-1.5 py-0.5">{{ r.network }}</span>
                            </td>
                        </tr>
                        <tr v-if="paginated.length === 0">
                            <td colspan="8" class="py-12 text-center text-sm text-muted-foreground">No registries match your filters</td>
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
