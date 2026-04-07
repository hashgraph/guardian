<script setup lang="ts">
import { BookOpen, Copy, Check } from 'lucide-vue-next';
import type { FilterField } from '~/components/shared/DataFilters.vue';
import type { MethodologySortKey, MethodologySortDir } from '~/composables/api/useMethodologiesApi';
import type { SortDirection } from '~/composables/useFilteredPagination';
import { formatCredits } from '~/lib/format';

const { t } = useI18n();

// Network from the topbar network selector
const { network } = useNetwork();

// Column key -> API sortBy key mapping
type ColumnKey =
    | 'name'
    | 'registryDid'
    | 'projects'
    | 'issuances'
    | 'schemas'
    | 'description'
    | 'id'
    | 'status'
    | 'createdAt';

const columnToApiSort: Record<ColumnKey, MethodologySortKey | null> = {
    name: 'name',
    registryDid: 'registryDid',
    projects: 'projects',
    issuances: 'issuances',
    schemas: 'schemas',
    description: 'description',
    id: 'id',
    status: 'status',
    createdAt: 'createdAt',
};

// Reactive query state
const route = useRoute();
const initialFilters: Record<string, any> = {};
if (route.query.registryDid && typeof route.query.registryDid === 'string') {
    initialFilters.registryDid = route.query.registryDid;
}
const filters = ref<Record<string, any>>(initialFilters);
const currentPage = ref(1);
const pageSize = ref(10);

// Placeholder search ref kept for the composable signature.
const searchQuery = ref('');

const filterFields = computed<FilterField[]>(() => [
    { key: 'name', label: t('methodologies.filters.name'), type: 'text', placeholder: t('methodologies.filters.namePlaceholder'), width: 'md' },
    { key: 'registryDid', label: t('methodologies.filters.registryDid'), type: 'text', placeholder: 'did:hedera:...', width: 'md' },
    { key: 'registryName', label: t('methodologies.filters.registryName'), type: 'text', placeholder: t('methodologies.filters.registryNamePlaceholder'), width: 'md' },
    { key: 'id', label: t('methodologies.filters.id'), type: 'text', placeholder: '0.0.xxxx', width: 'sm' },
    { key: 'description', label: t('methodologies.filters.description'), type: 'text', width: 'md' },
    { key: 'status', label: t('methodologies.filters.status'), type: 'text', width: 'sm' },
]);

const sortKey = ref<ColumnKey | null>('createdAt');
const sortDir = ref<SortDirection>('desc');

// Reset to page 1 when page size changes
watch(pageSize, () => {
    currentPage.value = 1;
});

const apiSortBy = computed<MethodologySortKey | null>(() =>
    sortKey.value ? columnToApiSort[sortKey.value] : null,
);
const apiSortDir = computed<MethodologySortDir | null>(() =>
    sortDir.value === 'asc' || sortDir.value === 'desc' ? sortDir.value : null,
);
const apiNetwork = computed(() => network.value);

const { data, pending, error, refresh } = useMethodologiesApi({
    page: currentPage,
    limit: pageSize,
    search: searchQuery,
    network: apiNetwork,
    sortBy: apiSortBy,
    sortDir: apiSortDir,
    filters,
});

// Live updates: poll the API every 15 seconds on the client.
if (import.meta.client) {
    const pollInterval = setInterval(() => {
        refresh();
    }, 15000);
    onBeforeUnmount(() => clearInterval(pollInterval));
}

const methodologies = computed<any[]>(() => data.value?.data ?? []);
const meta = computed(
    () => data.value?.meta ?? { page: 1, limit: pageSize.value, total: 0, totalPages: 1 },
);
const totalPages = computed(() => meta.value.totalPages || 1);
const totalCount = computed(() => meta.value.total || 0);

// Reset to page 1 when search, network, or filters change
watch(searchQuery, () => {
    currentPage.value = 1;
});
watch(apiNetwork, () => {
    currentPage.value = 1;
});
watch(
    filters,
    () => {
        currentPage.value = 1;
    },
    { deep: true },
);

// Sort click handler mirroring the registries page
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

const copiedValue = ref<string | null>(null);
const copyValue = async (value: string) => {
    try {
        await navigator.clipboard.writeText(value);
        copiedValue.value = value;
        setTimeout(() => {
            if (copiedValue.value === value) copiedValue.value = null;
        }, 2000);
    } catch (e) {
        // ignore clipboard errors
    }
};

