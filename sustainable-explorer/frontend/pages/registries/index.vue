<script setup lang="ts">
import { Building2, Copy, Check, FileJson, Download, Loader2 } from 'lucide-vue-next';
import { useDebounceFn } from '@vueuse/core';
import type { FilterOption } from '~/components/shared/FilterBar.vue';
import type { RegistrySortKey, RegistrySortDir, RegistryDto } from '~/composables/api/useRegistriesApi';
import { downloadCsv, csvDateStamp, buildRegistryCsvRows } from '~/lib/csv-export';
import type { SortDirection } from '~/composables/useFilteredPagination';
import { naturalCompare } from '~/lib/utils';


const { t, locale } = useI18n();

// Network from the topbar network selector
const { network } = useNetwork();

// Column key -> API sortBy key mapping
type ColumnKey = 'name' | 'relatedTopicId' | 'geography' | 'law' | 'policies' | 'projects' | 'users' | 'credits' | 'tags' | 'createdAt';

const columnToApiSort: Record<ColumnKey, RegistrySortKey | null> = {
    name: 'displayName',
    relatedTopicId: 'relatedTopicId',
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
const route = useRoute();
const router = useRouter();
// hideEmpty defaults to true so the table mirrors the dashboard stat card.
const initialFilters: Record<string, any> = {
    hideEmpty: route.query.hideEmpty !== 'false',
};
// Keep `?did=` deep-link support (used by ProjectKeyFacts and methodologies page).
if (route.query.did && typeof route.query.did === 'string') {
    initialFilters.did = route.query.did;
}
if (route.query.sourceTimestamp && typeof route.query.sourceTimestamp === 'string') {
    const [from, to] = (route.query.sourceTimestamp as string).split('|');
    if (from || to) initialFilters.sourceTimestamp = { from: from || '', to: to || '' };
}
const filters = ref<Record<string, any>>(initialFilters);
const currentPage = ref(1);
const pageSize = ref(10);

// Unified search — debounced so each keystroke doesn't fire an API request.
// Falls back to old per-field URL params for backward compat.
const localSearch = ref(
    typeof route.query.search === 'string' ? route.query.search :
    (['displayName', 'id', 'tags', 'geography', 'law'] as const)
        .map(k => route.query[k])
        .find((v): v is string => typeof v === 'string') ?? ''
);
const searchQuery = ref(localSearch.value.trim());
const debouncedSearch = useDebounceFn((val: string) => {
    searchQuery.value = val.trim();
}, 300);

function syncToUrl() {
    const q: Record<string, string> = { ...(route.query as Record<string, string>) };
    const search = localSearch.value.trim();
    if (search) q.search = search; else delete q.search;
    for (const k of ['displayName', 'id', 'tags', 'geography', 'law']) delete q[k];
    const ts = filters.value.sourceTimestamp;
    if (ts && typeof ts === 'object' && (ts.from || ts.to)) {
        q.sourceTimestamp = `${ts.from || ''}|${ts.to || ''}`;
    } else {
        delete q.sourceTimestamp;
    }
    if (filters.value.did) q.did = String(filters.value.did); else delete q.did;
    router.replace({ query: q });
}

watch(localSearch, (val) => {
    debouncedSearch(val);
    syncToUrl();
});

const barFilters = computed<FilterOption[]>(() => [
    {
        key: 'sourceTimestamp',
        label: t('registries.filters.createdDate'),
        type: 'daterange',
        options: [],
    },
]);

const activeFilterRecord = computed<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    const ts = filters.value.sourceTimestamp;
    if (ts && typeof ts === 'object' && (ts.from || ts.to)) {
        r.sourceTimestamp = `${ts.from || ''}|${ts.to || ''}`;
    }
    return r;
});

function setRegistryFilter(key: string, value: string) {
    const next = { ...filters.value };
    if (!value || value === 'all') {
        delete next[key];
    } else if (key === 'sourceTimestamp') {
        const [from, to] = value.split('|');
        next[key] = { from: from || '', to: to || '' };
    } else {
        next[key] = value;
    }
    filters.value = next;
}

