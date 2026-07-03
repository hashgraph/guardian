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
} from "lucide-vue-next";
import type { FilterOption } from "~/components/shared/FilterBar.vue";
import { formatCredits } from "~/lib/format";
import { naturalCompare } from "~/lib/utils";
import { SDG_LIST } from "~/lib/sdgs";
import { generateProjectVc } from "~/lib/mock-vc";
import { MOCK_TRANSFERS, MOCK_RETIREMENTS } from "~/data";
import { getMethodologyLongName } from "~/lib/methodologies";
import type { Project } from "~/types/models";
import {
  downloadCsv,
  csvDateStamp,
  buildProjectCsvRows,
} from "~/lib/csv-export";
import { mapApiProject } from "~/composables/useProjects";

const { t } = useI18n();
const { network } = useNetwork();
const { projects, total, filterOptions, pending } = useProjects();
const {
  selectedEntries,
  canAdd,
  isSelected,
  toggleProject,
  removeProject,
  clearAll,
  goToCompare,
} = useProjectComparison();
const { resolvedCode, resolvedName } = useGeocodedCountries(projects);

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

// Aggregate transferred/retired per project
const transferredByProject = computed(() => {
  const map: Record<string, number> = {};
  for (const t of MOCK_TRANSFERS) {
    map[t.projectId] = (map[t.projectId] || 0) + t.quantity;
  }
  return map;
});
const retiredByProject = computed(() => {
  const map: Record<string, number> = {};
  for (const r of MOCK_RETIREMENTS) {
    map[r.projectId] = (map[r.projectId] || 0) + r.quantity;
  }
  return map;
});

const vcViewerOpen = ref(false);
const vcViewerTitle = ref("");
const vcViewerData = ref<Record<string, any> | null>(null);

function viewVc(p: Project) {
  vcViewerTitle.value = p.name;
  vcViewerData.value = generateProjectVc(p);
  vcViewerOpen.value = true;
}

const allProjects = computed(() =>
  projects.value.map((p) => ({
    ...p,
    creditsFormatted: formatCredits(p.credits),
    transferred: transferredByProject.value[p.id] || 0,
    transferredFormatted: formatCredits(transferredByProject.value[p.id] || 0),
    retired: retiredByProject.value[p.id] || 0,
    retiredFormatted: formatCredits(retiredByProject.value[p.id] || 0),
    methodologyLong: getMethodologyLongName(p.methodologyId, p.methodology),
    // Override country with the resolved display name so filters and sorting
    // use the same value that appears in the column (not raw coordinates).
    country: displayCountry(p) ?? "",
  })),
);

const countryFilterOptions = computed(() =>
  [...new Set(allProjects.value.map((p) => p.country).filter(Boolean))].sort(
    naturalCompare,
  ),
);

// Navigation from a registry-scoped link (e.g. the Registry detail page's
// "Projects" card) filters by DID — registries aren't unique by name (the
// registries list can hold multiple entries sharing a display name with
// different DIDs), so name-based matching would silently mix in projects
// from the wrong registry. Narrowed here, before useFilteredPagination, so
// the manual filters/search/sort and all result counts stay consistent with
// the scoped set. Separate from the manual `registry` FilterBar filter below.
const route = useRoute();
const registryDidFilter = computed(() =>
  typeof route.query.registryDid === "string" ? route.query.registryDid : null,
);
const scopedProjects = computed(() =>
  registryDidFilter.value
    ? allProjects.value.filter((p) => p.registryDid === registryDidFilter.value)
    : allProjects.value,
);
const registryFilterName = computed(() => {
  if (!registryDidFilter.value) return null;
  return scopedProjects.value[0]?.registry ?? null;
});

const {
  searchQuery,
  currentPage,
  paginated,
  filtered,
  totalPages,
  pageSize,
  activeFilters,
  sortKey,
  sortDir,
  toggleSort,
  setFilter,
  clearFilters,
  applyPreset,
} = useFilteredPagination(scopedProjects, {
  searchFields: [
    "name",
    "country",
    "methodology",
    "registry",
    "sector",
    "sectoralScope",
    "developer",
  ],
  pageSize: 10,
  defaultSort: { key: "createdAt", dir: "desc" },
  arrayFields: ["sdgs"],
  // registryDid drives the separate scopedProjects narrowing above, not the
  // manual FilterBar `registry` filter — excluding it here stops
  // parseFiltersFromQuery from also picking it up as a generic activeFilters
  // entry, which would persist (stuck at mount-time value) even after
  // navigating away and silently keep the list scoped after "Clear filter".
  excludeFromQuery: ["registryDid"],
});

