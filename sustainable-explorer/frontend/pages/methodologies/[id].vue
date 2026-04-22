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
} from "lucide-vue-next";
import { formatCredits } from "~/lib/format";
import type {
  MethodologyDto,
  MethodologiesResponse,
} from "~/composables/api/useMethodologiesApi";

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

const tabs = [
  { key: "overview", label: "Overview", icon: BookOpen },
  { key: "versions", label: "Version History", icon: Clock },
  { key: "projects", label: "Linked Projects", icon: Layers },
  { key: "policy", label: "Hedera Policy", icon: Shield },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "actions", label: "Actions", icon: Zap },
] as const;

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
      label: "Version",
      a: fmtVal(cur.version),
      b: fmtVal(target.version),
      changed: cur.version !== target.version,
    },
    {
      label: "Status",
      a: fmtVal(cur.status),
      b: fmtVal(target.status),
      changed: cur.status !== target.status,
    },
    {
      label: "Published",
      a: fmtDate(cur.sourceTimestamp),
      b: fmtDate(target.sourceTimestamp),
      changed: cur.sourceTimestamp !== target.sourceTimestamp,
    },
    {
      label: "Description",
      a: fmtVal(cur.description),
      b: fmtVal(target.description),
      changed: cur.description !== target.description,
    },
    {
      label: "Sectoral Scopes",
      a: fmtScopes(cur.sectoralScopes),
      b: fmtScopes(target.sectoralScopes),
      changed:
        JSON.stringify(cur.sectoralScopes) !==
        JSON.stringify(target.sectoralScopes),
    },
    {
      label: "Emission Reduction Approach",
      a: fmtVal(cur.emissionReductionApproach),
      b: fmtVal(target.emissionReductionApproach),
      changed:
        cur.emissionReductionApproach !== target.emissionReductionApproach,
    },
    {
      label: "Schema Count",
      a: String(cur.stats.schemaCount),
      b: String(target.stats.schemaCount),
      changed: cur.stats.schemaCount !== target.stats.schemaCount,
    },
    {
      label: "Issuances",
      a: String(cur.stats.issuanceCount),
      b: String(target.stats.issuanceCount),
      changed: cur.stats.issuanceCount !== target.stats.issuanceCount,
    },
  ];
});