function clearRegistryFilters() {
    const next: Record<string, any> = { hideEmpty: filters.value.hideEmpty };
    if (filters.value.did) next.did = filters.value.did;
    filters.value = next;
    localSearch.value = '';
    searchQuery.value = '';
}

const sortKey = ref<ColumnKey | null>('createdAt');
const sortDir = ref<SortDirection>('desc');

// Reset to page 1 when page size changes
watch(pageSize, () => {
    currentPage.value = 1;
});

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
    filters,
});

// Live updates: poll the API every 15 seconds on the client.
// SSR still provides the initial render; polling keeps it fresh
// as the worker syncs new data in the background.
if (import.meta.client) {
    const pollInterval = setInterval(() => {
        refresh();
    }, 15000);
    onBeforeUnmount(() => clearInterval(pollInterval));
}

const SORT_FIELD_MAP: Record<string, (r: any) => any> = {
    name:           r => r.name ?? '',
    relatedTopicId: r => r.relatedTopicId ?? '',
    geography:      r => r.geography ?? '',
    law:            r => r.law ?? '',
    policies:       r => r.stats?.policyCount ?? 0,
    projects:       r => r.stats?.projectCount ?? 0,
    credits:        r => r.stats?.issuanceCount ?? 0,
    tags:           r => r.tags ?? '',
    createdAt:      r => r.sourceTimestamp ?? '',
};

const registries = computed<any[]>(() => {
    const result = data.value?.data ?? [];
    if (!sortKey.value || !sortDir.value) return result;
    const getter = SORT_FIELD_MAP[sortKey.value] ?? ((r: any) => (r as any)[sortKey.value as string] ?? '');
    const dir = sortDir.value === 'asc' ? 1 : -1;
    return [...result].sort((a, b) => {
        const aVal = getter(a);
        const bVal = getter(b);
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
        return naturalCompare(String(aVal), String(bVal)) * dir;
    });
});
const meta = computed(
    () => data.value?.meta ?? { page: 1, limit: pageSize.value, total: 0, totalPages: 1 },
);
const totalPages = computed(() => meta.value.totalPages || 1);
const totalCount = computed(() => meta.value.total || 0);

// Reset to page 1 when network or filters change
watch(apiNetwork, () => {
    currentPage.value = 1;
});
watch(
    filters,
    () => {
        currentPage.value = 1;
        syncToUrl();
    },
    { deep: true },
);

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

const localeTag = computed(() => (locale.value === 'es' ? 'es-ES' : 'en-US'));

const formatDate = (d: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString(localeTag.value);
};

// Hedera consensus timestamps are "seconds.nanoseconds" strings.
// Convert to a JS Date (millisecond precision).
const formatHederaTimestamp = (ts: string | null) => {
    if (!ts) return '—';
    const seconds = parseFloat(ts);
    if (isNaN(seconds)) return ts;
    return new Date(seconds * 1000).toLocaleDateString(localeTag.value);
};

const skeletonRows = computed(() => Array.from({ length: pageSize.value }, (_, i) => i));

const tagsAsList = (tags: string | null): string[] => {
    if (!tags) return [];
    return tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
};

const downloading = ref(false);

async function downloadRegistries() {
    if (downloading.value) return;
    downloading.value = true;
    try {
        const { fetchAllPages } = useApiDownload();
        const query: Record<string, string | number | boolean> = {};
        const search = searchQuery.value?.trim();
        if (search) query.search = search;
        if (apiSortBy.value && apiSortDir.value) {
            query.sortBy = apiSortBy.value;
            query.sortDir = apiSortDir.value;
        }
        const FILTER_KEYS = ['displayName', 'did', 'id', 'tags', 'geography', 'law'] as const;
        for (const key of FILTER_KEYS) {
            const raw = filters.value[key];
            if (raw == null) continue;
            const trimmed = String(raw).trim();
            if (trimmed) query[key] = trimmed;
        }
        if (filters.value.hideEmpty === true) query.hideEmpty = true;
        const ts = filters.value.sourceTimestamp;
        if (ts && typeof ts === 'object') {
            if (ts.from) query.createdAtFrom = ts.from;
            if (ts.to) query.createdAtTo = ts.to;
        }

        const allData = await fetchAllPages(`/api/v1/${network.value}/registries`, query);
        const rows = buildRegistryCsvRows(allData, network.value);
        downloadCsv(`registries_export_${csvDateStamp()}.csv`, rows);
    } finally {
        downloading.value = false;
    }
}

