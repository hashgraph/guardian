<script setup lang="ts">
import {
  FolderKanban,
  FileJson,
  Sparkles,
  CheckSquare,
  Square,
  X,
  Columns2,
  Download,
  Loader2,
  Save,
} from "lucide-vue-next";
import { useDebounceFn } from "@vueuse/core";
import type { FilterOption } from "~/components/shared/FilterBar.vue";
import type { SortDirection } from "~/composables/useFilteredPagination";
import type { ProjectSortKey } from "~/composables/api/useProjectsApi";
import { formatCredits } from "~/lib/format";
import { naturalCompare } from "~/lib/utils";
import { SDG_LIST } from "~/lib/sdgs";
import { generateProjectVc } from "~/lib/mock-vc";
import { getMethodologyLongName } from "~/lib/methodologies";
import { LIFECYCLE_STAGES, lifecycleStageColor } from "~/lib/lifecycle";
import type { Project } from "~/types/models";
import {
  downloadCsv,
  csvDateStamp,
  buildProjectCsvRows,
  hederaTimestamp,
} from "~/lib/csv-export";
import { mapApiProject } from "~/composables/useProjects";
import type { SavedSearchCriteria } from "~/composables/useSavedSearches";
import SavedSearchesRow from "~/components/saved-search/SavedSearchesRow.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { network } = useNetwork();

const {
  selectedEntries,
  canAdd,
  isSelected,
  toggleProject,
  removeProject,
  clearAll,
  goToCompare,
} = useProjectComparison();

const registryDidFilter = computed(() =>
  typeof route.query.registryDid === "string" ? route.query.registryDid : null,
);
const methodologyIdFilter = computed(() =>
  typeof route.query.methodologyId === "string" ? route.query.methodologyId : null,
);

type ColumnKey =
  | "name" | "country" | "registry" | "methodology" | "sector"
  | "issuanceCount" | "lifecycleStage" | "expectedIssuanceYear" | "createdDate";

const columnToApiSort: Record<ColumnKey, ProjectSortKey | null> = {
  name: "name",
  country: "country",
  registry: "registry",
  methodology: "methodology",
  sector: "sector",
  issuanceCount: "issuanceCount",
  lifecycleStage: "lifecycleStage",
  expectedIssuanceYear: "expectedIssuanceYear",
  createdDate: "sourceTimestamp",
};

const currentPage = ref(
  route.query.page ? parseInt(route.query.page as string) || 1 : 1,
);
const pageSize = ref(10);

const searchQuery = ref(typeof route.query.q === "string" ? route.query.q : "");
const apiSearch = ref(searchQuery.value);
const debouncedSetSearch = useDebounceFn((val: string) => {
  apiSearch.value = val;
}, 300);

function initialFiltersFromQuery(): Record<string, string> {
  const reserved = new Set(["q", "page", "sort", "dir", "network", "registryDid", "methodologyId"]);
  const initial: Record<string, string> = {};
  for (const [key, val] of Object.entries(route.query)) {
    if (!reserved.has(key) && typeof val === "string" && val) initial[key] = val;
  }
  return initial;
}
const activeFilters = ref<Record<string, string>>(initialFiltersFromQuery());

const sortKey = ref<ColumnKey | null>(
  (route.query.sort as ColumnKey) || "createdDate",
);
const sortDir = ref<SortDirection>(
  (route.query.dir as SortDirection) || "desc",
);

function syncToUrl() {
  const q: Record<string, string> = {};
  if (searchQuery.value.trim()) q.q = searchQuery.value.trim();
  if (currentPage.value > 1) q.page = String(currentPage.value);
  const isDefaultSort = sortKey.value === "createdDate" && sortDir.value === "desc";
  if (sortKey.value && sortDir.value && !isDefaultSort) {
    q.sort = sortKey.value;
    q.dir = sortDir.value;
  }
  for (const [key, val] of Object.entries(activeFilters.value)) {
    if (val && val !== "all") q[key] = val;
  }
  if (registryDidFilter.value) q.registryDid = registryDidFilter.value;
  if (methodologyIdFilter.value) q.methodologyId = methodologyIdFilter.value;
  const currentNetwork = route.query.network;
  if (currentNetwork) q.network = currentNetwork as string;
  router.replace({ query: q });
}

