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
import { getMethodologyLongName } from "~/lib/methodologies";
import { LIFECYCLE_STAGES, lifecycleStageColor } from "~/lib/lifecycle";
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

const vcViewerOpen = ref(false);
const vcViewerTitle = ref("");
const vcViewerData = ref<Record<string, any> | null>(null);

function viewVc(p: Project) {
  vcViewerTitle.value = p.name;
  vcViewerData.value = generateProjectVc(p);
  vcViewerOpen.value = true;
}

function isPipelineStage(p: { lifecycleStage?: string }): boolean {
  return p.lifecycleStage !== "Issued";
}

const allProjects = computed(() =>
  projects.value.map((p) => ({
    ...p,
    creditsFormatted: formatCredits(p.credits),
    methodologyLong: getMethodologyLongName(p.methodologyId, p.methodology),
    // Override country with the resolved display name so filters and sorting
    // use the same value that appears in the column (not raw coordinates).
    country: displayCountry(p) ?? "",
    isPipeline: isPipelineStage(p),
  })),
);

const countryFilterOptions = computed(() =>
  [...new Set(allProjects.value.map((p) => p.country).filter(Boolean))].sort(
    naturalCompare,
  ),
);

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
} = useFilteredPagination(allProjects, {
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
  {
    label: t("projects.presets.pipeline"),
    filters: { isPipeline: "true" } as Record<string, string>,
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
    if (af.isPipeline) {
      mapped = mapped.filter(
        (p) => String(isPipelineStage(p)) === af.isPipeline,
      );
    }
    if (af.lifecycleStage) {
      const stages = af.lifecycleStage.split("|").filter(Boolean);
      mapped = mapped.filter((p) => stages.includes(String(p.lifecycleStage)));
    }
    if (af.expectedIssuanceYear) {
      const [from, to] = af.expectedIssuanceYear.split("|");
      mapped = mapped.filter((p) => {
        const y = p.expectedIssuanceYear;
        if (!y) return false;
        if (from && y < from) return false;
        if (to && y > to) return false;
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
  <div class="w-full max-w-[1600px] mx-auto space-y-0">
    <div class="px-4 sm:px-6 pt-6 pb-4">
      <h1 class="text-2xl font-bold text-foreground tracking-tight">
        {{ $t("projects.title") }}
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        {{ $t("projects.subtitle") }}
      </p>
    </div>

    <div class="px-4 sm:px-6 pb-4">
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
      <div class="flex items-center gap-2 mt-3 flex-wrap">
        <span class="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Sparkles class="h-3 w-3" /> {{ $t("projects.quickFilters") }}
        </span>
        <div class="flex flex-wrap gap-1.5 items-center">
          <button
            v-for="preset in presets"
            :key="preset.label"
            :class="[
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
              isPresetActive(preset)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted-foreground/20 text-muted-foreground hover:bg-muted hover:text-foreground',
            ]"
            @click="applyPreset({ filters: preset.filters })"
          >
            {{ preset.label }}
          </button>
        </div>
        
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
    <div v-if="filtered.length !== total" class="px-4 sm:px-6 pb-4">
      <div class="flex flex-wrap items-center gap-y-1.5 gap-x-4 rounded-xl border bg-muted/40 px-4 py-2.5 text-xs">
        <span class="font-semibold text-foreground">
          {{ $t("projects.projectsFound", { count: filtered.length }) }}
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
      <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
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
                  <td v-for="col in 11" :key="col" class="py-3.5 px-4">
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
                    <NuxtLink
                      :to="`/projects/${p.id}`"
                      :title="p.name"
                      class="block line-clamp-2 text-foreground hover:text-primary transition-colors leading-relaxed"
                    >
                      {{ p.name }}
                    </NuxtLink>
                  </td>
                  
                  <td class="py-3.5 px-4 align-middle text-muted-foreground truncate">
                    <div v-if="displayCountry(p)" class="flex items-center gap-2 max-w-full">
                      <CountryFlag :code="resolvedCode(p)" size="sm" class="shrink-0" />
                      <span class="truncate" :title="displayCountry(p) ?? ''">
                        {{ displayCountry(p) }}
                      </span>
                    </div>
                    <span v-else class="text-muted-foreground/50 text-xs pl-1">—</span>
                  </td>
                  
                  <td class="py-3.5 px-4 align-middle text-muted-foreground text-xs truncate">
                    <span class="truncate block" :title="p.registry">{{ p.registry }}</span>
                  </td>
                  
                  <td class="py-3.5 px-4 align-middle max-w-[200px]">
                    <span
                      class="block w-full truncate text-xs bg-muted/60 text-muted-foreground border border-muted rounded px-2 py-1 font-mono cursor-help"
                      :title="p.methodology"
                    >
                      {{ p.methodology }}
                    </span>
                  </td>
                  
                  <td class="py-3.5 px-4 align-middle text-muted-foreground text-xs truncate">
                    <span class="truncate block" :title="p.sector">{{ p.sector }}</span>
                  </td>
                  
                  <td class="py-3.5 px-4 align-middle text-center tabular-nums font-semibold text-sm">
                    <NuxtLink
                      v-if="p.projectKey && p.issuanceCount"
                      :to="`/credits?projectKey=${encodeURIComponent(p.projectKey)}`"
                      class="text-foreground hover:text-primary hover:underline transition-colors"
                      @click.stop
                    >
                      {{ p.issuanceCount }}
                    </NuxtLink>
                    <span v-else class="text-muted-foreground/60">{{ p.issuanceCount ?? 0 }}</span>
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
                  colspan="11"
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
