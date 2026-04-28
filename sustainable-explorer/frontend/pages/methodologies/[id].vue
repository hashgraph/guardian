<script setup lang="ts">
import {
  ArrowLeft,
  BookOpen,
  Shield,
  ExternalLink,
  CheckCircle2,
  Clock,
  GitBranch,
  BarChart3,
  Zap,
  Building2,
  Layers,
  ChevronRight,
  FileText,
  Copy,
  Check,
  Hash,
  AlertCircle,
  Coins,
  Repeat,
  Flame,
  ArrowRight,
} from "lucide-vue-next";
import { formatCredits, formatNumber } from "~/lib/format";
import type {
  MethodologyDto,
  MethodologiesResponse,
} from "~/composables/api/useMethodologiesApi";
import { mapApiProject } from "~/composables/useProjects";

const { t } = useI18n();
const route = useRoute();
const { network } = useNetwork();

const id = computed(() => route.params.id as string);

const {
  data: methodology,
  pending,
  error,
} = useMethodologyApi({ id, network });

// Fetch all versions of this policy once the main methodology loads
const policyTopicId = computed(() => methodology.value?.policyTopicId ?? null);

const versions = ref<MethodologyDto[]>([]);
const versionsPending = ref(false);

if (import.meta.client) {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;

  watch(
    policyTopicId,
    async (pid) => {
      if (!pid) return;
      versionsPending.value = true;
      try {
        const res = await $fetch<MethodologiesResponse>(
          `/api/v1/${network.value}/methodologies`,
          {
            baseURL,
            query: {
              policyTopicId: pid,
              sortBy: "sourceTimestamp",
              sortDir: "desc",
              limit: 50,
              page: 1,
            },
          },
        );
        versions.value = res.data ?? [];
      } catch {
        versions.value = [];
      } finally {
        versionsPending.value = false;
      }
    },
    { immediate: true },
  );
}

const activeTab = ref<
  "overview" | "versions" | "projects" | "policy" | "analytics" | "actions"
>("overview");

const tabs = computed(() => [
  { key: "overview" as const, label: t('methodologies.detail.tabs.overview'), icon: BookOpen },
  { key: "versions" as const, label: t('methodologies.detail.tabs.versionHistory'), icon: Clock },
  { key: "projects" as const, label: t('methodologies.detail.tabs.linkedProjects'), icon: Layers },
  { key: "policy" as const, label: t('methodologies.detail.tabs.hederaPolicy'), icon: Shield },
  { key: "analytics" as const, label: t('methodologies.detail.tabs.analytics'), icon: BarChart3 },
  { key: "actions" as const, label: t('methodologies.detail.tabs.actions'), icon: Zap },
]);

const statusBadgeClass = (status: string | null | undefined) => {
  const s = (status ?? "").toUpperCase();
  if (s === "PUBLISHED") return "bg-stat-green/10 text-stat-green";
  if (s === "DRAFT") return "bg-stat-amber/10 text-stat-amber";
  return "bg-muted text-muted-foreground";
};

const copiedValue = ref<string | null>(null);
async function copyValue(val: string) {
  try {
    await navigator.clipboard.writeText(val);
    copiedValue.value = val;
    setTimeout(() => {
      if (copiedValue.value === val) copiedValue.value = null;
    }, 2000);
  } catch {}
}

const hashscanUrl = computed(() =>
  methodology.value?.topicId
    ? `https://hashscan.io/${network.value}/topic/${methodology.value.topicId}`
    : null,
);

const publishedAt = computed(() => {
  const ts = methodology.value?.sourceTimestamp;
  if (!ts) return null;
  return new Date(parseFloat(ts) * 1000).toLocaleString();
});

// Linked Projects: fetch when tab is activated
const linkedProjects = ref<Record<string, any>[]>([]);
const linkedProjectsPending = ref(false);
const linkedProjectsLoaded = ref(false);

const linkedProjectsMapped = computed(() => linkedProjects.value.map(mapApiProject));
const { resolvedCode: resolvedProjectCode } = useGeocodedCountries(linkedProjectsMapped);