const statusBadgeClass = (status: string | null | undefined): string => {
    const s = (status ?? '').toUpperCase();
    if (s === 'PUBLISHED') return 'bg-stat-green/10 text-stat-green';
    if (s === 'DRAFT') return 'bg-stat-amber/10 text-stat-amber';
    return 'bg-muted text-muted-foreground';
};

const skeletonRows = computed(() => Array.from({ length: pageSize.value }, (_, i) => i));
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-4">
            <h1 class="text-2xl font-bold text-foreground">{{ $t('methodologies.title') }}</h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('methodologies.subtitle') }}</p>
        </div>

        <div class="px-6 pb-3">
            <DataFilters v-model="filters" :fields="filterFields" />
        </div>

        <div class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <SortableHeader :label="$t('methodologies.columns.name')" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('methodologies.columns.registry')" sort-key="registryDid" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('methodologies.columns.projects')" sort-key="projects" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('methodologies.columns.issuance')" sort-key="issuances" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('methodologies.columns.schemaCount')" sort-key="schemas" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('methodologies.columns.description')" sort-key="description" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('methodologies.columns.id')" sort-key="id" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('methodologies.columns.status')" sort-key="status" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <!-- Loading skeleton -->
                        <template v-if="pending && methodologies.length === 0">
                            <tr v-for="i in skeletonRows" :key="`sk-${i}`">
                                <td v-for="col in 8" :key="col" class="py-3 px-4">
                                    <Skeleton class="h-4 w-full max-w-[120px]" />
                                </td>
                            </tr>
                        </template>

                        <!-- Error state -->
                        <tr v-else-if="error">
                            <td colspan="8" class="py-12 text-center text-sm text-destructive">
                                {{ $t('methodologies.errors.loadFailed') }} <button class="underline" @click="() => refresh()">{{ $t('common.retry') }}</button>
                            </td>
                        </tr>

                        <!-- Data rows -->
                        <template v-else>
                            <tr
                                v-for="r in methodologies"
                                :key="r.id"
                                class="hover:bg-muted/30 transition-colors cursor-pointer"
                            >
                                <td class="py-3 px-4">
                                    <div class="flex items-center gap-2.5">
                                        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                            <BookOpen class="h-4 w-4 text-primary" />
                                        </div>
                                        <span class="font-medium text-foreground hover:text-primary transition-colors">{{ r.name }}</span>
                                    </div>
                                </td>
                                <td class="py-3 px-4">
                                    <NuxtLink
                                        v-if="r.registryDid"
                                        :to="`/registries?did=${encodeURIComponent(r.registryDid)}`"
                                        :title="r.registryDid"
                                        class="text-sm text-foreground hover:text-primary hover:underline transition-colors truncate inline-block max-w-[200px]"
                                    >
                                        {{ r.registryName || r.registryDid }}
                                    </NuxtLink>
                                    <span v-else class="text-xs text-muted-foreground">—</span>
                                </td>
                                <td class="py-3 px-4 text-right tabular-nums">{{ r.stats.projectCount }}</td>
                                <td class="py-3 px-4 text-right tabular-nums font-medium">{{ formatCredits(r.stats.issuanceCount) }}</td>
                                <td class="py-3 px-4 text-right tabular-nums">{{ r.stats.schemaCount }}</td>
                                <td class="py-3 px-4">
                                    <span class="block max-w-[300px] truncate text-xs text-muted-foreground" :title="r.description ?? ''">{{ r.description ?? '—' }}</span>
                                </td>
                                <td class="py-3 px-4">
                                    <div class="group flex items-center gap-2">
                                        <code class="text-[11px] text-muted-foreground/80 font-mono">{{ r.topicId ?? '—' }}</code>
                                        <button
                                            v-if="r.topicId"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            :title="t('methodologies.tooltips.copyId')"
                                            @click.stop="copyValue(r.topicId)"
                                        >
                                            <Check v-if="copiedValue === r.topicId" class="h-3.5 w-3.5 text-stat-green" />
                                            <Copy v-else class="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </td>
                                <td class="py-3 px-4">
                                    <span :class="[statusBadgeClass(r.status), 'text-xs font-medium rounded-full px-2 py-0.5']">
                                        {{ r.status ?? '—' }}
                                    </span>
                                </td>
                            </tr>
                            <tr v-if="methodologies.length === 0">
                                <td colspan="8" class="py-12 text-center text-sm text-muted-foreground">{{ $t('methodologies.noMatch') }}</td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <Pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :total-pages="totalPages"
                :total-items="totalCount"
            />
        </div>
    </div>
</template>