const presets = computed(() => [
  {
    label: t("projects.presets.goldStandard"),
    filters: { registry: "Gold Standard" } as Record<string, string>,
  },
  {
    label: t("projects.presets.sdg13"),
    filters: { sdgs: "13" } as Record<string, string>,
  },
  {
    label: t("projects.presets.vintage2022"),
    filters: { vintage: "2022|2022" } as Record<string, string>,
  },
  {
    label: t("projects.presets.issuingEnergy"),
    filters: { status: "Issuing", sector: "Energy" } as Record<string, string>,
  },
  {
    label: t("projects.presets.glycolRecycling"),
    filters: { sector: "Glycol Recycling" } as Record<string, string>,
  },
]);

function isPresetActive(preset: { filters: Record<string, string> }): boolean {
  const af = activeFilters.value;
  const entries = Object.entries(preset.filters);
  return (
    entries.length > 0 && entries.every(([key, value]) => af[key] === value)
  );
}

// Summary statistics for filtered results
const summaryStats = computed(() => {
  const f = filtered.value;
  const totalIssuances = f.reduce((sum, p) => sum + (p.issuanceCount ?? 0), 0);
  const uniqueCountries = new Set(f.map((p) => p.country)).size;
  const uniqueRegistries = new Set(f.map((p) => p.registry)).size;
  return { totalIssuances, uniqueCountries, uniqueRegistries };
});

