<script setup lang="ts">
import { Building2, Copy, Check, FileJson } from 'lucide-vue-next';
import type { FilterField } from '~/components/shared/DataFilters.vue';
import type { RegistrySortKey, RegistrySortDir, RegistryDto } from '~/composables/api/useRegistriesApi';
import type { SortDirection } from '~/composables/useFilteredPagination';


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
// hideEmpty defaults to true so the table mirrors the dashboard stat card,
// which counts only registries with at least one policy/project/user/issuance.
// `?hideEmpty=false` in the URL turns it off.
const initialFilters: Record<string, any> = {
    hideEmpty: route.query.hideEmpty !== 'false',
};
if (route.query.did && typeof route.query.did === 'string') {
    initialFilters.did = route.query.did;
}
// Dashboard top-registries row links here with displayName=<name> so the
// list lands pre-filtered. Also accept the other text filters defined in
// filterFields for symmetry.
for (const k of ['displayName', 'id', 'tags', 'geography', 'law'] as const) {
    if (route.query[k] && typeof route.query[k] === 'string') {
        initialFilters[k] = route.query[k];
    }
}
const filters = ref<Record<string, any>>(initialFilters);
const currentPage = ref(1);
const pageSize = ref(10);

// Placeholder search ref kept for the composable signature.
// All text filtering now flows through the `filters` object.
const searchQuery = ref('');

const filterFields = computed<FilterField[]>(() => [
    { key: 'displayName', label: t('registries.filters.name'), type: 'text', placeholder: t('registries.filters.namePlaceholder'), width: 'md' },
    { key: 'id', label: t('registries.filters.id'), type: 'text', placeholder: t('registries.filters.idPlaceholder'), width: 'sm' },
    { key: 'did', label: t('registries.filters.registryDid'), type: 'text', width: 'md' },
    { key: 'tags', label: t('registries.filters.tags'), type: 'text', width: 'sm' },
    { key: 'geography', label: t('registries.filters.geography'), type: 'text', width: 'sm' },
    { key: 'law', label: t('registries.filters.law'), type: 'text', width: 'sm' },
    { key: 'sourceTimestamp', label: t('registries.filters.createdDate'), type: 'daterange', width: 'md' },
]);

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

const registries = computed<any[]>(() => data.value?.data ?? []);
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
            <DataFilters v-model="filters" :fields="filterFields" />
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
            <div class="rounded-xl border bg-card overflow-hidden">
                <table class="w-full text-sm table-fixed">
                    <colgroup>
                        <col class="w-[14%]" />
                        <col class="w-[10%]" />
                        <col class="w-[7%]" />
                        <col class="w-[8%]" />
                        <col class="w-[7%]" />
                        <col class="w-[7%]" />
                        <col class="w-[7%]" />
                        <col class="w-[7%]" />
                        <col class="w-[8%]" />
                        <col class="w-[12%]" />
                        <col class="w-[8%]" />
                        <col class="w-[5%]" />
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
                            <th class="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('common.viewRawData') }}</th>
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