// Raw-data viewer state — same VcJsonViewer pattern used elsewhere.
const vcViewerOpen = ref(false);
const vcViewerTitle = ref('');
const vcViewerData = ref<Record<string, any> | null>(null);

function viewRegistry(r: RegistryDto) {
    vcViewerTitle.value = r.name;
    vcViewerData.value = r as unknown as Record<string, any>;
    vcViewerOpen.value = true;
}
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-4">
            <h1 class="text-2xl font-bold text-foreground">{{ $t('registries.title') }}</h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('registries.subtitle') }}</p>
        </div>

        <div class="px-6 pb-3">
            <FilterBar
                v-model="localSearch"
                :filters="barFilters"
                :active-filters="activeFilterRecord"
                :result-count="totalCount"
                :total-count="totalCount"
                :search-placeholder="$t('registries.searchPlaceholder')"
                @filter="setRegistryFilter"
                @clear="clearRegistryFilters"
            />
            <label class="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer">
                <input
                    type="checkbox"
                    class="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                    :checked="filters.hideEmpty === true"
                    @change="(e) => { filters = { ...filters, hideEmpty: (e.target as HTMLInputElement).checked }; currentPage = 1; }"
                />
                {{ $t('registries.filters.hideEmpty') }}
                <InfoTooltip :text="$t('registries.tooltips.hideEmpty')" />
            </label>
        </div>

        <div class="px-6 pb-6">
            <div class="flex justify-end mb-3">
                <button
                    class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    :disabled="downloading"
                    @click="downloadRegistries"
                >
                    <Loader2 v-if="downloading" class="h-3.5 w-3.5 animate-spin" />
                    <Download v-else class="h-3.5 w-3.5" />
                    {{ $t('registries.downloadData') }}
                </button>
            </div>
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="overflow-x-auto">
                <table class="table-fixed text-sm" style="min-width: 1360px; width: 100%">
                    <colgroup>
                        <col style="width: 160px" />
                        <col style="width: 150px" />
                        <col style="width: 90px" />
                        <col style="width: 200px" />
                        <col style="width: 110px" />
                        <col style="width: 110px" />
                        <col style="width: 80px" />
                        <col style="width: 70px" />
                        <col style="width: 90px" />
                        <col style="width: 110px" />
                        <col style="width: 90px" />
                        <col style="width: 60px" />
                    </colgroup>
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <SortableHeader :label="$t('registries.columns.name')" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('registries.columns.id')" sort-key="relatedTopicId" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('registries.columns.geography')" sort-key="geography" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('registries.columns.website') }}</th>
                            <SortableHeader :label="$t('registries.columns.law')" sort-key="law" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('registries.columns.methodologies')" sort-key="policies" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('registries.columns.projects')" sort-key="projects" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('registries.columns.users')" sort-key="users" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('registries.columns.issuances')" sort-key="credits" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('registries.columns.tags')" sort-key="tags" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <SortableHeader :label="$t('registries.columns.created')" sort-key="createdAt" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event)" />
                            <th class="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('common.rawData') }}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <!-- Loading skeleton -->
                        <template v-if="pending && registries.length === 0">
                            <tr v-for="i in skeletonRows" :key="`sk-${i}`">
                                <td v-for="col in 12" :key="col" class="py-3 px-4">
                                    <Skeleton class="h-4 w-full max-w-[120px]" />
                                </td>
                            </tr>
                        </template>

                        <!-- Error state -->
                        <tr v-else-if="error">
                            <td colspan="12" class="py-12 text-center text-sm text-destructive">
                                {{ $t('registries.errors.loadFailed') }} <button class="underline" @click="() => refresh()">{{ $t('common.retry') }}</button>
                            </td>
                        </tr>

                        <!-- Data rows -->
                        <template v-else>
                            <tr
                                v-for="r in registries"
                                :key="r.id"
                                class="hover:bg-muted/30 transition-colors cursor-pointer align-top"
                                @click="navigateTo(`/registries/${r.id}`)"
                            >
                                <td class="py-3 px-4">
                                    <div class="flex items-start gap-2.5">
                                        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                            <Building2 class="h-4 w-4 text-primary" />
                                        </div>
                                        <span class="font-medium text-foreground hover:text-primary transition-colors break-words min-w-0">{{ r.name }}</span>
                                    </div>
                                </td>
                                <td class="py-3 px-4">
                                    <div class="group flex items-start gap-2">
                                        <code class="text-[11px] text-muted-foreground/80 font-mono break-all min-w-0">{{ r.relatedTopicId ?? '—' }}</code>
                                        <button
                                            v-if="r.relatedTopicId"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            :title="$t('tooltips.copyId')"
                                            @click.stop="copyValue(r.relatedTopicId)"
                                        >
                                            <Check v-if="copiedValue === r.relatedTopicId" class="h-3.5 w-3.5 text-stat-green" />
                                            <Copy v-else class="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </td>
                                <td class="py-3 px-4">
                                    <span class="text-xs text-foreground break-words">{{ r.geography ?? '—' }}</span>
                                </td>
                                <td class="py-3 px-4">
                                    <a
                                        v-if="r.website"
                                        :href="r.website"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="text-xs text-primary hover:underline break-all"
                                        @click.stop
                                    >
                                        {{ r.website }}
                                    </a>
                                    <span v-else class="text-xs text-muted-foreground">—</span>
                                </td>
                                <td class="py-3 px-4">
                                    <span class="text-xs text-foreground break-words">{{ r.law ?? '—' }}</span>
                                </td>
                                <td class="py-3 px-4 text-right tabular-nums">
                                    <NuxtLink
                                        v-if="r.stats.policyCount > 0 && r.did"
                                        :to="`/methodologies?registryDid=${encodeURIComponent(r.did)}`"
                                        class="font-medium text-foreground hover:text-primary hover:underline transition-colors"
                                        :title="$t('registries.tooltips.viewMethodologies')"
                                    >
                                        {{ r.stats.policyCount }}
                                    </NuxtLink>
                                    <span v-else class="text-muted-foreground">{{ r.stats.policyCount }}</span>
                                </td>
                                <td class="py-3 px-4 text-right tabular-nums">{{ r.stats.projectCount }}</td>
                                <td class="py-3 px-4 text-right tabular-nums">{{ r.stats.userCount }}</td>
                                <td class="py-3 px-4 text-right tabular-nums font-medium">{{ r.stats.issuanceCount }}</td>
                                <td class="py-3 px-4">
                                    <div v-if="tagsAsList(r.tags).length" class="flex flex-wrap gap-1">
                                        <span
                                            v-for="tag in tagsAsList(r.tags)"
                                            :key="tag"
                                            class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                        >
                                            {{ tag }}
                                        </span>
                                    </div>
                                    <span v-else class="text-xs text-muted-foreground">—</span>
                                </td>
                                <td class="py-3 px-4">
                                    <span class="text-xs text-muted-foreground">{{ formatHederaTimestamp(r.sourceTimestamp) }}</span>
                                </td>
                                <td class="py-3 px-3 text-center">
                                    <button
                                        class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                        :title="$t('common.viewRawData')"
                                        @click.stop="viewRegistry(r)"
                                    >
                                        <FileJson class="h-3.5 w-3.5" />
                                    </button>
                                </td>
                            </tr>
                            <tr v-if="registries.length === 0">
                                <td colspan="12" class="py-12 text-center text-sm text-muted-foreground">{{ $t('registries.noMatch') }}</td>
                            </tr>
                        </template>
                    </tbody>
                </table>
                </div>
            </div>

            <Pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :total-pages="totalPages"
                :total-items="totalCount"
            />
        </div>

        <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
    </div>
</template>