watch(searchQuery, (val) => {
  debouncedSetSearch(val);
  currentPage.value = 1;
  syncToUrl();
});

function setFilter(key: string, value: string) {
  const next = { ...activeFilters.value };
  if (!value || value === "all") delete next[key];
  else next[key] = value;
  activeFilters.value = next;
  currentPage.value = 1;
  syncToUrl();
}

function clearFilters() {
  activeFilters.value = {};
  searchQuery.value = "";
  apiSearch.value = "";
  currentPage.value = 1;
  syncToUrl();
}

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
  syncToUrl();
}

watch(pageSize, () => { currentPage.value = 1; });
watch(currentPage, () => { syncToUrl(); });
watch(network, () => { currentPage.value = 1; });

const apiSortBy = computed<ProjectSortKey | null>(() =>
  sortKey.value ? columnToApiSort[sortKey.value] : null,
);
const apiSortDir = computed<"asc" | "desc" | null>(() =>
  sortDir.value === "asc" || sortDir.value === "desc" ? sortDir.value : null,
);

const apiFilters = computed<Record<string, any>>(() => {
  const a = activeFilters.value;
  const f: Record<string, any> = {};
  if (a.registry) f.registry = a.registry;
  if (a.country) f.country = a.country;
  if (a.vintage) f.vintageRange = a.vintage;
  if (a.sector) f.sector = a.sector;
  if (a.sectoralScope) f.sectoralScope = a.sectoralScope;
  if (a.developer) f.developer = a.developer;
  if (a.sdgs) f.sdgs = a.sdgs;
  if (a.lifecycleStage) f.lifecycleStage = a.lifecycleStage;
  if (a.isPipeline) f.isPipeline = a.isPipeline;
  if (a.expectedIssuanceYear) f.expectedIssuanceYearRange = a.expectedIssuanceYear;
  if (registryDidFilter.value) f.registryDid = registryDidFilter.value;
  if (methodologyIdFilter.value) f.methodologyId = methodologyIdFilter.value;
  return f;
});

const { data, pending } = useProjectsApi({
  page: currentPage,
  limit: pageSize,
  search: apiSearch,
  network,
  sortBy: apiSortBy,
  sortDir: apiSortDir,
  filters: apiFilters,
});

const { filterOptions } = useProjectFilterOptions(network);

const meta = computed(() =>
  data.value?.meta ?? { page: 1, limit: pageSize.value, total: 0, totalPages: 1 },
);
const totalPages = computed(() => meta.value.totalPages || 1);
const total = computed(() => meta.value.total || 0);
const summaryStats = computed(() =>
  data.value?.summary ?? { totalIssuances: 0, uniqueCountries: 0, uniqueRegistries: 0 },
);

const hasActiveFilter = computed(() =>
  !!searchQuery.value.trim()
  || Object.keys(activeFilters.value).length > 0
  || !!registryDidFilter.value
  || !!methodologyIdFilter.value,
);

// --- Row mapping ---

const rawProjects = computed<Project[]>(() => (data.value?.data ?? []).map(mapApiProject));
const { resolvedCode, resolvedName } = useGeocodedCountries(rawProjects);

const INVALID_COUNTRY = new Set([
  "not applicable",
  "not specified",
  "n/a",
  "na",
  "none",
  "not stated",
  "not available",
  "not provided",
  "unknown",
  "point",
  "multipoint",
  "linestring",
  "multilinestring",
  "polygon",
  "multipolygon",
  "geometrycollection",
]);
// A country cell should be a place name — never a URL, IPFS/file URI, or raw CID
// that leaked in from a geo/file field during mapping.
function looksLikeLocation(name: string): boolean {
  const v = name.trim();
  if (!v) return false;
  if (INVALID_COUNTRY.has(v.toLowerCase())) return false;
  if (/:\/\//.test(v)) return false; // ipfs:// http(s):// ar:// …
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{20,})$/i.test(v)) return false; // bare CID
  return true;
}
function displayCountry(p: Project): string | null {
  const name = resolvedName(p);
  if (!name) return null;
  return looksLikeLocation(name) ? name : null;
}

