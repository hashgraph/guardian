<script setup lang="ts">
import { BookOpen, Copy, Check, Download, Loader2 } from "lucide-vue-next";
import { useDebounceFn } from '@vueuse/core';
import type { FilterOption } from '~/components/shared/FilterBar.vue';
import type {
  MethodologySortKey,
  MethodologySortDir,
} from "~/composables/api/useMethodologiesApi";
import type { SortDirection } from "~/composables/useFilteredPagination";
import { formatCredits } from "~/lib/format";
import { useRegistriesApi } from "~/composables/api/useRegistriesApi";
import { downloadCsv, csvDateStamp, buildMethodologyCsvRows } from '~/lib/csv-export';
import { naturalCompare } from '~/lib/utils';

const { t } = useI18n();

// Network from the topbar network selector
const { network } = useNetwork();

// Column key -> API sortBy key mapping
type ColumnKey =
  | "name"
  | "registryDid"
  | "projects"
  | "issuances"
  | "schemas"
  | "description"
  | "id"
  | "createdAt";

const columnToApiSort: Record<ColumnKey, MethodologySortKey | null> = {
  name: "name",
  registryDid: "registryName",
  projects: "projects",
  issuances: "issuances",
  schemas: "schemas",
  description: "description",
  id: "id",
  createdAt: "createdAt",
};

// Reactive query state
const route = useRoute();
const router = useRouter();
const initialFilters: Record<string, any> = {};
if (route.query.registryDid && typeof route.query.registryDid === "string") {
  initialFilters.registryDid = route.query.registryDid;
}
if (route.query.registryName && typeof route.query.registryName === "string") {
  initialFilters.registryName = route.query.registryName;
}
if (route.query.decodeStatus && typeof route.query.decodeStatus === "string") {
  initialFilters.decodeStatus = route.query.decodeStatus;
}
const filters = ref<Record<string, any>>(initialFilters);
const currentPage = ref(1);
const pageSize = ref(10);

// Unified search — debounced so each keystroke doesn't fire an API request.
const localSearch = ref(
  typeof route.query.search === "string" ? route.query.search :
  typeof route.query.name === "string" ? route.query.name : ""
);
const searchQuery = ref(localSearch.value.trim());
const debouncedSearch = useDebounceFn((val: string) => {
  searchQuery.value = val.trim();
}, 300);

function syncToUrl() {
  const q: Record<string, string> = { ...(route.query as Record<string, string>) };
  const search = localSearch.value.trim();
  if (search) q.search = search; else delete q.search;
  delete q.name;
  if (filters.value.registryName) q.registryName = String(filters.value.registryName); else delete q.registryName;
  if (filters.value.decodeStatus) q.decodeStatus = String(filters.value.decodeStatus); else delete q.decodeStatus;
  if (filters.value.registryDid) q.registryDid = String(filters.value.registryDid); else delete q.registryDid;
  router.replace({ query: q });
}

watch(localSearch, (val) => {
  debouncedSearch(val);
  syncToUrl();
});

// Fetch the registries list once so the registry filter can render as a
// labeled dropdown (registry name + topic id) rather than a free-text DID.
const registriesPage = ref(1);
const registriesLimit = ref(500);
const registriesSearch = ref('');
const registriesSortBy = ref(null);
const registriesSortDir = ref(null);
const registriesFilters = ref({ hideEmpty: true });
const { data: registriesData } = useRegistriesApi({
  page: registriesPage,
  limit: registriesLimit,
  search: registriesSearch,
  network: computed(() => network.value),
  sortBy: registriesSortBy as any,
  sortDir: registriesSortDir as any,
  filters: registriesFilters,
});

const registryNameOptions = computed(() => {
    // Deduplicate by name — a single registry can appear under multiple DIDs
    // (policy versions). Using the name as both value and key collapses them.
    const names = new Set<string>();
    for (const r of (registriesData.value?.data ?? [])) {
        if (r.name) names.add(r.name);
    }
    return [...names]
        .sort((a, b) => naturalCompare(a, b))
        .map(n => ({ value: n, label: n }));
});

