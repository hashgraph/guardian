<script setup lang="ts">
import { Users } from 'lucide-vue-next';
import type { FilterOption } from '~/components/shared/FilterBar.vue';

const { t } = useI18n();

const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref('');
const country = ref<string | undefined>(undefined);
const sortKey = ref<DeveloperSortKey | null>('projects');
const sortDir = ref<DeveloperSortDir | null>('desc');

const { developers, total, totalPages } = useDevelopers({
    page: currentPage,
    limit: pageSize,
    search: searchQuery,
    country,
    sortBy: sortKey,
    sortDir,
});

function goToProjectsForDeveloper(name: string) {
    return navigateTo({ path: '/projects', query: { developer: name } });
}

function toggleSort(key: DeveloperSortKey) {
    if (sortKey.value === key) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = key;
        sortDir.value = 'desc';
    }
    currentPage.value = 1;
}

// `status` is derived, not stored — every developer is reported Active — so it
// is applied to the page rather than sent to the API.
const STATUSES = ['Active', 'Inactive'] as const;
const status = ref<string | undefined>(undefined);

const rows = computed(() =>
    status.value ? developers.value.filter(d => d.status === status.value) : developers.value,
);

const activeFilters = computed<Record<string, string>>(() => ({
    ...(country.value ? { country: country.value } : {}),
    ...(status.value ? { status: status.value } : {}),
}));

function setFilter(key: string, value: string) {
    if (key === 'country') country.value = value || undefined;
    if (key === 'status') status.value = value || undefined;
    currentPage.value = 1;
}

function clearFilters() {
    country.value = undefined;
    status.value = undefined;
    currentPage.value = 1;
}

watch([searchQuery, pageSize], () => { currentPage.value = 1; });

const filters = computed<FilterOption[]>(() => [
    {
        key: 'status',
        label: t('developers.filters.status'),
        multiSelect: true,
        options: STATUSES.map(s => ({ value: s, label: s })),
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
            <h1 class="text-2xl font-bold text-foreground">
                {{ $t('developers.title') }}
            </h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('developers.subtitle') }}</p>
        </div>

        <div class="px-6 pb-3">
            <FilterBar
                v-model="searchQuery"
                :filters="filters"
                :active-filters="activeFilters"
                :result-count="rows.length"
                :total-count="total"
                :search-placeholder="$t('developers.searchPlaceholder')"
                @filter="setFilter"
                @clear="clearFilters"
            />
        </div>

        <div class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <SortableHeader :label="$t('developers.columns.developer')" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('developers.columns.hq')" sort-key="country" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('developers.columns.countries')" sort-key="countries" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('developers.columns.projects')" sort-key="projects" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('developers.columns.mintAmount')" sort-key="totalIssued" :tooltip="$t('developers.issuedTooltip')" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('developers.columns.retired')" sort-key="totalRetired" :tooltip="$t('developers.retiredTooltip')" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{{ $t('developers.columns.categories') }}</th>
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{{ $t('developers.columns.registries') }}</th>
                            <SortableHeader :label="$t('developers.columns.status')" sort-key="status" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr
                            v-for="d in rows"
                            :key="d.id"
                            class="hover:bg-muted/30 transition-colors"
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
                            <td class="py-3 px-4 text-right tabular-nums font-medium">
                                <button
                                    type="button"
                                    class="text-primary hover:underline cursor-pointer"
                                    :title="$t('developers.viewProjects', { name: d.name })"
                                    @click="goToProjectsForDeveloper(d.name)"
                                >{{ d.projects }}</button>
                            </td>
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
                        <tr v-if="rows.length === 0">
                            <td colspan="9" class="py-12 text-center text-sm text-muted-foreground">{{ $t('developers.noMatch') }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <Pagination
                v-model:current-page="currentPage"
                :total-pages="totalPages"
                :total-items="total"
                :page-size="pageSize"
            />
        </div>
    </div>
</template>