const changedCount = computed(
  () => compareRows.value.filter((r) => r.changed).length,
);
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
        Methodologies
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
          Methodology not found
        </p>
        <p class="text-xs text-muted-foreground mb-4">
          No methodology with ID <code class="font-mono">{{ id }}</code> on
          {{ network }}.
        </p>
        <NuxtLink
          to="/methodologies"
          class="text-sm text-primary hover:underline"
          >← Back to Methodologies</NuxtLink
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
            View on HashScan
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
              Registry
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
              Version
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
              Schemas
            </div>
            <div class="text-sm font-semibold text-foreground tabular-nums">
              {{ methodology.stats.schemaCount }}
            </div>
          </div>
          <div class="bg-card px-5 py-4">
            <div
              class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
            >
              Status
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
              Description
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
              No description available.
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
              Key Facts
            </h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
            <div class="bg-card px-5 py-4">
              <div
                class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
              >
                Published At
              </div>
              <div class="text-sm text-foreground">
                {{ publishedAt ?? "—" }}
              </div>
            </div>
            <div class="bg-card px-5 py-4">
              <div
                class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
              >
                Network
              </div>
              <div class="text-sm text-foreground capitalize">
                {{ methodology.network }}
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
              Version History
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
                  Version
                </th>
                <th
                  class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Instance Policy Topic
                </th>
                <th
                  class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Published
                </th>
                <th
                  class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Schemas
                </th>
                <th
                  class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Status
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
                      >Current</span
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
                  No versions found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Linked Projects -->
      <div v-else-if="activeTab === 'projects'" class="space-y-6">
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2
              class="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <Layers class="h-4 w-4 text-primary" />
              Linked Projects
            </h2>
          </div>
          <div class="px-5 py-8 text-center text-sm text-muted-foreground">
            <Layers class="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p class="font-medium text-foreground mb-1">Coming Soon</p>
            <p>
              Projects will be linked once VC-Document classification by schema
              type is implemented.
            </p>
          </div>
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
              On-Chain Policy
            </h2>
          </div>
          <div class="px-5 py-5 space-y-4">
            <div
              class="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3"
            >
              <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <div class="text-sm font-medium text-emerald-800">
                  Verified on Hedera
                </div>
                <div class="text-xs text-emerald-700">
                  This methodology is governed by an on-chain Guardian policy.
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
                  Instance Policy Topic
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
                  Published At
                </div>
                <div class="text-sm text-foreground">
                  {{ publishedAt ?? "—" }}
                </div>
              </div>
              <div class="bg-card px-5 py-4">
                <div
                  class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
                >
                  Registry DID
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
                  Network
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
                View on HashScan
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
              Schema Count
            </div>
            <div class="text-2xl font-bold text-foreground tabular-nums">
              {{ methodology.stats.schemaCount }}
            </div>
            <div class="text-xs text-muted-foreground mt-1">
              Data forms in this policy
            </div>
          </div>
          <div class="rounded-xl border bg-card px-5 py-5">
            <div
              class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              Projects
            </div>
            <div class="text-2xl font-bold text-foreground tabular-nums">
              {{ methodology.stats.projectCount }}
            </div>
            <div class="text-xs text-muted-foreground mt-1">
              Registered under this methodology
            </div>
          </div>
          <div class="rounded-xl border bg-card px-5 py-5">
            <div
              class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              Issuances
            </div>
            <div class="text-2xl font-bold text-foreground tabular-nums">
              {{ formatCredits(methodology.stats.issuanceCount) }}
            </div>
            <div class="text-xs text-muted-foreground mt-1">Credits issued</div>
          </div>
        </div>

        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2
              class="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <BarChart3 class="h-4 w-4 text-primary" />
              Trends
            </h2>
          </div>
          <div class="px-5 py-8 text-center text-sm text-muted-foreground">
            <BarChart3 class="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>
              Issuance over time, retirement trend, and geography charts will be
              available once live VC-Document data is fully synced.
            </p>
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
              Actions
            </h2>
          </div>
          <div class="px-5 py-5 space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-foreground mb-1">
                About this Methodology
              </h3>
              <p class="text-sm text-muted-foreground">
                {{ methodology.description || "No description available." }}
              </p>
              <p class="text-sm text-muted-foreground mt-2">
                Instance Policy Topic:
                <code
                  class="text-xs bg-muted rounded px-1.5 py-0.5 font-mono"
                  >{{ methodology.topicId }}</code
                >
              </p>
            </div>
            <div class="border-t pt-4 space-y-4">
              <div>
                <h3 class="text-sm font-semibold text-foreground mb-1">
                  Compare Versions
                </h3>
                <p class="text-sm text-muted-foreground mb-3">
                  Select another version to compare side-by-side against this one.
                </p>
                <div v-if="otherVersions.length === 0" class="text-sm text-muted-foreground italic">
                  No other versions available for this methodology.
                </div>
                <select
                  v-else
                  v-model="compareTopicId"
                  class="w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option :value="null">— Select a version to compare —</option>
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
                    Comparison
                  </h4>
                  <span v-if="changedCount > 0" class="text-xs font-medium bg-stat-amber/10 text-stat-amber rounded-full px-2 py-0.5">
                    {{ changedCount }} field{{ changedCount > 1 ? 's' : '' }} changed
                  </span>
                  <span v-else class="text-xs font-medium bg-stat-green/10 text-stat-green rounded-full px-2 py-0.5">
                    No differences
                  </span>
                </div>

                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b bg-muted/20">
                      <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/4">Field</th>
                      <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[37.5%]">
                        Current
                        <span class="ml-1 font-mono font-normal normal-case bg-primary/10 text-primary rounded px-1.5 py-0.5">{{ methodology.version ?? id }}</span>
                      </th>
                      <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[37.5%]">
                        Compare
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