const vcViewerOpen = ref(false);
const vcViewerTitle = ref("");
const vcViewerData = ref<Record<string, any> | null>(null);

function viewVc(p: Project) {
  vcViewerTitle.value = p.name;
  vcViewerData.value = generateProjectVc(p);
  vcViewerOpen.value = true;
}

const pageProjects = computed(() =>
  rawProjects.value.map((p) => ({
    ...p,
    creditsFormatted: formatCredits(p.credits),
    methodologyLong: getMethodologyLongName(p.methodologyId, p.methodology),
    // Override country with the resolved display name so the cell shows a
    // clean name even though the server-side country FILTER (above) matches
    // the raw stored value.
    country: displayCountry(p) ?? "",
    createdDate: hederaTimestamp(p.sourceTimestamp),
  })),
);

const paginated = pageProjects;

const registryFilterName = computed(() => {
  if (!registryDidFilter.value) return null;
  return paginated.value[0]?.registry ?? null;
});

const methodologyFilterName = computed(() => {
  if (!methodologyIdFilter.value) return null;
  return paginated.value[0]?.methodology ?? null;
});

// applyPreset()'s sort.key is typed against this page's specific row union
// (keyof the mapped project row), while a saved search's criteria.sort.key is
// a plain string (saved searches are page-agnostic). The value is guaranteed
// valid at runtime — it was produced by this same page's own sortKey when the
// search was saved — so the cast here is safe, matching the `sortKey as
// string | null` cast already used elsewhere in this file's template.
function applySavedSearch(criteria: SavedSearchCriteria) {
  searchQuery.value = criteria.search || "";
  apiSearch.value = criteria.search || "";
  activeFilters.value = { ...(criteria.filters || {}) };
  if (criteria.sort) {
    sortKey.value = criteria.sort.key as ColumnKey;
    sortDir.value = criteria.sort.dir;
  } else {
    sortKey.value = null;
    sortDir.value = null;
  }
  currentPage.value = 1;
  syncToUrl();
}

const { isAuthenticated } = useAuth();
const savedSearchesRef = ref<InstanceType<typeof SavedSearchesRow> | null>(null);

const countryFilterOptions = computed(() =>
  [...filterOptions.value.countries].sort(naturalCompare),
);

const filters = computed<FilterOption[]>(() => [
  {
    key: "registry",
    label: t("projects.filters.registry"),
    multiSelect: true,
    searchable: true,
    options: filterOptions.value.registries.map((r) => ({
      value: r,
      label: r,
    })),
  },
  {
    key: "country",
    label: t("projects.filters.country"),
    multiSelect: true,
    searchable: true,
    options: countryFilterOptions.value.map((c) => ({ value: c, label: c })),
  },
  {
    key: "vintage",
    label: t("projects.filters.vintage"),
    type: "yearrange" as const,
    options: [],
  },
  {
    key: "isPipeline",
    label: t("projects.filters.pipeline"),
    options: [
      { value: "true", label: t("projects.pipelineFilter.pipeline") },
      { value: "false", label: t("projects.pipelineFilter.issued") },
    ],
  },
  {
    key: "lifecycleStage",
    label: t("projects.filters.lifecycleStage"),
    multiSelect: true,
    options: LIFECYCLE_STAGES.map((s) => ({
      value: s,
      label: t(`projects.lifecycleStages.${s}`),
    })),
  },
  {
    key: "expectedIssuanceYear",
    label: t("projects.filters.expectedIssuanceYear"),
    type: "yearrange" as const,
    options: [],
  },
  {
    key: "sector",
    label: t("projects.filters.sector"),
    multiSelect: true,
    options: filterOptions.value.sectors.map((s) => ({ value: s, label: s })),
  },
  {
    key: "sectoralScope",
    label: t("projects.filters.sectoralScope"),
    multiSelect: true,
    options: filterOptions.value.sectoralScopes.map((s) => ({
      value: s,
      label: s,
    })),
  },
  {
    key: "developer",
    label: t("projects.filters.developer"),
    multiSelect: true,
    searchable: true,
    options: filterOptions.value.developers.map((d) => ({
      value: d,
      label: d,
    })),
  },
  {
    key: "sdgs",
    label: t("projects.filters.sdgs"),
    multiSelect: true,
    options: SDG_LIST.map((s) => ({
      value: String(s.id),
      label: `SDG ${s.id}: ${s.name}`,
      icon: `/sdgs/E-WEB-Goal-${String(s.id).padStart(2, "0")}.png`,
    })),
  },
]);