if (import.meta.client) {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;

  watch(
    [activeTab, policyTopicId],
    async ([tab, pid], [, oldPid]) => {
      if (tab !== 'projects' || !pid) return;
      if (pid === oldPid && linkedProjectsLoaded.value) return;
      linkedProjectsLoaded.value = false;
      linkedProjectsPending.value = true;
      try {
        const res = await $fetch<{ data: Record<string, any>[]; meta: { total: number } }>(
          `/api/v1/${network.value}/projects`,
          { baseURL, query: { policyTopicId: pid, limit: 100, page: 1 } },
        );
        linkedProjects.value = res.data ?? [];
      } catch {
        linkedProjects.value = [];
      } finally {
        linkedProjectsPending.value = false;
        linkedProjectsLoaded.value = true;
      }
    },
    { immediate: true },
  );
}

// Version comparison
const compareTopicId = ref<string | null>(null);
const compareTarget = computed(() =>
  versions.value.find((v) => v.topicId === compareTopicId.value) ?? null,
);
const otherVersions = computed(() =>
  versions.value.filter((v) => v.topicId !== id.value),
);

interface CompareRow {
  label: string;
  a: string;
  b: string;
  changed: boolean;
}

const fmtDate = (ts: string | null | undefined) =>
  ts ? new Date(parseFloat(ts) * 1000).toLocaleDateString() : "—";
const fmtVal = (v: string | null | undefined) => v ?? "—";
const fmtScopes = (s: string[] | null | undefined) =>
  s && s.length ? s.join(", ") : "—";

const compareRows = computed((): CompareRow[] => {
  const cur = methodology.value;
  const target = compareTarget.value;
  if (!cur || !target) return [];
  return [
    {
      label: t('methodologies.detail.actions.compareRows.version'),
      a: fmtVal(cur.version),
      b: fmtVal(target.version),
      changed: cur.version !== target.version,
    },
    {
      label: t('methodologies.detail.actions.compareRows.status'),
      a: fmtVal(cur.status),
      b: fmtVal(target.status),
      changed: cur.status !== target.status,
    },
    {
      label: t('methodologies.detail.actions.compareRows.published'),
      a: fmtDate(cur.sourceTimestamp),
      b: fmtDate(target.sourceTimestamp),
      changed: cur.sourceTimestamp !== target.sourceTimestamp,
    },
    {
      label: t('methodologies.detail.actions.compareRows.description'),
      a: fmtVal(cur.description),
      b: fmtVal(target.description),
      changed: cur.description !== target.description,
    },
    {
      label: t('methodologies.detail.actions.compareRows.sectoralScopes'),
      a: fmtScopes(cur.sectoralScopes),
      b: fmtScopes(target.sectoralScopes),
      changed:
        JSON.stringify(cur.sectoralScopes) !==
        JSON.stringify(target.sectoralScopes),
    },
    {
      label: t('methodologies.detail.actions.compareRows.emissionReductionApproach'),
      a: fmtVal(cur.emissionReductionApproach),
      b: fmtVal(target.emissionReductionApproach),
      changed:
        cur.emissionReductionApproach !== target.emissionReductionApproach,
    },
    {
      label: t('methodologies.detail.actions.compareRows.schemaCount'),
      a: String(cur.stats.schemaCount),
      b: String(target.stats.schemaCount),
      changed: cur.stats.schemaCount !== target.stats.schemaCount,
    },
    {
      label: t('methodologies.detail.actions.compareRows.issuances'),
      a: String(cur.stats.issuanceCount),
      b: String(target.stats.issuanceCount),
      changed: cur.stats.issuanceCount !== target.stats.issuanceCount,
    },
  ];
});

const changedCount = computed(
  () => compareRows.value.filter((r) => r.changed).length,
);

// Linked Issuances — sourced from methodology.issuances returned by the API
const linkedCredits = computed(() => {
  if (!methodology.value?.issuances?.length) return [];
  return methodology.value.issuances.map((i) => ({
    tokenId: i.tokenId,
    name: i.name ?? '',
    symbol: i.symbol ?? '',
    type: i.type === 'FUNGIBLE_COMMON' ? 'Fungible' : 'Non-Fungible',
    supply: i.supply,
    mintDate: i.mintDate ?? '',
  }));
});