const filters = computed<FilterOption[]>(() => [
  {
    key: "status",
    label: t("projects.filters.status"),
    multiSelect: true,
    options: filterOptions.value.statuses.map((s) => ({ value: s, label: s })),
  },
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
    if (af.status) query.status = af.status;
    if (af.registry) query.registry = af.registry;
    if (af.country) query.country = af.country;
    if (af.developer) query.developer = af.developer;
    // sector, sectoralScope, sdgs, vintage range — applied client-side below

    let mapped = (
      await fetchAllPages(`/api/v1/${network.value}/projects`, query)
    ).map(mapApiProject);

    if (af.sector) {
      const sectors = af.sector
        .split(",")
        .map((s: string) => s.trim().toLowerCase());
      mapped = mapped.filter((p) =>
        sectors.some((s) => (p.sector ?? "").toLowerCase().includes(s)),
      );
    }
    if (af.sectoralScope) {
      const scope = af.sectoralScope.toLowerCase();
      mapped = mapped.filter((p) =>
        (p.sectoralScope ?? "").toLowerCase().includes(scope),
      );
    }
    if (af.sdgs) {
      const selectedSdgs = af.sdgs.split(",").map((s: string) => s.trim());
      mapped = mapped.filter(
        (p) =>
          Array.isArray(p.sdgs) &&
          selectedSdgs.some((s) => p.sdgs.map(String).includes(s)),
      );
    }
    if (af.vintage) {
      const [from, to] = af.vintage.split("|");
      mapped = mapped.filter((p) => {
        const v = String(p.vintage ?? "");
        if (from && v < from) return false;
        if (to && v > to) return false;
        return true;
      });
    }

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
    <div class="px-6 pt-6 pb-4">
      <h1 class="text-2xl font-bold text-foreground">
        {{ $t("projects.title") }}
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        {{ $t("projects.subtitle") }}
      </p>
    </div>

    <div v-if="registryDidFilter" class="px-6 pb-2">
        <div class="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-sm">
            <span class="text-muted-foreground">{{ $t('projects.filteredByRegistry') }}</span>
            <span v-if="!pending" class="font-medium text-foreground">{{ registryFilterName ?? $t('projects.unknownRegistry') }}</span>
            <NuxtLink to="/projects" class="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                {{ $t('projects.clearRegistryFilter') }} ×
            </NuxtLink>
        </div>
    </div>

    <div class="px-6 pb-3">
      <FilterBar
        v-model="searchQuery"
        :filters="filters"
        :active-filters="activeFilters"
        :result-count="filtered.length"
        :total-count="total"
        :search-placeholder="$t('projects.searchPlaceholder')"
        @filter="setFilter"
        @clear="clearFilters"
      />

      <!-- Preset Templates -->
      <div class="flex items-center gap-2 mt-2.5 flex-wrap">
        <span class="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Sparkles class="h-3 w-3" /> {{ $t("projects.quickFilters") }}
        </span>
        <button
          v-for="preset in presets"
          :key="preset.label"
          :class="[
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
            isPresetActive(preset)
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-primary/25 text-muted-foreground hover:bg-muted hover:text-foreground',
          ]"
          @click="applyPreset({ filters: preset.filters })"
        >
          {{ preset.label }}
        </button>
        <button
          :disabled="downloading"
          class="ml-auto inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="downloadProjects"
        >
          <Loader2 v-if="downloading" class="h-3.5 w-3.5 animate-spin" />
          <Download v-else class="h-3.5 w-3.5" />
          {{ $t("projects.downloadData") }}
        </button>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="filtered.length !== total" class="px-6 pb-3">
      <div
        class="flex items-center gap-4 rounded-lg bg-muted/50 px-4 py-2.5 text-xs"
      >
        <span class="font-medium text-foreground">{{
          $t("projects.projectsFound", { count: filtered.length })
        }}</span>
        <span class="text-muted-foreground">&middot;</span>
        <span class="text-muted-foreground"
          >{{ $t("projects.totalIssuances") }}
          <strong class="text-foreground">{{
            formatCredits(summaryStats.totalIssuances)
          }}</strong></span
        >
        <span class="text-muted-foreground">&middot;</span>
        <span class="text-muted-foreground"
          >{{ $t("projects.countries") }}
          <strong class="text-foreground">{{
            summaryStats.uniqueCountries
          }}</strong></span
        >
        <span class="text-muted-foreground">&middot;</span>
        <span class="text-muted-foreground"
          >{{ $t("projects.registries") }}
          <strong class="text-foreground">{{
            summaryStats.uniqueRegistries
          }}</strong></span
        >
      </div>
    </div>

    <div class="px-6 pb-6">
      <div class="rounded-xl border bg-card overflow-hidden">
        <div class="overflow-x-auto">
          <table
            class="table-fixed text-sm"
            style="min-width: 1360px; width: 100%"
          >
            <colgroup>
              <col style="width: 3%" />
              <col style="width: 14%" />
              <col style="width: 10%" />
              <col style="width: 7%" />
              <col style="width: 11%" />
              <col style="width: 7%" />
              <col style="width: 6%" />
              <col style="width: 8%" />
              <col style="width: 8%" />
              <col style="width: 8%" />
              <col style="width: 10%" />
              <col style="width: 8%" />
            </colgroup>
            <thead class="bg-muted/30">
              <tr class="border-b">
                <th
                  class="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  <span class="inline-flex items-center gap-1"
                    ><Columns2 class="h-3.5 w-3.5"
                  /></span>
                </th>
                <SortableHeader
                  :label="$t('projects.columns.project')"
                  sort-key="name"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.country')"
                  sort-key="country"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.registry')"
                  sort-key="registry"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.methodology')"
                  sort-key="methodology"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.sector')"
                  sort-key="sector"
                  :tooltip="$t('projects.sectorTooltip')"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.issuances')"
                  sort-key="issuanceCount"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="!text-right"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.transferred')"
                  sort-key="transferred"
                  mock
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="!text-right"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.retired')"
                  sort-key="retired"
                  mock
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  class="!text-right"
                  @sort="toggleSort($event as any)"
                />
                <SortableHeader
                  :label="$t('projects.columns.status')"
                  sort-key="status"
                  :active-sort-key="sortKey as string"
                  :sort-dir="sortDir"
                  @sort="toggleSort($event as any)"
                />
                <th
                  class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  <span class="inline-flex items-center gap-0.5">
                    {{ $t("projects.columns.sdgs") }}
                    <InfoTooltip :text="$t('projects.sdgsTooltip')" />
                  </span>
                </th>
                <th
                  class="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  <span class="inline-flex items-center gap-0.5"
                    >{{ $t("projects.columns.rawData") }}
                    <InfoTooltip :text="$t('tooltips.viewRawData')"
                  /></span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <!-- Loading skeleton -->
              <template v-if="pending && paginated.length === 0">
                <tr v-for="i in skeletonRows" :key="`sk-${i}`">
                  <td v-for="col in 12" :key="col" class="py-3 px-4">
                    <Skeleton class="h-4 w-full max-w-[120px]" />
                  </td>
                </tr>
              </template>

              <template v-else>
                <tr
                  v-for="p in paginated"
                  :key="p.id"
                  class="hover:bg-muted/30 transition-colors cursor-pointer align-top"
                >
                  <td class="py-3 px-3 text-center">
                    <button
                      :class="[
                        isSelected(p.id)
                          ? 'text-primary bg-primary/10 hover:bg-primary/20'
                          : !canAdd
                            ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                      ]"
                      :title="
                        isSelected(p.id)
                          ? $t('projects.compare.removeFromCompare')
                          : !canAdd
                            ? $t('projects.compare.maxSelected')
                            : $t('projects.compare.addToCompare')
                      "
                      :disabled="!canAdd && !isSelected(p.id)"
                      @click.stop="toggleProject(p.id, p.name)"
                    >
                      <CheckSquare
                        v-if="isSelected(p.id)"
                        class="h-3.5 w-3.5"
                      />
                      <Square v-else class="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td class="py-3 px-4">
                    <NuxtLink
                      :to="`/projects/${p.id}`"
                      class="font-medium text-foreground hover:text-primary transition-colors break-words"
                      >{{ p.name }}</NuxtLink
                    >
                  </td>
                  <td class="py-3 px-4 text-muted-foreground">
                    <template v-if="displayCountry(p)">
                      <div
                        class="group relative inline-flex items-center gap-1.5"
                      >
                        <CountryFlag :code="resolvedCode(p)" size="sm" />
                        <span class="hidden md:inline">{{
                          displayCountry(p)
                        }}</span>
                        <div
                          class="md:hidden pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-[100]"
                        >
                          <div
                            class="whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-[11px] text-background shadow-lg"
                          >
                            {{ displayCountry(p) }}
                          </div>
                          <div
                            class="mx-auto h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground"
                          />
                        </div>
                      </div>
                    </template>
                    <span v-else class="text-xs">—</span>
                  </td>
                  <td
                    class="py-3 px-4 text-muted-foreground text-xs break-words"
                  >
                    {{ p.registry }}
                  </td>
                  <td class="py-3 px-4 max-w-0">
                    <span
                      class="block text-xs bg-muted rounded px-1.5 py-0.5 cursor-default break-words"
                      >{{ p.methodology }}</span
                    >
                  </td>
                  <td class="py-3 px-4">
                    <span
                      class="block text-xs text-muted-foreground cursor-default truncate"
                      >{{ p.sector }}</span
                    >
                  </td>
                  <td class="py-3 px-4 text-right tabular-nums font-medium">
                    <NuxtLink
                      v-if="p.projectKey && p.issuanceCount"
                      :to="`/credits?projectKey=${encodeURIComponent(p.projectKey)}`"
                      class="hover:text-primary hover:underline transition-colors"
                      @click.stop
                    >
                      {{ p.issuanceCount }}
                    </NuxtLink>
                    <span v-else>{{ p.issuanceCount ?? 0 }}</span>
                  </td>
                  <td
                    class="py-3 px-4 text-right tabular-nums text-muted-foreground"
                  >
                    {{ p.transferredFormatted }}
                  </td>
                  <td
                    class="py-3 px-4 text-right tabular-nums text-muted-foreground"
                  >
                    {{ p.retiredFormatted }}
                  </td>
                  <td class="py-3 px-4">
                    <span
                      :class="[
                        statusColor[p.status] ||
                          'bg-muted text-muted-foreground',
                        'text-xs font-medium rounded-full px-2 py-0.5',
                      ]"
                    >
                      {{ p.status }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <SdgBadges :ids="p.sdgs" :max="2" />
                  </td>
                  <td class="py-3 px-3 text-center">
                    <button
                      class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      :title="$t('common.viewRawData')"
                      @click.stop="viewVc(p)"
                    >
                      <FileJson class="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
                <tr v-if="paginated.length === 0">
                  <td
                    colspan="12"
                    class="py-12 text-center text-sm text-muted-foreground"
                  >
                    {{ $t("projects.noMatch") }}
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
        :total-items="filtered.length"
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