const barFilters = computed<FilterOption[]>(() => [
    {
        key: 'registryName',
        label: t('methodologies.filters.registry'),
        multiSelect: true,
        searchable: true,
        options: registryNameOptions.value,
    },
    {
        key: 'decodeStatus',
        label: t('methodologies.filters.decoded'),
        multiSelect: true,
        options: [
            { value: 'success', label: t('methodologies.decodeStatus.success') },
            { value: 'failed', label: t('methodologies.decodeStatus.failed') },
            { value: 'pending', label: t('methodologies.decodeStatus.pending') },
            { value: 'unknown', label: t('methodologies.decodeStatus.unknown') },
        ],
    },
]);

const activeFilterRecord = computed<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    if (filters.value.registryName) r.registryName = String(filters.value.registryName);
    if (filters.value.decodeStatus) r.decodeStatus = String(filters.value.decodeStatus);
    return r;
});

// Separate from the manual `registryName` FilterBar filter above — this
// reflects navigation from a registry-scoped link (e.g. the Registry detail
// page's "Methodologies" card), which filters by DID (registries aren't
// unique by name — see registries list, duplicate names with different DIDs)
// while still showing a friendly name in its own banner.
const registryDidFromQuery = computed(() =>
    typeof route.query.registryDid === 'string' ? route.query.registryDid : null);
const registryFilterName = computed(() => {
    if (!registryDidFromQuery.value) return null;
    return registriesData.value?.data.find(r => r.did === registryDidFromQuery.value)?.name ?? null;
});

// `filters.value.registryDid` is only ever seeded once at mount (from
// `initialFilters`) and drives the actual useMethodologiesApi fetch — it
// doesn't reactively track the URL afterward. Without this, navigating away
// via the banner's "Clear filter" link (which clears route.query.registryDid)
// hides the banner but leaves the list silently still scoped, and syncToUrl()
// could even resurrect the param from this stale value on the next search.
watch(registryDidFromQuery, (val) => {
    const next = { ...filters.value };
    if (val) next.registryDid = val;
    else delete next.registryDid;
    filters.value = next;
});

function setMethodologyFilter(key: string, value: string) {
    const next = { ...filters.value };
    if (!value || value === 'all') delete next[key];
    else next[key] = value;
    filters.value = next;
}

function clearMethodologyFilters() {
    filters.value = {};
    localSearch.value = '';
    searchQuery.value = '';
}

const sortKey = ref<ColumnKey | null>("createdAt");
const sortDir = ref<SortDirection>("desc");

// Reset to page 1 when page size changes
watch(pageSize, () => {
  currentPage.value = 1;
});

const apiSortBy = computed<MethodologySortKey | null>(() =>
  sortKey.value ? columnToApiSort[sortKey.value] : null,
);
const apiSortDir = computed<MethodologySortDir | null>(() =>
  sortDir.value === "asc" || sortDir.value === "desc" ? sortDir.value : null,
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

const SORT_FIELD_MAP: Record<string, (m: any) => any> = {
    name:        m => m.name ?? '',
    registryDid: m => m.registryName ?? '',
    projects:    m => m.stats?.instanceProjectCount ?? 0,
    issuances:   m => m.stats?.instanceIssuanceCount ?? 0,
    schemas:     m => m.stats?.schemaCount ?? 0,
    description: m => m.description ?? '',
    id:          m => m.topicId ?? '',
    createdAt:   m => m.sourceTimestamp ?? '',
};

const methodologies = computed<any[]>(() => {
    const result = data.value?.data ?? [];
    if (!sortKey.value || !sortDir.value) return result;
    const getter = SORT_FIELD_MAP[sortKey.value] ?? ((m: any) => (m as any)[sortKey.value as string] ?? '');
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
  () =>
    data.value?.meta ?? {
      page: 1,
      limit: pageSize.value,
      total: 0,
      totalPages: 1,
    },
);
const totalPages = computed(() => meta.value.totalPages || 1);
const totalCount = computed(() => meta.value.total || 0);

// Stats bar — reuses the same composable as the table but with a fixed
// limit=1000 and no filters, so the key is always distinct from the table key.
const statsPage = ref(1);
const statsLimit = ref(1);
const statsSearch = ref("");
const statsSortBy = ref<MethodologySortKey | null>(null);
const statsSortDir = ref<MethodologySortDir | null>(null);
const statsFilters = ref<Record<string, any>>({});

const { data: statsData } = useMethodologiesApi({
  page: statsPage,
  limit: statsLimit,
  search: statsSearch,
  network: apiNetwork,
  sortBy: statsSortBy,
  sortDir: statsSortDir,
  filters: statsFilters,
});

const statTotal = computed(() => statsData.value?.meta.total ?? 0);


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
    syncToUrl();
  },
  { deep: true },
);