// Lifecycle summary — sourced from backend-computed totals on the methodology
const lifecycleSummary = computed(() => {
  const totalIssued = methodology.value?.totalIssued ?? 0;
  const totalRetired = methodology.value?.totalRetired ?? 0;
  const active = methodology.value?.totalActive ?? 0;
  return { totalIssued, totalRetired, active };
});
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <NuxtLink
        to="/methodologies"
        class="hover:text-foreground transition-colors flex items-center gap-1"
      >
        <ArrowLeft class="h-3.5 w-3.5" />
        {{ $t('methodologies.detail.breadcrumb') }}
      </NuxtLink>
      <ChevronRight class="h-3.5 w-3.5" />
      <span class="text-foreground font-medium">{{
        methodology?.name ?? id
      }}</span>
    </div>

    <!-- Loading skeleton -->
    <template v-if="pending">
      <div class="space-y-4">
        <Skeleton class="h-10 w-2/3" />
        <Skeleton class="h-4 w-1/2" />
        <Skeleton class="h-24 w-full rounded-xl" />
      </div>
    </template>

    <!-- Error state -->
    <template v-else-if="error || !methodology">
      <div class="rounded-xl border bg-card px-6 py-12 text-center">
        <AlertCircle class="h-8 w-8 text-destructive mx-auto mb-3" />
        <p class="text-sm font-medium text-foreground mb-1">
          {{ $t('methodologies.detail.notFound') }}
        </p>
        <p class="text-xs text-muted-foreground mb-4">
          {{ $t('methodologies.detail.notFoundDesc', { id, network }) }}
        </p>
        <NuxtLink
          to="/methodologies"
          class="text-sm text-primary hover:underline"
          >← {{ $t('methodologies.detail.backLink') }}</NuxtLink
        >
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-3 mb-2">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"
            >
              <BookOpen class="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-foreground">
                {{ methodology.name }}
              </h1>
              <p class="text-sm text-muted-foreground">
                {{ methodology.registryName || methodology.registryDid || "—" }}
                <template v-if="methodology.version"
                  >&middot; {{ methodology.version }}</template
                >
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span
                  v-if="methodology.emissionReductionApproach"
                  class="inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-medium text-sky-700"
                >
                  {{ methodology.emissionReductionApproach }}
                </span>
                <span
                  v-for="scope in (methodology.sectoralScopes ?? [])"
                  :key="scope"
                  class="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                >
                  {{ scope }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <a
            v-if="hashscanUrl"
            :href="hashscanUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink class="h-4 w-4 text-primary" />
            {{ $t('methodologies.detail.viewOnHashScan') }}
          </a>
        </div>
      </div>

      <!-- Summary card -->
      <div class="rounded-xl border bg-card overflow-hidden">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
          <div class="bg-card px-5 py-4">
            <div
              class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
            >
              {{ $t('methodologies.detail.summary.registry') }}
            </div>
            <div
              class="text-sm font-medium text-foreground flex items-center gap-1.5"
            >
              <Building2 class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span class="truncate">{{
                methodology.registryName || methodology.registryDid || "—"
              }}</span>
            </div>
          </div>
          <div class="bg-card px-5 py-4">
            <div
              class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
            >
              {{ $t('methodologies.detail.summary.version') }}
            </div>
            <div class="text-sm font-medium text-foreground">
              <span
                v-if="methodology.version"
                class="font-mono bg-muted rounded px-1.5 py-0.5 text-xs"
                >{{ methodology.version }}</span
              >
              <span v-else class="text-muted-foreground">—</span>
            </div>
          </div>
          <div class="bg-card px-5 py-4">
            <div
              class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
            >
              {{ $t('methodologies.detail.summary.schemas') }}
            </div>
            <div class="text-sm font-semibold text-foreground tabular-nums">
              {{ methodology.stats.schemaCount }}
            </div>
          </div>
          <div class="bg-card px-5 py-4">
            <div
              class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
            >
              {{ $t('methodologies.detail.summary.status') }}
            </div>
            <span
              :class="[
                statusBadgeClass(methodology.status),
                'text-xs font-medium rounded-full px-2 py-0.5',
              ]"
            >
              {{ methodology.status ?? "—" }}
            </span>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="border-b">
        <nav class="flex gap-0 -mb-px overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="[
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
            ]"
            @click="activeTab = tab.key"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab: Overview -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2
              class="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <FileText class="h-4 w-4 text-primary" />
              {{ $t('methodologies.detail.overview.description') }}
            </h2>
          </div>
          <div class="px-5 py-5">
            <p
              v-if="methodology.description"
              class="text-sm text-foreground leading-relaxed"
            >
              {{ methodology.description }}
            </p>
            <p v-else class="text-sm text-muted-foreground italic">
              {{ $t('methodologies.detail.overview.noDescription') }}
            </p>
          </div>
        </div>

        <!-- Key Facts -->
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2
              class="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <Hash class="h-4 w-4 text-primary" />
              {{ $t('methodologies.detail.overview.keyFacts') }}
            </h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
            <div class="bg-card px-5 py-4">
              <div
                class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
              >
                {{ $t('methodologies.detail.overview.publishedAt') }}
              </div>
              <div class="text-sm text-foreground">
                {{ publishedAt ?? "—" }}
              </div>
            </div>
            <div class="bg-card px-5 py-4">
              <div
                class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
              >
                {{ $t('methodologies.detail.overview.network') }}
              </div>
              <div class="text-sm text-foreground capitalize">
                {{ methodology.network }}
              </div>
            </div>
            <div class="bg-card px-5 py-4">
              <div
                class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
              >
                {{ $t('methodologies.detail.overview.emissionReductionApproach') }}
              </div>
              <div class="text-sm text-foreground">
                {{ methodology.emissionReductionApproach ?? "—" }}
              </div>
            </div>
            <div class="bg-card px-5 py-4">
              <div
                class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
              >
                {{ $t('methodologies.detail.overview.applicableSectoralScopes') }}
              </div>
              <div class="text-sm text-foreground">
                <template v-if="methodology.sectoralScopes && methodology.sectoralScopes.length">
                  <span
                    v-for="(scope, i) in methodology.sectoralScopes"
                    :key="scope"
                  >{{ scope }}<span v-if="i < methodology.sectoralScopes.length - 1">, </span></span>
                </template>
                <span v-else>—</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Version History -->
      <div v-else-if="activeTab === 'versions'" class="space-y-6">
        <div class="rounded-xl border bg-card overflow-hidden">
          <div
            class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between"
          >
            <h2
              class="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <Clock class="h-4 w-4 text-primary" />
              {{ $t('methodologies.detail.versions.title') }}
            </h2>
            <span v-if="!versionsPending" class="text-xs text-muted-foreground">
              {{ versions.length }} version(s)
            </span>
          </div>

          <!-- Loading -->
          <template v-if="versionsPending">
            <div class="divide-y">
              <div v-for="i in 3" :key="i" class="px-5 py-3 flex gap-4">
                <Skeleton class="h-4 w-20" />
                <Skeleton class="h-4 w-32" />
                <Skeleton class="h-4 w-28" />
                <Skeleton class="h-4 w-10 ml-auto" />
              </div>
            </div>
          </template>

          <table v-else class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/20">
                <th
                  class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {{ $t('methodologies.detail.versions.columns.version') }}
                </th>
                <th
                  class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {{ $t('methodologies.detail.versions.columns.instancePolicyTopic') }}
                </th>
                <th
                  class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {{ $t('methodologies.detail.versions.columns.published') }}
                </th>
                <th
                  class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {{ $t('methodologies.detail.versions.columns.schemas') }}
                </th>
                <th
                  class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {{ $t('methodologies.detail.versions.columns.status') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr
                v-for="v in versions"
                :key="v.topicId ?? v.id"
                :class="[
                  v.topicId === id ? 'bg-primary/5' : 'hover:bg-muted/30',
                  'transition-colors cursor-pointer',
                ]"
                @click="
                  v.topicId &&
                  v.topicId !== id &&
                  navigateTo('/methodologies/' + v.topicId)
                "
              >
                <td class="py-3 px-5">
                  <div class="flex items-center gap-2">
                    <span
                      v-if="v.version"
                      class="text-xs font-mono bg-muted rounded px-1.5 py-0.5"
                      >{{ v.version }}</span
                    >
                    <span v-else class="text-xs text-muted-foreground">—</span>
                    <span
                      v-if="v.topicId === id"
                      class="text-[10px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5"
                      >{{ $t('methodologies.detail.versions.currentBadge') }}</span
                    >
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="group flex items-center gap-2">
                    <code class="text-xs font-mono text-muted-foreground">{{
                      v.topicId ?? "—"
                    }}</code>
                    <button
                      v-if="v.topicId"
                      class="opacity-0 group-hover:opacity-100 transition-opacity flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      @click.stop="copyValue(v.topicId!)"
                    >
                      <Check
                        v-if="copiedValue === v.topicId"
                        class="h-3 w-3 text-stat-green"
                      />
                      <Copy v-else class="h-3 w-3" />
                    </button>
                  </div>
                </td>
                <td class="py-3 px-4 text-xs text-muted-foreground">
                  {{
                    v.sourceTimestamp
                      ? new Date(
                          parseFloat(v.sourceTimestamp) * 1000,
                        ).toLocaleDateString()
                      : "—"
                  }}
                </td>
                <td
                  class="py-3 px-4 text-right tabular-nums text-sm font-medium"
                >
                  {{ v.stats.schemaCount }}
                </td>
                <td class="py-3 px-4">
                  <span
                    :class="[
                      statusBadgeClass(v.status),
                      'text-xs font-medium rounded-full px-2 py-0.5',
                    ]"
                  >
                    {{ v.status ?? "—" }}
                  </span>
                </td>
              </tr>
              <tr v-if="!versions.length">
                <td
                  colspan="5"
                  class="py-8 text-center text-sm text-muted-foreground"
                >
                  {{ $t('methodologies.detail.versions.noVersions') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Linked Projects -->
      <div v-else-if="activeTab === 'projects'" class="space-y-6">
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers class="h-4 w-4 text-primary" />
              {{ $t('methodologies.detail.linkedProjects.title') }}
            </h2>
            <span v-if="!linkedProjectsPending" class="text-xs text-muted-foreground">
              {{ linkedProjects.length }} project{{ linkedProjects.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Loading skeleton -->
          <template v-if="linkedProjectsPending">
            <div class="divide-y">
              <div v-for="i in 3" :key="i" class="px-5 py-3 flex gap-4">
                <Skeleton class="h-4 w-48" />
                <Skeleton class="h-4 w-24" />
                <Skeleton class="h-4 w-32" />
                <Skeleton class="h-4 w-16 ml-auto" />
              </div>
            </div>
          </template>

          <!-- No policyTopicId -->
          <div
            v-else-if="!policyTopicId"
            class="px-5 py-8 text-center text-sm text-muted-foreground"
          >
            <Layers class="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>{{ $t('methodologies.detail.linkedProjects.noTopicId') }}</p>
          </div>

          <!-- Projects table -->
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/20">
                <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.linkedProjects.columns.project') }}</th>
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.linkedProjects.columns.country') }}</th>
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.linkedProjects.columns.registry') }}</th>
                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.linkedProjects.columns.credits') }}</th>
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.linkedProjects.columns.status') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr
                v-for="p in linkedProjectsMapped"
                :key="p.id"
                class="hover:bg-muted/30 transition-colors cursor-pointer"
                @click="navigateTo('/projects/' + p.id)"
              >
                <td class="py-3 px-5">
                  <div class="font-medium text-foreground truncate max-w-[280px]">
                    {{ p.name || '—' }}
                  </div>
                  <div v-if="p.developer" class="text-xs text-muted-foreground mt-0.5">{{ p.developer }}</div>
                </td>
                <td class="py-3 px-4 text-sm text-muted-foreground">
                  <div v-if="p.country || (p.lat && p.lng)" class="flex items-center gap-1.5">
                    <CountryFlag :code="resolvedProjectCode(p)" size="sm" />
                    <span>{{ p.country || '' }}</span>
                  </div>
                  <span v-else>—</span>
                </td>
                <td class="py-3 px-4 text-sm text-muted-foreground truncate max-w-[160px]">
                  {{ p.registry || '—' }}
                </td>
                <td class="py-3 px-4 text-right tabular-nums text-sm font-medium text-foreground">
                  {{ p.credits != null ? p.credits.toLocaleString() : '—' }}
                </td>
                <td class="py-3 px-4">
                  <span
                    :class="[
                      (p.status ?? '').toUpperCase() === 'ISSUING'
                        ? 'bg-stat-green/10 text-stat-green'
                        : 'bg-muted text-muted-foreground',
                      'text-xs font-medium rounded-full px-2 py-0.5',
                    ]"
                  >
                    {{ p.status ?? '—' }}
                  </span>
                </td>
              </tr>
              <tr v-if="!linkedProjects.length">
                <td colspan="5" class="py-8 text-center text-sm text-muted-foreground">
                  {{ $t('methodologies.detail.linkedProjects.noProjects') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Hedera Policy -->
      <div v-else-if="activeTab === 'policy'" class="space-y-6">
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2
              class="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <Shield class="h-4 w-4 text-primary" />
              {{ $t('methodologies.detail.policy.title') }}
            </h2>
          </div>
          <div class="px-5 py-5 space-y-4">
            <div
              class="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3"
            >
              <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <div class="text-sm font-medium text-emerald-800">
                  {{ $t('methodologies.detail.policy.verifiedOnHedera') }}
                </div>
                <div class="text-xs text-emerald-700">
                  {{ $t('methodologies.detail.policy.governedBy') }}
                </div>
              </div>
            </div>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border rounded-lg overflow-hidden border"
            >
              <div class="bg-card px-5 py-4">
                <div
                  class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
                >
                  {{ $t('methodologies.detail.policy.instancePolicyTopic') }}
                </div>
                <div class="group flex items-center gap-2">
                  <code class="text-sm font-mono text-foreground">{{
                    methodology.topicId ?? "—"
                  }}</code>
                  <button
                    v-if="methodology.topicId"
                    class="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    @click="copyValue(methodology.topicId!)"
                  >
                    <Check
                      v-if="copiedValue === methodology.topicId"
                      class="h-3.5 w-3.5 text-stat-green"
                    />
                    <Copy v-else class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div class="bg-card px-5 py-4">
                <div
                  class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
                >
                  {{ $t('methodologies.detail.policy.publishedAt') }}
                </div>
                <div class="text-sm text-foreground">
                  {{ publishedAt ?? "—" }}
                </div>
              </div>
              <div class="bg-card px-5 py-4">
                <div
                  class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
                >
                  {{ $t('methodologies.detail.policy.registryDid') }}
                </div>
                <div class="group flex items-center gap-2">
                  <code
                    class="text-xs font-mono text-muted-foreground truncate max-w-[200px]"
                    :title="methodology.registryDid ?? ''"
                    >{{ methodology.registryDid ?? "—" }}</code
                  >
                  <button
                    v-if="methodology.registryDid"
                    class="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    @click="copyValue(methodology.registryDid!)"
                  >
                    <Check
                      v-if="copiedValue === methodology.registryDid"
                      class="h-3.5 w-3.5 text-stat-green"
                    />
                    <Copy v-else class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div class="bg-card px-5 py-4">
                <div
                  class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
                >
                  {{ $t('methodologies.detail.policy.network') }}
                </div>
                <div class="text-sm text-foreground capitalize">
                  {{ methodology.network }}
                </div>
              </div>
            </div>

            <div v-if="hashscanUrl">
              <a
                :href="hashscanUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <ExternalLink class="h-4 w-4" />
                {{ $t('methodologies.detail.viewOnHashScan') }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Analytics -->
      <div v-else-if="activeTab === 'analytics'" class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="rounded-xl border bg-card px-5 py-5">
            <div
              class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              {{ $t('methodologies.detail.analytics.schemaCount') }}
            </div>
            <div class="text-2xl font-bold text-foreground tabular-nums">
              {{ methodology.stats.schemaCount }}
            </div>
            <div class="text-xs text-muted-foreground mt-1">
              {{ $t('methodologies.detail.analytics.schemaCountSub') }}
            </div>
          </div>
          <div class="rounded-xl border bg-card px-5 py-5">
            <div
              class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              {{ $t('methodologies.detail.analytics.projects') }}
            </div>
            <div class="text-2xl font-bold text-foreground tabular-nums">
              {{ methodology.stats.projectCount }}
            </div>
            <div class="text-xs text-muted-foreground mt-1">
              {{ $t('methodologies.detail.analytics.projectsSub') }}
            </div>
          </div>
          <div class="rounded-xl border bg-card px-5 py-5">
            <div
              class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              {{ $t('methodologies.detail.analytics.issuances') }}
            </div>
            <div class="text-2xl font-bold text-foreground tabular-nums">
              {{ formatCredits(methodology.stats.issuanceCount) }}
            </div>
            <div class="text-xs text-muted-foreground mt-1">{{ $t('methodologies.detail.analytics.issuancesSub') }}</div>
          </div>
        </div>

        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2
              class="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <BarChart3 class="h-4 w-4 text-primary" />
              {{ $t('methodologies.detail.analytics.trends') }}
            </h2>
          </div>
          <div class="px-5 py-8 text-center text-sm text-muted-foreground">
            <BarChart3 class="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>
              {{ $t('methodologies.detail.analytics.trendsComingSoon') }}
            </p>
          </div>
        </div>

        <!-- Linked Issuances -->
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
              <Coins class="h-4 w-4 text-primary" />
              Linked Issuances
            </h2>
            <span class="text-xs text-muted-foreground">{{ linkedCredits.length }} issuance(s)</span>
          </div>
          <div v-if="linkedCredits.length > 0">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b bg-muted/20">
                  <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Token</th>
                  <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Token ID</th>
                  <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Supply</th>
                  <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Mint Date</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr
                  v-for="c in linkedCredits"
                  :key="c.tokenId"
                  class="hover:bg-muted/30 transition-colors"
                >
                  <td class="py-3 px-5">
                    <div class="font-medium text-foreground">{{ c.name }}</div>
                    <div class="text-[11px] text-muted-foreground">{{ c.symbol }}</div>
                  </td>
                  <td class="py-3 px-4">
                    <code class="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">{{ c.tokenId }}</code>
                  </td>
                  <td class="py-3 px-4">
                    <span
                      :class="[
                        c.type === 'Fungible'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-chart-4/10 text-chart-4',
                        'text-xs font-medium rounded-full px-2 py-0.5',
                      ]"
                    >
                      {{ c.type }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right tabular-nums font-medium">{{ formatNumber(c.supply) }}</td>
                  <td class="py-3 px-4 text-muted-foreground">{{ c.mintDate }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="px-5 py-8 text-center text-sm text-muted-foreground">
            No issuances have been recorded for this methodology yet.
          </div>
        </div>

        <!-- Credit Lifecycle -->
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
              <GitBranch class="h-4 w-4 text-primary" />
              Credit Lifecycle
            </h2>
            <p class="text-[11px] text-muted-foreground mt-0.5">Issuance → Transfers → Retirements</p>
          </div>

          <!-- Lifecycle Summary Grid -->
          <div class="grid grid-cols-3 gap-px bg-border">
            <div class="bg-card px-5 py-4 text-center">
              <div class="text-lg font-semibold text-foreground tabular-nums">{{ formatNumber(lifecycleSummary.totalIssued) }}</div>
              <div class="text-[11px] text-muted-foreground">Total Issued</div>
            </div>
            <div class="bg-card px-5 py-4 text-center">
              <div class="text-lg font-semibold text-stat-rose tabular-nums">{{ formatNumber(lifecycleSummary.totalRetired) }}</div>
              <div class="text-[11px] text-muted-foreground">Retired</div>
            </div>
            <div class="bg-card px-5 py-4 text-center">
              <div class="text-lg font-semibold text-stat-green tabular-nums">{{ formatNumber(lifecycleSummary.active) }}</div>
              <div class="text-[11px] text-muted-foreground">Active</div>
            </div>
          </div>

          <!-- Lifecycle progress bar -->
          <div class="px-5 py-3 border-t">
            <div class="flex h-2.5 rounded-full overflow-hidden bg-muted">
              <div
                v-if="lifecycleSummary.totalIssued > 0"
                class="bg-stat-rose transition-all"
                :style="{ width: `${(lifecycleSummary.totalRetired / lifecycleSummary.totalIssued) * 100}%` }"
                title="Retired"
              />
              <div
                v-if="lifecycleSummary.totalIssued > 0"
                class="bg-stat-green transition-all"
                :style="{ width: `${(lifecycleSummary.active / lifecycleSummary.totalIssued) * 100}%` }"
                title="Active"
              />
            </div>
            <div class="flex items-center justify-between mt-1.5">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span class="h-2 w-2 rounded-full bg-stat-rose" /> Retired
                </span>
                <span class="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span class="h-2 w-2 rounded-full bg-stat-green" /> Active
                </span>
              </div>
              <span v-if="lifecycleSummary.totalIssued > 0" class="text-[10px] text-muted-foreground">
                {{ ((lifecycleSummary.totalRetired / lifecycleSummary.totalIssued) * 100).toFixed(1) }}% retired
              </span>
            </div>
          </div>

          <div v-if="lifecycleSummary.totalIssued === 0" class="border-t px-5 py-6 text-center text-sm text-muted-foreground">
            No transfers or retirements recorded for this methodology yet.
          </div>
        </div>
      </div>

      <!-- Tab: Actions -->
      <div v-else-if="activeTab === 'actions'" class="space-y-6">
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2
              class="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <Zap class="h-4 w-4 text-primary" />
              {{ $t('methodologies.detail.tabs.actions') }}
            </h2>
          </div>
          <div class="px-5 py-5 space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-foreground mb-1">
                {{ $t('methodologies.detail.actions.aboutTitle') }}
              </h3>
              <p class="text-sm text-muted-foreground">
                {{ methodology.description || "No description available." }}
              </p>
              <p class="text-sm text-muted-foreground mt-2">
                {{ $t('methodologies.detail.actions.instancePolicyTopicLabel') }}
                <code
                  class="text-xs bg-muted rounded px-1.5 py-0.5 font-mono"
                  >{{ methodology.topicId }}</code
                >
              </p>
            </div>
            <div class="border-t pt-4 space-y-4">
              <div>
                <h3 class="text-sm font-semibold text-foreground mb-1">
                  {{ $t('methodologies.detail.actions.compareVersions') }}
                </h3>
                <p class="text-sm text-muted-foreground mb-3">
                  {{ $t('methodologies.detail.actions.compareVersionsDesc') }}
                </p>
                <div v-if="otherVersions.length === 0" class="text-sm text-muted-foreground italic">
                  {{ $t('methodologies.detail.actions.noOtherVersions') }}
                </div>
                <select
                  v-else
                  v-model="compareTopicId"
                  class="w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option :value="null">{{ $t('methodologies.detail.actions.selectVersionPlaceholder') }}</option>
                  <option
                    v-for="v in otherVersions"
                    :key="v.topicId ?? v.id"
                    :value="v.topicId"
                  >
                    {{ v.version ?? v.topicId }} · {{ fmtDate(v.sourceTimestamp) }} · {{ v.status ?? "—" }}
                  </option>
                </select>
              </div>

              <!-- Comparison table -->
              <div v-if="compareTarget" class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                  <h4 class="text-sm font-semibold text-foreground flex items-center gap-2">
                    <GitBranch class="h-4 w-4 text-primary" />
                    {{ $t('methodologies.detail.actions.comparison') }}
                  </h4>
                  <span v-if="changedCount > 0" class="text-xs font-medium bg-stat-amber/10 text-stat-amber rounded-full px-2 py-0.5">
                    {{ changedCount }} {{ changedCount > 1 ? $t('common.fields') : $t('common.field') }} {{ $t('common.changed') }}
                  </span>
                  <span v-else class="text-xs font-medium bg-stat-green/10 text-stat-green rounded-full px-2 py-0.5">
                    {{ $t('methodologies.detail.actions.noDifferences') }}
                  </span>
                </div>

                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b bg-muted/20">
                      <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/4">{{ $t('methodologies.detail.actions.compareColumns.field') }}</th>
                      <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[37.5%]">
                        {{ $t('methodologies.detail.actions.compareColumns.current') }}
                        <span class="ml-1 font-mono font-normal normal-case bg-primary/10 text-primary rounded px-1.5 py-0.5">{{ methodology.version ?? id }}</span>
                      </th>
                      <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[37.5%]">
                        {{ $t('methodologies.detail.actions.compareColumns.compare') }}
                        <span class="ml-1 font-mono font-normal normal-case bg-muted rounded px-1.5 py-0.5">{{ compareTarget.version ?? compareTarget.topicId }}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">
                    <tr
                      v-for="row in compareRows"
                      :key="row.label"
                      :class="row.changed ? 'bg-stat-amber/5' : ''"
                    >
                      <td class="py-2.5 px-4 text-xs font-medium text-muted-foreground">
                        {{ row.label }}
                      </td>
                      <td class="py-2.5 px-4 text-sm text-foreground">
                        <span :class="row.changed ? 'text-stat-amber font-medium' : ''">{{ row.a }}</span>
                      </td>
                      <td class="py-2.5 px-4 text-sm text-foreground">
                        <span :class="row.changed ? 'text-stat-amber font-medium' : ''">{{ row.b }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
