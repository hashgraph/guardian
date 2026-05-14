<script setup lang="ts">
import { BookOpen, Copy, Check } from "lucide-vue-next";
import type { FilterField } from "~/components/shared/DataFilters.vue";
import type {
  MethodologySortKey,
  MethodologySortDir,
} from "~/composables/api/useMethodologiesApi";
import type { SortDirection } from "~/composables/useFilteredPagination";
import { formatCredits } from "~/lib/format";
import { useRegistriesApi } from "~/composables/api/useRegistriesApi";

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
  registryDid: "registryDid",
  projects: "projects",
  issuances: "issuances",
  schemas: "schemas",
  description: "description",
  id: "id",
  createdAt: "createdAt",
};

// Reactive query state
const route = useRoute();
const initialFilters: Record<string, any> = {};
if (route.query.registryDid && typeof route.query.registryDid === "string") {
  initialFilters.registryDid = route.query.registryDid;
}
const filters = ref<Record<string, any>>(initialFilters);
const currentPage = ref(1);
const pageSize = ref(10);

// Placeholder search ref kept for the composable signature.
const searchQuery = ref("");

// Fetch the registries list once so the registry filter can render as a
// labeled dropdown (registry name + topic id) rather than a free-text DID.
const registriesPage = ref(1);
const registriesLimit = ref(500);
const registriesSearch = ref('');
const registriesSortBy = ref(null);
const registriesSortDir = ref(null);
const { data: registriesData } = useRegistriesApi({
  page: registriesPage,
  limit: registriesLimit,
  search: registriesSearch,
  network: computed(() => network.value),
  sortBy: registriesSortBy as any,
  sortDir: registriesSortDir as any,
});

const registryDidOptions = computed(() => {
  // Surface the registry's topic ID (e.g. 0.0.3054097) as the primary label
  // — that's the "Registry ID" the rest of the UI shows. The registry name
  // sits in parens for readability. The submitted value is still the DID,
  // because that's what the methodologies endpoint filters by.
  // DataFilters auto-prepends an empty `<option value="">{{ placeholder }}</option>`
  // for select fields, so we don't include the "All" option here.
  return (registriesData.value?.data ?? [])
    .filter((r: any) => r.did && r.relatedTopicId)
    .map((r: any) => ({
      value: r.did as string,
      label: r.name
        ? `${r.relatedTopicId} — ${r.name}`
        : (r.relatedTopicId as string),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const filterFields = computed<FilterField[]>(() => [
  {
    key: "name",
    label: t("methodologies.filters.name"),
    type: "text",
    placeholder: t("methodologies.filters.namePlaceholder"),
    width: "md",
  },
  {
    key: "registryDid",
    label: t("methodologies.filters.registryId"),
    type: "select",
    width: "md",
    placeholder: t("methodologies.filters.registryAll"),
    options: registryDidOptions.value,
  },
  {
    key: "registryName",
    label: t("methodologies.filters.registryName"),
    type: "text",
    placeholder: t("methodologies.filters.registryNamePlaceholder"),
    width: "md",
  },
  {
    key: "id",
    label: t("methodologies.filters.id"),
    type: "text",
    placeholder: "0.0.xxxx",
    width: "sm",
  },
  {
    key: "description",
    label: t("methodologies.filters.description"),
    type: "text",
    width: "md",
  },
  {
    key: "decodeStatus",
    label: t("methodologies.filters.decoded"),
    type: "select",
    width: "sm",
    options: [
      { value: "", label: t("methodologies.filters.decodedAll") },
      { value: "success", label: t("methodologies.decodeStatus.success") },
      { value: "failed", label: t("methodologies.decodeStatus.failed") },
      { value: "pending", label: t("methodologies.decodeStatus.pending") },
      { value: "unknown", label: t("methodologies.decodeStatus.unknown") },
    ],
  },
]);

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

const methodologies = computed<any[]>(() => data.value?.data ?? []);
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

    <div class="px-6 pb-3">
      <DataFilters v-model="filters" :fields="filterFields" />
    </div>

    <div class="px-6 pb-6">
      <div class="rounded-xl border bg-card overflow-hidden">
        <table class="w-full text-sm table-fixed">
          <colgroup>
            <col class="w-[18%]" />
            <col class="w-[13%]" />
            <col class="w-[9%]" />
            <col class="w-[7%]" />
            <col class="w-[8%]" />
            <col class="w-[6%]" />
            <col class="w-[18%]" />
            <col class="w-[10%]" />
            <col class="w-[5%]" />
            <col class="w-[6%]" />
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
              <th class="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {{ $t('methodologies.columns.type') }}
              </th>
              <SortableHeader
                :label="$t('methodologies.columns.projects')"
                sort-key="projects"
                align="right"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
                @sort="toggleSort($event)"
              />
              <SortableHeader
                :label="$t('methodologies.columns.issuance')"
                sort-key="issuances"
                align="right"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
                @sort="toggleSort($event)"
              />
              <SortableHeader
                :label="$t('methodologies.columns.schemaCount')"
                sort-key="schemas"
                align="right"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
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
              <SortableHeader
                :label="$t('methodologies.columns.version')"
                sort-key="version"
                :active-sort-key="sortKey as string"
                :sort-dir="sortDir"
                @sort="toggleSort($event)"
              />
              <th class="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                  <NuxtLink
                    v-if="r.registryDid"
                    :to="`/registries?did=${encodeURIComponent(r.registryDid)}`"
                    :title="r.registryDid"
                    class="text-sm text-foreground hover:text-primary hover:underline transition-colors break-words"
                  >
                    {{ r.registryName || r.registryDid }}
                  </NuxtLink>
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
                  <span :title="r.stats.issuanceCount !== r.stats.instanceIssuanceCount
                    ? `${r.stats.issuanceCount} total across all versions`
                    : undefined">
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
                      class="text-[11px] text-muted-foreground/80 font-mono break-all min-w-0"
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
                <td class="py-3 px-4">
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

      <Pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total-pages="totalPages"
        :total-items="totalCount"
      />
    </div>
  </div>
</template>