// Human-friendly rendering of a filter value for the Save Search dialog's
// "Active Filters" summary. Range filters (vintage) are stored pipe-joined
// ("2022|2022") per useFilteredPagination's convention — shown as "A – B".
function formatFilterValue(value: string): string {
  if (!value.includes("|")) return value;
  const [from, to] = value.split("|");
  if (from && to) return `${from} – ${to}`;
  return from || to || value;
}

const filterSummary = computed(() => {
  const items: { label: string; value: string }[] = [];
  if (searchQuery.value.trim()) {
    items.push({ label: t("common.search"), value: searchQuery.value.trim() });
  }
  items.push(
    ...filters.value
      .filter(
        (f) => activeFilters.value[f.key] && activeFilters.value[f.key] !== "all",
      )
      .map((f) => ({
        label: f.label,
        value: formatFilterValue(activeFilters.value[f.key]),
      })),
  );
  return items;
});

const statusColor: Record<string, string> = {
  Registered: "bg-slate-100 text-slate-600",
  "Under Validation": "bg-stat-amber/10 text-stat-amber",
  Verified: "bg-stat-blue/10 text-stat-blue",
  Issuing: "bg-stat-green/10 text-stat-green",
  Completed: "bg-purple-50 text-purple-600",
};

const skeletonRows = computed(() =>
  Array.from({ length: pageSize.value }, (_, i) => i),
);

const downloading = ref(false);

