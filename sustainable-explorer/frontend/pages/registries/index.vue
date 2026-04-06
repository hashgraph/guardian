<script setup lang="ts">
import { Building2, Copy, Check } from 'lucide-vue-next';
import type { FilterOption } from '~/components/shared/FilterBar.vue';
import type { RegistrySortKey, RegistrySortDir } from '~/composables/api/useRegistriesApi';
import type { SortDirection } from '~/composables/useFilteredPagination';


// Network from the topbar network selector
const { network } = useNetwork();

// Column key -> API sortBy key mapping
type ColumnKey = 'name' | 'geography' | 'law' | 'policies' | 'projects' | 'users' | 'credits' | 'tags' | 'createdAt';

const columnToApiSort: Record<ColumnKey, RegistrySortKey | null> = {
    name: 'displayName',
    geography: 'geography',
    law: 'law',
    policies: 'policies',
    projects: 'projects',
    users: null, // no server sort for users (placeholder column)
    credits: 'issuances',
    tags: 'tags',
    createdAt: 'sourceTimestamp',
};

// Reactive query state
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(8);
const sortKey = ref<ColumnKey | null>('projects');
const sortDir = ref<SortDirection>('desc');

const apiSortBy = computed<RegistrySortKey | null>(() =>
    sortKey.value ? columnToApiSort[sortKey.value] : null,
);
const apiSortDir = computed<RegistrySortDir | null>(() =>
    sortDir.value === 'asc' || sortDir.value === 'desc' ? sortDir.value : null,
);
const apiNetwork = computed(() => network.value);

const { data, pending, error, refresh } = useRegistriesApi({
    page: currentPage,
    limit: pageSize,
    search: searchQuery,
    network: apiNetwork,
    sortBy: apiSortBy,
    sortDir: apiSortDir,
});

const registries = computed<any[]>(() => data.value?.data ?? []);
const meta = computed(
    () => data.value?.meta ?? { page: 1, limit: pageSize.value, total: 0, totalPages: 1 },
);
const totalPages = computed(() => meta.value.totalPages || 1);
const totalCount = computed(() => meta.value.total || 0);

// Reset to page 1 when search or network changes
watch([searchQuery, apiNetwork], () => {
    currentPage.value = 1;
});

// Sort click handler mirroring useFilteredPagination's toggle logic
function toggleSort(key: string) {
    const col = key as ColumnKey;
    if (sortKey.value === col) {
        if (sortDir.value === 'asc') {
            sortDir.value = 'desc';
        } else if (sortDir.value === 'desc') {
            sortKey.value = null;
            sortDir.value = null;
        } else {
            sortDir.value = 'asc';
        }
    } else {
        sortKey.value = col;
        sortDir.value = 'asc';
    }
    currentPage.value = 1;
}

const copiedDid = ref<string | null>(null);
const copyDid = async (did: string) => {
    try {
        await navigator.clipboard.writeText(did);
        copiedDid.value = did;
        setTimeout(() => {
            if (copiedDid.value === did) copiedDid.value = null;
        }, 2000);
    } catch (e) {
        // ignore clipboard errors
    }
};

const filters = computed<FilterOption[]>(() => []);
const activeFilters = ref<Record<string, string>>({});

function setFilter(_key: string, _value: string) {
    // No additional dropdown filters wired yet
}
function clearFilters() {
    searchQuery.value = '';
    currentPage.value = 1;
}

const formatDate = (d: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString();
};

// Hedera consensus timestamps are "seconds.nanoseconds" strings.
// Convert to a JS Date (millisecond precision).
const formatHederaTimestamp = (ts: string | null) => {
    if (!ts) return '—';
    const seconds = parseFloat(ts);
    if (isNaN(seconds)) return ts;
    return new Date(seconds * 1000).toLocaleDateString();
};

const skeletonRows = computed(() => Array.from({ length: pageSize.value }, (_, i) => i));
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
                :result-count="registries.length"
                :total-count="totalCount"
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
                            <SortableHeader label="Registry" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">DID</th>
                            <SortableHeader label="Geography" sort-key="geography" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader label="Law" sort-key="law" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader label="Policies" sort-key="policies" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader label="Projects" sort-key="projects" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader label="Users" sort-key="users" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader label="Issuances" sort-key="credits" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader label="Tags" sort-key="tags" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader label="Created" sort-key="createdAt" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <!-- Loading skeleton -->
                        <template v-if="pending && registries.length === 0">
                            <tr v-for="i in skeletonRows" :key="`sk-${i}`">
                                <td v-for="col in 10" :key="col" class="py-3 px-4">
                                    <Skeleton class="h-4 w-full max-w-[120px]" />
                                </td>
                            </tr>
                        </template>

                        <!-- Error state -->
                        <tr v-else-if="error">
                            <td colspan="10" class="py-12 text-center text-sm text-destructive">
                                Failed to load registries. <button class="underline" @click="() => refresh()">Retry</button>
                            </td>
                        </tr>

                        <!-- Data rows -->
                        <template v-else>
                            <tr
                                v-for="r in registries"
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
                                    <div class="group flex items-center gap-2">
                                        <code class="text-[11px] text-muted-foreground/60 font-mono truncate max-w-[160px]">{{ r.did }}</code>
                                        <button
                                            class="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            title="Copy DID"
                                            @click.stop="copyDid(r.did)"
                                        >
                                            <Check v-if="copiedDid === r.did" class="h-3.5 w-3.5 text-stat-green" />
                                            <Copy v-else class="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </td>
                                <td class="py-3 px-4">
                                    <span class="text-xs text-foreground">{{ r.geography ?? '—' }}</span>
                                </td>
                                <td class="py-3 px-4">
                                    <span class="text-xs text-foreground">{{ r.law ?? '—' }}</span>
                                </td>
                                <td class="py-3 px-4 text-right tabular-nums font-medium">{{ r.stats.policyCount }}</td>
                                <td class="py-3 px-4 text-right tabular-nums">{{ r.stats.projectCount }}</td>
                                <td class="py-3 px-4 text-right tabular-nums">{{ r.stats.userCount }}</td>
                                <td class="py-3 px-4 text-right tabular-nums font-medium">{{ r.stats.issuanceCount }}</td>
                                <td class="py-3 px-4">
                                    <span class="text-xs text-foreground">{{ r.tags ?? '—' }}</span>
                                </td>
                                <td class="py-3 px-4">
                                    <span class="text-xs text-muted-foreground">{{ formatHederaTimestamp(r.sourceTimestamp) }}</span>
                                </td>
                            </tr>
                            <tr v-if="registries.length === 0">
                                <td colspan="10" class="py-12 text-center text-sm text-muted-foreground">No registries match your filters</td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <Pagination
                v-model:current-page="currentPage"
                :total-pages="totalPages"
                :total-items="totalCount"
                :page-size="pageSize"
            />
        </div>
    </div>
</template>