// Sort click handler mirroring the registries page
function toggleSort(key: string) {
  const col = key as ColumnKey;
  if (sortKey.value === col) {
    if (sortDir.value === "asc") {
      sortDir.value = "desc";
    } else if (sortDir.value === "desc") {
      sortKey.value = null;
      sortDir.value = null;
    } else {
      sortDir.value = "asc";
    }
  } else {
    sortKey.value = col;
    sortDir.value = "asc";
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

const decodeStatusBadgeClass = (status: string | null | undefined): string => {
  const s = (status ?? "unknown").toLowerCase();
  if (s === "success") return "bg-stat-green/10 text-stat-green";
  if (s === "failed") return "bg-destructive/10 text-destructive";
  if (s === "pending") return "bg-stat-amber/10 text-stat-amber";
  return "bg-muted text-muted-foreground";
};

const decodeStatusI18nKey = (status: string | null | undefined): string => {
  const s = (status ?? "unknown").toLowerCase();
  if (s === "success" || s === "failed" || s === "pending") return `methodologies.decodeStatus.${s}`;
  return "methodologies.decodeStatus.unknown";
};

const skeletonRows = computed(() =>
  Array.from({ length: pageSize.value }, (_, i) => i),
);

const downloading = ref(false);

async function downloadMethodologies() {
    if (downloading.value) return;
    downloading.value = true;
    try {
        const { fetchAllPages } = useApiDownload();
        const query: Record<string, string | number> = {};
        const search = searchQuery.value?.trim();
        if (search) query.search = search;
        const FILTER_KEYS = ['name', 'id', 'description', 'decodeStatus', 'registryDid', 'registryName', 'version', 'policyTopicId'] as const;
        for (const key of FILTER_KEYS) {
            const raw = filters.value[key];
            if (raw == null) continue;
            const trimmed = String(raw).trim();
            if (trimmed) query[key] = trimmed;
        }

        let allData = await fetchAllPages(`/api/v1/${network.value}/methodologies`, query);

        if (sortKey.value && sortDir.value) {
            const getter = SORT_FIELD_MAP[sortKey.value] ?? ((m: any) => (m as any)[sortKey.value as string] ?? '');
            const dir = sortDir.value === 'asc' ? 1 : -1;
            allData = [...allData].sort((a, b) => {
                const aVal = getter(a);
                const bVal = getter(b);
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
                return naturalCompare(String(aVal), String(bVal)) * dir;
            });
        }

        const rows = buildMethodologyCsvRows(allData, network.value);
        downloadCsv(`methodologies_export_${csvDateStamp()}.csv`, rows);
    } finally {
        downloading.value = false;
    }
}
</script>

<template>
  <div class="space-y-0">
    <div class="px-6 pt-6 pb-4">
      <h1 class="text-2xl font-bold text-foreground">
        {{ $t("methodologies.title") }}
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        {{ $t("methodologies.subtitle") }}
      </p>
    </div>

    <!-- Stats bar -->
    <div class="px-6 pb-4 flex flex-wrap gap-3">
      <div
        class="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm"
      >
        <span class="text-muted-foreground font-medium">{{
          $t("methodologies.stats.total")
        }}</span>
        <span class="font-bold tabular-nums text-foreground text-base">{{
          statTotal
        }}</span>
      </div>
    </div>

    <div v-if="registryDidFromQuery" class="px-6 pb-2">
        <div class="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-sm">
            <span class="text-muted-foreground">{{ $t('methodologies.filteredByRegistry') }}</span>
            <span v-if="registriesData" class="font-medium text-foreground">{{ registryFilterName ?? $t('methodologies.unknownRegistry') }}</span>
            <AppLink to="/methodologies" class="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                {{ $t('methodologies.clearRegistryFilter') }} ×
            </AppLink>
        </div>
    </div>

    <div class="px-6 pb-3">
      <FilterBar
        v-model="localSearch"
        :filters="barFilters"
        :active-filters="activeFilterRecord"
        :result-count="totalCount"
        :total-count="statTotal"
        :search-placeholder="$t('methodologies.searchPlaceholder')"
        @filter="setMethodologyFilter"
        @clear="clearMethodologyFilters"
      >
        <button
          :disabled="downloading"
          class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="downloadMethodologies"
        >
          <Loader2 v-if="downloading" class="h-3.5 w-3.5 animate-spin" />
          <Download v-else class="h-3.5 w-3.5" />
          {{ $t('methodologies.downloadData') }}
        </button>
      </FilterBar>
    </div>

    <div class="px-6 pb-6">
      <div class="rounded-xl border bg-card overflow-hidden">
        <div class="overflow-x-auto">
        <table class="w-full text-sm table-fixed">
          <colgroup>
              <col style="width: 14%" />
              <col style="width: 11%" />
              <col style="width: 7%" />
              <col style="width: 6%" />
              <col style="width: 7%" />
              <col style="width: 10%" />
              <col style="width: 14%" />
              <col style="width: 12%" />
              <col style="width: 8%" />
              <col style="width: 11%" />
          </colgroup>
          <thead>
            <tr class="border-b bg-muted/30">
              <SortableHeader
                :label="$t('methodologies.columns.name')"
                sort-key="name"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
                @sort="toggleSort($event)"
              />
              <SortableHeader
                :label="$t('methodologies.columns.registry')"
                sort-key="registryDid"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
                @sort="toggleSort($event)"
              />
              <th class="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {{ $t('methodologies.columns.type') }}
              </th>
              <SortableHeader
                :label="$t('methodologies.columns.projects')"
                sort-key="projects"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
                class="!text-right"
                @sort="toggleSort($event)"
              />
              <SortableHeader
                :label="$t('methodologies.columns.issuance')"
                sort-key="issuances"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
                class="!text-right"
                @sort="toggleSort($event)"
              />
              <SortableHeader
                :label="$t('methodologies.columns.schemaCount')"
                sort-key="schemas"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
                class="!text-right"
                @sort="toggleSort($event)"
              />
              <SortableHeader
                :label="$t('methodologies.columns.description')"
                sort-key="description"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
                @sort="toggleSort($event)"
              />
              <SortableHeader
                :label="$t('methodologies.columns.id')"
                sort-key="id"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
                @sort="toggleSort($event)"
              />
              <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{{ $t('methodologies.columns.version') }}</th>
              <th class="py-2.5 pl-4 pr-8 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {{ $t('methodologies.columns.decoded') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <!-- Loading skeleton -->
            <template v-if="pending && methodologies.length === 0">
              <tr v-for="i in skeletonRows" :key="`sk-${i}`">
                <td v-for="col in 10" :key="col" class="py-3 px-4">
                  <Skeleton class="h-4 w-full max-w-[120px]" />
                </td>
              </tr>
            </template>

            <!-- Error state -->
            <tr v-else-if="error">
              <td
                colspan="10"
                class="py-12 text-center text-sm text-destructive"
              >
                {{ $t("methodologies.errors.loadFailed") }}
                <button class="underline" @click="() => refresh()">
                  {{ $t("common.retry") }}
                </button>
              </td>
            </tr>

            <!-- Data rows -->
            <template v-else>
              <tr
                v-for="r in methodologies"
                :key="r.id"
                class="hover:bg-muted/30 transition-colors cursor-pointer align-top"
                @click="r.topicId && navigateTo('/methodologies/' + r.topicId)"
              >
                <td class="py-3 px-4">
                  <div class="flex items-start gap-2.5">
                    <div
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                    >
                      <BookOpen class="h-4 w-4 text-primary" />
                    </div>
                    <span
                      class="font-medium text-foreground hover:text-primary transition-colors break-words min-w-0"
                      >{{ r.name }}</span
                    >
                  </div>
                </td>
                <td class="py-3 px-4">
                  <AppLink
                    v-if="r.registryDid"
                    :to="`/registries?did=${encodeURIComponent(r.registryDid)}`"
                    :title="r.registryDid"
                    class="text-sm text-foreground hover:text-primary hover:underline transition-colors break-words"
                  >
                    {{ r.registryName || r.registryDid }}
                  </AppLink>
                  <span v-else class="text-xs text-muted-foreground">—</span>
                </td>
                <td class="py-3 px-4">
                  <span
                    v-if="r.emissionReductionApproach"
                    class="inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-xs font-medium text-sky-700"
                  >
                    {{ r.emissionReductionApproach }}
                  </span>
                  <span v-else class="text-xs text-muted-foreground">—</span>
                </td>
                <td class="py-3 px-4 text-right tabular-nums">
                  <span :title="r.stats.projectCount !== r.stats.instanceProjectCount
                    ? `${r.stats.projectCount} total across all versions`
                    : undefined">
                    {{ r.stats.instanceProjectCount }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right tabular-nums font-medium">
                  <AppLink
                    v-if="r.sourceTimestamp && r.stats.instanceIssuanceCount > 0"
                    :to="`/credits?methodologyId=${encodeURIComponent(r.sourceTimestamp)}`"
                    :title="r.stats.issuanceCount !== r.stats.instanceIssuanceCount
                      ? `${r.stats.issuanceCount} total across all versions`
                      : undefined"
                    class="text-primary hover:underline transition-colors"
                    @click.stop
                  >
                    {{ formatCredits(r.stats.instanceIssuanceCount) }}
                  </AppLink>
                  <span
                    v-else
                    :title="r.stats.issuanceCount !== r.stats.instanceIssuanceCount
                      ? `${r.stats.issuanceCount} total across all versions`
                      : undefined"
                  >
                    {{ formatCredits(r.stats.instanceIssuanceCount) }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right tabular-nums">
                  {{ r.stats.schemaCount }}
                </td>
                <td class="py-3 px-4">
                  <span
                    class="block text-xs text-muted-foreground break-words"
                    :title="r.description ?? ''"
                    >{{ r.description ?? "—" }}</span
                  >
                </td>
                <td class="py-3 px-4">
                  <div class="group flex items-start gap-2">
                    <code
                      class="text-[11px] text-muted-foreground/80 font-mono whitespace-nowrap"
                      >{{ r.topicId ?? "—" }}</code
                    >
                    <button
                      v-if="r.topicId"
                      class="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      :title="t('methodologies.tooltips.copyId')"
                      @click.stop="copyValue(r.topicId)"
                    >
                      <Check
                        v-if="copiedValue === r.topicId"
                        class="h-3.5 w-3.5 text-stat-green"
                      />
                      <Copy v-else class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <span
                    v-if="r.version"
                    class="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5"
                    >{{ r.version }}</span
                  >
                  <span v-else class="text-xs text-muted-foreground">—</span>
                </td>
                <td class="py-3 pl-4 pr-8">
                  <span
                    :class="[
                      decodeStatusBadgeClass(r.decodeStatus),
                      'inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5',
                    ]"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-current mr-1.5 shrink-0" />
                    {{ $t(decodeStatusI18nKey(r.decodeStatus)) }}
                  </span>
                </td>
              </tr>
              <tr v-if="methodologies.length === 0">
                <td
                  colspan="10"
                  class="py-12 text-center text-sm text-muted-foreground"
                >
                  {{ $t("methodologies.noMatch") }}
                </td>
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
  </div>
</template>