async function downloadProjects() {
  if (downloading.value) return;
  downloading.value = true;
  try {
    const { fetchAllPages } = useApiDownload();
    const af = activeFilters.value;
    const query: Record<string, string | number> = {};
    const search = searchQuery.value?.trim();
    if (search) query.search = search;
    if (af.registry) query.registry = af.registry;
    if (af.country) query.country = af.country;
    if (af.developer) query.developer = af.developer;
    if (af.sector) query.sector = af.sector;
    if (af.sectoralScope) query.sectoralScope = af.sectoralScope;
    if (af.sdgs) query.sdgs = af.sdgs;
    if (af.vintage) query.vintageRange = af.vintage;
    if (af.lifecycleStage) query.lifecycleStage = af.lifecycleStage;
    if (af.isPipeline) query.isPipeline = af.isPipeline;
    if (af.expectedIssuanceYear) query.expectedIssuanceYearRange = af.expectedIssuanceYear;
    if (registryDidFilter.value) query.registryDid = registryDidFilter.value;
    if (methodologyIdFilter.value) query.methodologyId = methodologyIdFilter.value;

    let mapped = (
      await fetchAllPages(`/api/v1/${network.value}/projects`, query)
    ).map(mapApiProject).map((p) => ({
      ...p,
      createdDate: hederaTimestamp(p.sourceTimestamp),
    }));

    if (sortKey.value && sortDir.value) {
      const key = sortKey.value as string;
      const dir = sortDir.value === "asc" ? 1 : -1;
      mapped = [...mapped].sort((a, b) => {
        const aVal = (a as any)[key];
        const bVal = (b as any)[key];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === "number" && typeof bVal === "number")
          return (aVal - bVal) * dir;
        return naturalCompare(String(aVal), String(bVal)) * dir;
      });
    }

    const rows = buildProjectCsvRows(mapped, network.value);
    downloadCsv(`projects_export_${csvDateStamp()}.csv`, rows);
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <div class="space-y-0">
    <div class="px-4 sm:px-6 pt-6 pb-4">
      <h1 class="text-2xl font-bold text-foreground tracking-tight">
        {{ $t("projects.title") }}
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        {{ $t("projects.subtitle") }}
      </p>
    </div>

    <div v-if="registryDidFilter" class="px-4 sm:px-6 pb-2">
        <div class="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-sm">
            <span class="text-muted-foreground">{{ $t('projects.filteredByRegistry') }}</span>
            <span v-if="!pending" class="font-medium text-foreground">{{ registryFilterName ?? $t('projects.unknownRegistry') }}</span>
            <AppLink to="/projects" class="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                {{ $t('projects.clearRegistryFilter') }} ×
            </AppLink>
        </div>
    </div>

    <div v-if="methodologyIdFilter" class="px-4 sm:px-6 pb-2">
        <div class="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-sm">
            <span class="text-muted-foreground">{{ $t('projects.filteredByMethodology') }}</span>
            <span v-if="!pending" class="font-medium text-foreground">{{ methodologyFilterName ?? $t('projects.unknownMethodology') }}</span>
            <AppLink to="/projects" class="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                {{ $t('projects.clearMethodologyFilter') }} ×
            </AppLink>
        </div>
    </div>

    <div class="px-4 sm:px-6 pb-4">
      <FilterBar
        v-model="searchQuery"
        :filters="filters"
        :active-filters="activeFilters"
        :result-count="total"
        :total-count="total"
        :search-placeholder="$t('projects.searchPlaceholder')"
        @filter="setFilter"
        @clear="clearFilters"
      >
        <template #before-clear>
          <InfoTooltip
            v-if="isAuthenticated"
            v-show="savedSearchesRef?.hasActiveFilters"
            :text="savedSearchesRef?.atLimit ? $t('savedSearch.limitReachedTooltip', { max: savedSearchesRef?.limit }) : ''"
          >
            <button
              :class="[
                'inline-flex items-center gap-1 rounded-md py-1.5 text-xs transition-colors',
                savedSearchesRef?.atLimit
                  ? 'text-muted-foreground/50 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-primary',
              ]"
              @click="!savedSearchesRef?.atLimit && savedSearchesRef?.open()"
            >
              <Save class="h-3 w-3" />
              {{ $t("savedSearch.saveButton") }}
            </button>
          </InfoTooltip>
        </template>
      </FilterBar>

      <!-- Preset Templates -->
      <div data-tour="projects-quick-filters" class="flex items-center gap-2 mt-3 flex-wrap">
        <span class="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Sparkles class="h-3 w-3" /> {{ $t("projects.quickFilters") }}
        </span>

        <SavedSearchesRow
          ref="savedSearchesRef"
          section="projects"
          :search-query="searchQuery"
          :active-filters="activeFilters"
          :sort-key="sortKey as string | null"
          :sort-dir="sortDir"
          :summary="filterSummary"
          @apply="applySavedSearch"
        />

        <button
          :disabled="downloading"
          class="sm:ml-auto inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          @click="downloadProjects"
        >
          <Loader2 v-if="downloading" class="h-3.5 w-3.5 animate-spin" />
          <Download v-else class="h-3.5 w-3.5" />
          {{ $t("projects.downloadData") }}
        </button>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="hasActiveFilter" class="px-4 sm:px-6 pb-4">
      <div class="flex flex-wrap items-center gap-y-1.5 gap-x-4 rounded-xl border bg-muted/40 px-4 py-2.5 text-xs">
        <span class="font-semibold text-foreground">
          {{ $t("projects.projectsFound", { count: total }) }}
        </span>
        <span class="text-muted-foreground hidden sm:inline">&middot;</span>
        <span class="text-muted-foreground">
          {{ $t("projects.totalIssuances") }}
          <strong class="text-foreground ml-0.5 font-semibold">{{ formatCredits(summaryStats.totalIssuances) }}</strong>
        </span>
        <span class="text-muted-foreground hidden sm:inline">&middot;</span>
        <span class="text-muted-foreground">
          {{ $t("projects.countries") }}
          <strong class="text-foreground ml-0.5 font-semibold">{{ summaryStats.uniqueCountries }}</strong>
        </span>
        <span class="text-muted-foreground hidden sm:inline">&middot;</span>
        <span class="text-muted-foreground">
          {{ $t("projects.registries") }}
          <strong class="text-foreground ml-0.5 font-semibold">{{ summaryStats.uniqueRegistries }}</strong>
        </span>
      </div>
    </div>

    <div class="px-4 sm:px-6 pb-8">
      <div data-tour="projects-table" class="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div class="overflow-x-auto w-full">
          <table class="w-full text-left border-collapse text-sm table-auto min-w-[1200px]">
            <thead class="bg-muted/40 border-b">
              <tr>
                <th class="w-12 py-3 px-4 text-center">
                  <Columns2 class="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                </th>
                <SortableHeader
                  :label="$t('projects.columns.project')"
                  sort-key="name"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="w-[22%] min-w-[240px]"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.country')"
                  sort-key="country"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="w-[12%] min-w-[130px]"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.registry')"
                  sort-key="registry"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="w-[12%] min-w-[130px]"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.methodology')"
                  sort-key="methodology"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="w-[14%] min-w-[140px] max-w-[200px] truncate"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.sector')"
                  sort-key="sector"
                  :tooltip="$t('projects.sectorTooltip')"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="w-[12%] min-w-[130px]"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.issuances')"
                  sort-key="issuanceCount"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="w-[8%] min-w-[90px] !text-right"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.lifecycleStage')"
                  sort-key="lifecycleStage"
                  :tooltip="$t('projects.stageTooltip')"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="w-[10%] min-w-[110px]"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.expectedIssuanceYear')"
                  sort-key="expectedIssuanceYear"
                  :tooltip="$t('projects.expectedIssuanceYearTooltip')"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="w-[8%] min-w-[90px]"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.createdDate')"
                  sort-key="createdDate"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="w-[9%] min-w-[105px]"
                  @sort="toggleSort($event as any)"
                />
                <th class="w-[8%] min-w-[95px] py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span class="inline-flex items-center gap-1">
                    {{ $t("projects.columns.sdgs") }}
                    <InfoTooltip :text="$t('projects.sdgsTooltip')" />
                  </span>
                </th>
                <th class="w-[5%] min-w-[70px] py-3 px-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span class="inline-flex items-center gap-1 justify-center">
                    {{ $t("projects.columns.rawData") }}
                    <InfoTooltip :text="$t('tooltips.viewRawData')" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <!-- Loading skeleton -->
              <template v-if="pending && paginated.length === 0">
                <tr v-for="i in skeletonRows" :key="`sk-${i}`">
                  <td v-for="col in 12" :key="col" class="py-3.5 px-4">
                    <Skeleton class="h-4 w-full" />
                  </td>
                </tr>
              </template>

              <template v-else>
                <tr
                  v-for="p in paginated"
                  :key="p.id"
                  class="hover:bg-muted/20 transition-colors cursor-pointer group/row"
                >
                  <td class="py-3.5 px-4 text-center align-middle">
                    <button
                      :class="[
                        isSelected(p.id)
                          ? 'text-primary bg-primary/10 hover:bg-primary/20'
                          : !canAdd
                            ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                      ]"
                      :disabled="!canAdd && !isSelected(p.id)"
                      @click.stop="toggleProject(p.id, p.name)"
                    >
                      <CheckSquare v-if="isSelected(p.id)" class="h-3.5 w-3.5" />
                      <Square v-else class="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td class="py-3.5 px-4 align-middle font-medium">
                    <AppLink
                      :to="`/projects/${p.id}`"
                      :title="p.name"
                      class="block line-clamp-2 text-foreground hover:text-primary transition-colors leading-relaxed"
                    >
                      {{ p.name }}
                    </AppLink>
                  </td>

                  <td class="py-3.5 px-4 align-middle text-muted-foreground truncate">
                    <div v-if="displayCountry(p)" class="flex items-center gap-2 max-w-full">
                      <CountryFlag :code="resolvedCode(p)" size="sm" class="shrink-0" />
                      <div class="min-w-0 flex-1">
                        <TruncatedText :text="displayCountry(p)" :max-length="25" />
                      </div>
                    </div>
                    <span v-else class="text-muted-foreground/50 text-xs pl-1">—</span>
                  </td>

                  <td class="py-3.5 px-4 align-middle text-muted-foreground text-xs truncate">
                    <TruncatedText :text="p.registry" />
                  </td>

                  <td class="py-3.5 px-4 align-middle max-w-[200px]">
                    <span
                      class="block w-full text-xs bg-muted/60 text-muted-foreground border border-muted rounded px-2 py-1 font-mono"
                    >
                      <TruncatedText :text="p.methodology" />
                    </span>
                  </td>

                  <td class="py-3.5 px-4 align-middle text-muted-foreground text-xs truncate">
                    <TruncatedText :text="p.sector" />
                  </td>

                  <td class="py-3.5 px-4 align-middle text-center tabular-nums font-semibold text-sm">
                    <AppLink
                      v-if="p.projectKey && p.issuanceCount"
                      :to="`/credits?projectKey=${encodeURIComponent(p.projectKey)}`"
                      class="text-foreground hover:text-primary hover:underline transition-colors"
                      @click.stop
                    >
                      {{ formatCredits(p.issuanceCount) }}
                    </AppLink>
                    <span v-else class="text-muted-foreground/60">{{ formatCredits(p.issuanceCount ?? 0) }}</span>
                  </td>

                  <td class="py-3.5 px-4 align-middle whitespace-nowrap">
                    <span
                      :class="[
                        lifecycleStageColor[p.lifecycleStage ?? ''] || 'bg-muted text-muted-foreground',
                        'text-[11px] font-semibold rounded-full px-2.5 py-0.5 tracking-wide uppercase',
                      ]"
                    >
                      {{ $t(`projects.lifecycleStages.${p.lifecycleStage}`) }}
                    </span>
                  </td>

                  <td class="py-3.5 px-4 align-middle text-muted-foreground font-medium">
                    {{ p.lifecycleStage !== "Issued" ? p.expectedIssuanceYear ?? $t("projects.tbd") : "—" }}
                  </td>

                  <td class="py-3.5 px-4 align-middle text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                    {{ p.createdDate || "—" }}
                  </td>

                  <td class="w-px py-3.5 px-3 align-middle whitespace-nowrap">
                    <div class="flex items-center min-w-max">
                      <SdgBadges :ids="p.sdgs" :max="2" />
                    </div>
                  </td>

                  <td class="w-px py-3.5 px-3 align-middle text-center">
                    <div class="flex items-center justify-center min-w-max mx-auto">
                      <button
                        class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors group-hover/row:text-foreground"
                        @click.stop="viewVc(p)"
                      >
                        <FileJson class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              </template>

              <tr v-if="paginated.length === 0 && !pending">
                <td
                  colspan="12"
                  class="py-12 text-center text-sm text-muted-foreground"
                >
                  {{ $t("projects.noMatch") }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total-pages="totalPages"
        :total-items="total"
      />
    </div>

    <VcJsonViewer
      :open="vcViewerOpen"
      :title="vcViewerTitle"
      :data="vcViewerData"
      @close="vcViewerOpen = false"
    />
  </div>

  <!-- Floating comparison bar -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="selectedEntries.length > 0"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <div
          class="pointer-events-auto flex items-center gap-3 rounded-xl border bg-card shadow-2xl px-4 py-3 min-w-[340px] max-w-[700px]"
        >
          <Columns2 class="h-4 w-4 text-primary shrink-0" />
          <span class="text-sm font-medium text-foreground shrink-0">
            {{
              $t("projects.compare.comparing", {
                count: selectedEntries.length,
              })
            }}
          </span>

          <!-- Project chips -->
          <div class="flex items-center gap-1.5 flex-1 flex-wrap min-w-0">
            <span
              v-for="entry in selectedEntries"
              :key="entry.id"
              class="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium max-w-[160px]"
            >
              <span class="truncate">{{ entry.name }}</span>
              <button
                class="shrink-0 rounded-full hover:bg-primary/20 transition-colors p-0.5"
                :title="$t('common.close')"
                @click="removeProject(entry.id)"
              >
                <X class="h-2.5 w-2.5" />
              </button>
            </span>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              class="text-xs text-muted-foreground hover:text-foreground transition-colors"
              @click="clearAll"
            >
              {{ $t("projects.compare.clearAll") }}
            </button>
            <button
              :disabled="selectedEntries.length < 2"
              :class="[
                selectedEntries.length >= 2
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              ]"
              @click="goToCompare"
            >
              <Columns2 class="h-3 w-3" />
              {{ $t("projects.compare.compareButton") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
