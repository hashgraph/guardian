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
  FileJson,
  Copy,
  Check,
  Hash,
  AlertCircle,
  Coins,
  Repeat,
  Flame,
  ArrowRight,
  FileSearch,
  ChevronDown,
  RefreshCw,
  RotateCcw,
  Pencil,
} from "lucide-vue-next";
import { formatCredits, formatNumber } from "~/lib/format";
import type {
  MethodologyDto,
  MethodologiesResponse,
} from "~/composables/api/useMethodologiesApi";
import type { DecodedMethodologyResponse } from "~/composables/api/useDecodedMethodologyApi";
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
  "overview" | "decoded" | "versions" | "projects" | "policy" | "analytics" | "actions"
>("overview");

const tabs = computed(() => [
  { key: "overview" as const, label: t('methodologies.detail.tabs.overview'), icon: BookOpen },
  { key: "decoded" as const, label: t('methodologies.detail.tabs.decoded'), icon: FileSearch },
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

// Decoded Mapping: fetch lazily when the tab is activated
const decodedData = ref<DecodedMethodologyResponse | null>(null);
const decodedPending = ref(false);
const decodedError = ref<string | null>(null);
const decodedLoaded = ref(false);
const allSchemaFieldsExpanded = ref(false);

if (import.meta.client) {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;

  watch(
    [activeTab, id, () => network.value],
    async ([tab, currentId, currentNetwork], [, oldId, oldNetwork]) => {
      if (tab !== 'decoded') return;
      if (decodedLoaded.value && currentId === oldId && currentNetwork === oldNetwork) return;
      decodedLoaded.value = false;
      decodedPending.value = true;
      decodedError.value = null;
      try {
        decodedData.value = await $fetch<DecodedMethodologyResponse>(
          `/api/v1/${currentNetwork}/methodologies/${currentId}/decoded`,
          { baseURL },
        );
      } catch {
        decodedData.value = null;
        decodedError.value = t('methodologies.detail.decoded.fetchError');
      } finally {
        decodedPending.value = false;
        decodedLoaded.value = true;
      }
    },
    { immediate: true },
  );
}

const decodeStatusClass = (status: string | null | undefined) => {
  const s = (status ?? '').toLowerCase();
  if (s === 'success') return 'bg-stat-green/10 text-stat-green';
  if (s === 'failed') return 'bg-destructive/10 text-destructive';
  if (s === 'pending') return 'bg-stat-amber/10 text-stat-amber';
  return 'bg-muted text-muted-foreground';
};

// ─── Action: re-run decoder ──────────────────────────────────────────────────

const redecodePending = ref(false);

async function triggerRedecode() {
  if (!import.meta.client) return;
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;
  redecodePending.value = true;
  try {
    await $fetch(
      `/api/v1/${network.value}/methodologies/${id.value}/redecode`,
      { method: 'POST', baseURL },
    );
    const { toast } = await import('vue-sonner');
    toast.success(t('methodologies.detail.decoded.actions.rerunSuccess'));
  } catch (err: any) {
    const { toast } = await import('vue-sonner');
    toast.error(t('methodologies.detail.decoded.actions.rerunError'));
  } finally {
    redecodePending.value = false;
  }
}

// ─── Action: re-parse projects ───────────────────────────────────────────────

const reparsePending = ref(false);

async function triggerReparse() {
  if (!import.meta.client) return;
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;
  reparsePending.value = true;
  try {
    const res = await $fetch<{ enqueued: number }>(
      `/api/v1/${network.value}/methodologies/${id.value}/reparse-projects`,
      { method: 'POST', baseURL },
    );
    const { toast } = await import('vue-sonner');
    if (res.enqueued === 0) {
      toast.info(t('methodologies.detail.decoded.actions.reparseEmpty'));
    } else {
      toast.success(
        t('methodologies.detail.decoded.actions.reparseSuccess', { count: res.enqueued }),
      );
    }
  } catch {
    const { toast } = await import('vue-sonner');
    toast.error(t('methodologies.detail.decoded.actions.reparseError'));
  } finally {
    reparsePending.value = false;
  }
}

// ─── Action: edit field mapping ──────────────────────────────────────────────

// The editable project field keys (geo is excluded — it has special GeoJSON semantics).
// If geo editing is needed in a future version, the PATCH endpoint accepts it via the fieldMap key.
const EDITABLE_FIELD_KEYS: ResolvedFieldKey[] = [
  'name',
  'country',
  'developer',
  'category',
  'scale',
  'sector',
  'vintageRaw',
  'creditingPeriod',
  'sdgOrCobenefits',
];

// Labels matching PROJECT_EXTRACT_FIELDS on the backend.
const FIELD_LABELS: Record<ResolvedFieldKey, string> = {
  name: 'Project Title',
  country: 'Country',
  developer: 'Developer',
  category: 'Category',
  scale: 'Scale',
  sector: 'Sector',
  vintageRaw: 'Vintage / Start Date',
  creditingPeriod: 'Crediting Period',
  sdgOrCobenefits: 'SDGs / Co-benefits',
};

const editingMapping = ref(false);
// formState: key → "schemaId.fieldKey" or '' (unmapped)
const formState = ref<Record<ResolvedFieldKey, string>>({} as Record<ResolvedFieldKey, string>);
const saveMappingPending = ref(false);

function enterEditMode() {
  if (!decodedData.value?.projectSchema) return;
  const resolved = decodedData.value.projectSchema.resolvedFields;
  const schemaId = decodedData.value.projectSchema.schemaId;
  const state = {} as Record<ResolvedFieldKey, string>;
  for (const key of EDITABLE_FIELD_KEYS) {
    const rf = resolved[key];
    state[key] = rf ? `${schemaId}.${rf.fieldKey}` : '';
  }
  formState.value = state;
  editingMapping.value = true;
}

function cancelEditMode() {
  editingMapping.value = false;
  formState.value = {} as Record<ResolvedFieldKey, string>;
}

// Compute the initial (original) form state so we can diff to find changes.
const originalFormState = computed<Record<ResolvedFieldKey, string>>(() => {
  if (!decodedData.value?.projectSchema) return {} as Record<ResolvedFieldKey, string>;
  const resolved = decodedData.value.projectSchema.resolvedFields;
  const schemaId = decodedData.value.projectSchema.schemaId;
  const state = {} as Record<ResolvedFieldKey, string>;
  for (const key of EDITABLE_FIELD_KEYS) {
    const rf = resolved[key];
    state[key] = rf ? `${schemaId}.${rf.fieldKey}` : '';
  }
  return state;
});

const pendingChanges = computed<Record<string, string>>(() => {
  const changes: Record<string, string> = {};
  for (const key of EDITABLE_FIELD_KEYS) {
    const current = formState.value[key] ?? '';
    const original = originalFormState.value[key] ?? '';
    if (current !== original) {
      // key in PATCH body is the human-readable LABEL, value is "schemaId.fieldPath"
      changes[FIELD_LABELS[key]] = current;
    }
  }
  return changes;
});

const hasChanges = computed(() => Object.keys(pendingChanges.value).length > 0);

// Build grouped options for the select: projectSchema.fieldMap first, then other availableSchemas.
interface SelectOption {
  value: string;    // "schemaId.fieldKey"
  label: string;
  groupLabel: string;
}

const mappingSelectOptions = computed<SelectOption[]>(() => {
  if (!decodedData.value) return [];
  const options: SelectOption[] = [];
  const schemas = decodedData.value.availableSchemas ?? [];
  for (const schema of schemas) {
    const groupLabel = schema.schemaName || schema.schemaId;
    for (const field of schema.fields) {
      // Skip GeoJSON fields — they have special backend semantics.
      if (field.isGeoJson) continue;
      options.push({
        value: `${schema.schemaId}.${field.fieldKey}`,
        label: `${field.title || field.fieldKey} (${field.fieldKey})`,
        groupLabel,
      });
    }
  }
  return options;
});

// Group options by groupLabel for rendering <optgroup>.
const mappingOptionGroups = computed<{ label: string; options: SelectOption[] }[]>(() => {
  const map = new Map<string, SelectOption[]>();
  for (const opt of mappingSelectOptions.value) {
    if (!map.has(opt.groupLabel)) map.set(opt.groupLabel, []);
    map.get(opt.groupLabel)!.push(opt);
  }
  return Array.from(map.entries()).map(([label, options]) => ({ label, options }));
});

async function saveMapping() {
  if (!import.meta.client || !hasChanges.value) {
    if (!hasChanges.value) {
      const { toast } = await import('vue-sonner');
      toast.info(t('methodologies.detail.decoded.actions.saveNoChanges'));
    }
    return;
  }
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;
  saveMappingPending.value = true;

  // Build body: only send changed keys. Send the new schema path for remapped
  // entries; send `null` for entries the user cleared (the backend deletes
  // those labels from the merged map). Keys not sent are left unchanged.
  const fieldMap: Record<string, string | null> = {};
  for (const [label, value] of Object.entries(pendingChanges.value)) {
    fieldMap[label] = value || null;
  }

  try {
    const updated = await $fetch<DecodedMethodologyResponse>(
      `/api/v1/${network.value}/methodologies/${id.value}/decoded`,
      {
        method: 'PATCH',
        baseURL,
        body: { fieldMap },
      },
    );
    decodedData.value = updated;
    cancelEditMode();
    const { toast } = await import('vue-sonner');
    toast.success(t('methodologies.detail.decoded.actions.saveSuccess'));
  } catch (err: any) {
    const { toast } = await import('vue-sonner');
    const detail = err?.data?.message ?? err?.message ?? '';
    toast.error(`${t('methodologies.detail.decoded.actions.saveError')}${detail ? ': ' + detail : ''}`);
  } finally {
    saveMappingPending.value = false;
  }
}

const formatLastAttempt = (ts: string | null | undefined): string => {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
};

type ResolvedFieldKey = 'name' | 'country' | 'developer' | 'category' | 'scale' | 'sector' | 'vintageRaw' | 'creditingPeriod' | 'sdgOrCobenefits';

interface ProjectFieldRow {
  labelKey: string;
  fieldKey: ResolvedFieldKey | 'geo';
}

const PROJECT_FIELD_ROWS: ProjectFieldRow[] = [
  { labelKey: 'name', fieldKey: 'name' },
  { labelKey: 'geo', fieldKey: 'geo' },
  { labelKey: 'country', fieldKey: 'country' },
  { labelKey: 'developer', fieldKey: 'developer' },
  { labelKey: 'sector', fieldKey: 'sector' },
  { labelKey: 'category', fieldKey: 'category' },
  { labelKey: 'scale', fieldKey: 'scale' },
  { labelKey: 'creditingPeriod', fieldKey: 'creditingPeriod' },
  { labelKey: 'vintageRaw', fieldKey: 'vintageRaw' },
  { labelKey: 'sdgOrCobenefits', fieldKey: 'sdgOrCobenefits' },
];

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
    rawVc: i.rawVc ?? null,
  }));
});

const vcViewerOpen = ref(false);
const vcViewerTitle = ref('');
const vcViewerData = ref<Record<string, any> | null>(null);

function viewIssuanceVc(c: { tokenId: string; name: string; rawVc: Record<string, any> | null }) {
  vcViewerTitle.value = c.name || c.tokenId;
  vcViewerData.value = c.rawVc;
  vcViewerOpen.value = true;
}

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
                <span
                  :class="[
                    decodeStatusClass(methodology.decodeStatus),
                    'inline-flex items-center text-xs font-medium rounded-full px-2.5 py-0.5',
                  ]"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-current mr-1.5 shrink-0" />
                  {{ $t('methodologies.decodeStatus.' + (methodology.decodeStatus ?? 'unknown')) }}
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

      <!-- Tab: Decoded Mapping -->
      <div v-else-if="activeTab === 'decoded'" class="space-y-6">
        <!-- Loading skeleton -->
        <template v-if="decodedPending">
          <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30">
              <Skeleton class="h-4 w-40" />
            </div>
            <div class="px-5 py-5 space-y-3">
              <Skeleton class="h-5 w-24 rounded-full" />
              <Skeleton class="h-3 w-48" />
            </div>
          </div>
          <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30">
              <Skeleton class="h-4 w-56" />
            </div>
            <div class="divide-y">
              <div v-for="i in 8" :key="i" class="px-5 py-3 flex gap-6">
                <Skeleton class="h-4 w-32" />
                <Skeleton class="h-4 w-48" />
              </div>
            </div>
          </div>
        </template>

        <!-- Fetch error -->
        <template v-else-if="decodedError && !decodedData">
          <div class="rounded-xl border bg-card px-6 py-10 text-center">
            <AlertCircle class="h-7 w-7 text-destructive mx-auto mb-3" />
            <p class="text-sm text-muted-foreground">{{ decodedError }}</p>
          </div>
        </template>

        <template v-else-if="decodedData">
          <!-- 1. Decode status header -->
          <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30">
              <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileSearch class="h-4 w-4 text-primary" />
                {{ $t('methodologies.detail.decoded.title') }}
              </h2>
            </div>
            <div class="px-5 py-4 space-y-3">
              <!-- Status pill -->
              <div class="flex items-center gap-3">
                <span
                  :class="[
                    decodeStatusClass(decodedData.decodeStatus),
                    'text-xs font-medium rounded-full px-2.5 py-1 capitalize',
                  ]"
                >
                  {{ decodedData.decodeStatus }}
                </span>
                <span class="text-xs text-muted-foreground">
                  {{ $t('methodologies.detail.decoded.lastAttempt') }}:
                  {{ formatLastAttempt(decodedData.lastAttemptAt) }}
                  &middot;
                  {{ decodedData.attempts }} {{ $t('methodologies.detail.decoded.attempts') }}
                </span>
              </div>
              <!-- Error callout -->
              <div
                v-if="decodedData.decodeStatus === 'failed' && decodedData.decodeError"
                class="flex items-start gap-3 rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3"
              >
                <AlertCircle class="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <div class="text-xs font-medium text-destructive mb-0.5">
                    {{ $t('methodologies.detail.decoded.errorCallout') }}
                  </div>
                  <p class="text-xs text-destructive/80 font-mono break-all">{{ decodedData.decodeError }}</p>
                </div>
              </div>
              <!-- Action buttons row -->
              <div class="flex items-center justify-end gap-2 pt-1">
                <!-- Re-run decoder -->
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="redecodePending || decodedData.decodeStatus === 'pending'"
                  @click="triggerRedecode"
                >
                  <RefreshCw :class="['h-3.5 w-3.5', redecodePending ? 'animate-spin' : '']" />
                  {{ $t('methodologies.detail.decoded.actions.rerunDecoder') }}
                </Button>
                <!-- Re-parse projects — disabled unless decode succeeded -->
                <div class="relative group">
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="reparsePending || decodedData.decodeStatus !== 'success'"
                    @click="triggerReparse"
                  >
                    <RotateCcw :class="['h-3.5 w-3.5', reparsePending ? 'animate-spin' : '']" />
                    {{ $t('methodologies.detail.decoded.actions.reparseProjects') }}
                  </Button>
                  <!-- Tooltip explaining why button is disabled when decode not successful -->
                  <div
                    v-if="decodedData.decodeStatus !== 'success'"
                    class="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:block z-50"
                  >
                    <div class="bg-foreground text-background text-xs rounded px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                      {{ $t('methodologies.detail.decoded.actions.reparseDisabledHint') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Extracted fields table -->
          <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText class="h-4 w-4 text-primary" />
                {{ $t('methodologies.detail.decoded.fieldsTableTitle') }}
              </h2>
              <!-- Edit mapping controls — shown only when projectSchema and availableSchemas are present -->
              <template v-if="decodedData.projectSchema && decodedData.availableSchemas && decodedData.availableSchemas.length > 0">
                <template v-if="!editingMapping">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="enterEditMode"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                    {{ $t('methodologies.detail.decoded.actions.editMapping') }}
                  </Button>
                </template>
                <template v-else>
                  <div class="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      :disabled="saveMappingPending"
                      @click="cancelEditMode"
                    >
                      {{ $t('methodologies.detail.decoded.actions.cancel') }}
                    </Button>
                    <Button
                      size="sm"
                      :disabled="saveMappingPending || !hasChanges"
                      @click="saveMapping"
                    >
                      {{ $t('methodologies.detail.decoded.actions.save') }}
                    </Button>
                  </div>
                </template>
              </template>
            </div>

            <!-- No schema state — only when there are also no available schemas -->
            <div
              v-if="!decodedData.projectSchema && (!decodedData.availableSchemas || decodedData.availableSchemas.length === 0)"
              class="px-5 py-8 text-center"
            >
              <FileSearch class="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
              <p class="text-sm text-muted-foreground">
                {{ $t('methodologies.detail.decoded.noSchema') }}
              </p>
            </div>

            <!-- Decoded but no GeoJSON schema confirmed — explain why projects can't auto-extract -->
            <div
              v-else-if="!decodedData.projectSchema"
              class="px-5 py-4 bg-stat-amber/5 border-b text-sm text-foreground"
            >
              <div class="flex items-start gap-2">
                <AlertCircle class="h-4 w-4 text-stat-amber shrink-0 mt-0.5" />
                <div>
                  <div class="font-medium">{{ $t('methodologies.detail.decoded.noGeoTitle') }}</div>
                  <div class="text-xs text-muted-foreground mt-0.5">
                    {{ $t('methodologies.detail.decoded.noGeoBody') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Fields table -->
            <table v-else class="w-full text-sm">
              <thead>
                <tr class="border-b bg-muted/20">
                  <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/3">
                    {{ $t('methodologies.detail.decoded.columns.projectField') }}
                  </th>
                  <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {{ $t('methodologies.detail.decoded.columns.schemaField') }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr
                  v-for="row in PROJECT_FIELD_ROWS"
                  :key="row.fieldKey"
                  class="hover:bg-muted/30 transition-colors"
                >
                  <td class="py-3 px-5 text-sm font-medium text-foreground">
                    {{ $t('methodologies.detail.decoded.fieldLabels.' + row.labelKey) }}
                  </td>
                  <td class="py-3 px-4">
                    <!-- Geo row: reads geoKey + geoFieldTitle directly; not editable in v1 (geo has special GeoJSON semantics handled by the backend). -->
                    <template v-if="row.fieldKey === 'geo'">
                      <template v-if="decodedData.projectSchema.geoKey">
                        <div class="text-sm text-foreground font-medium">
                          {{ decodedData.projectSchema.geoFieldTitle || decodedData.projectSchema.geoKey }}
                          <span class="text-muted-foreground font-normal">({{ decodedData.projectSchema.geoKey }})</span>
                        </div>
                      </template>
                      <span v-else class="text-sm text-muted-foreground">—</span>
                    </template>
                    <!-- ResolvedFields rows — show select in edit mode, display text otherwise -->
                    <template v-else>
                      <!-- Edit mode: select dropdown -->
                      <template v-if="editingMapping">
                        <select
                          v-model="formState[row.fieldKey as ResolvedFieldKey]"
                          class="w-full max-w-sm rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">{{ $t('methodologies.detail.decoded.actions.unmapped') }}</option>
                          <optgroup
                            v-for="group in mappingOptionGroups"
                            :key="group.label"
                            :label="group.label"
                          >
                            <option
                              v-for="opt in group.options"
                              :key="opt.value"
                              :value="opt.value"
                            >
                              {{ opt.label }}
                            </option>
                          </optgroup>
                        </select>
                      </template>
                      <!-- View mode: display resolved field text -->
                      <template v-else>
                        <template v-if="decodedData.projectSchema.resolvedFields[row.fieldKey as ResolvedFieldKey]">
                          <div class="text-sm text-foreground font-medium">
                            {{ decodedData.projectSchema.resolvedFields[row.fieldKey as ResolvedFieldKey]!.title }}
                            <span class="text-muted-foreground font-normal">({{ decodedData.projectSchema.resolvedFields[row.fieldKey as ResolvedFieldKey]!.fieldKey }})</span>
                          </div>
                          <div
                            v-if="decodedData.projectSchema.resolvedFields[row.fieldKey as ResolvedFieldKey]!.description"
                            class="text-xs text-muted-foreground mt-0.5 leading-relaxed"
                          >
                            {{ decodedData.projectSchema.resolvedFields[row.fieldKey as ResolvedFieldKey]!.description }}
                          </div>
                        </template>
                        <span v-else class="text-sm text-muted-foreground">—</span>
                      </template>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 3. All schema fields (collapsible) -->
          <div
            v-if="decodedData.projectSchema && decodedData.projectSchema.fieldMap.length > 0"
            class="rounded-xl border bg-card overflow-hidden"
          >
            <button
              class="w-full px-5 py-3.5 flex items-center justify-between text-left bg-muted/30 hover:bg-muted/50 transition-colors"
              @click="allSchemaFieldsExpanded = !allSchemaFieldsExpanded"
            >
              <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <Hash class="h-4 w-4 text-primary" />
                {{ $t('methodologies.detail.decoded.allFieldsTitle') }}
                <span class="text-xs font-normal text-muted-foreground">
                  ({{ decodedData.projectSchema.fieldMap.length }})
                </span>
              </h2>
              <ChevronDown
                :class="[
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  allSchemaFieldsExpanded ? 'rotate-180' : '',
                ]"
              />
            </button>

            <div v-if="allSchemaFieldsExpanded">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b bg-muted/20">
                    <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {{ $t('methodologies.detail.decoded.columns.fieldKey') }}
                    </th>
                    <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {{ $t('methodologies.detail.decoded.columns.title') }}
                    </th>
                    <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                      {{ $t('methodologies.detail.decoded.columns.description') }}
                    </th>
                    <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {{ $t('methodologies.detail.decoded.columns.usedAs') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr
                    v-for="field in decodedData.projectSchema.fieldMap"
                    :key="field.fieldKey"
                    class="hover:bg-muted/30 transition-colors"
                  >
                    <td class="py-2.5 px-5">
                      <code class="text-xs font-mono bg-muted rounded px-1.5 py-0.5">{{ field.fieldKey }}</code>
                    </td>
                    <td class="py-2.5 px-4 text-sm text-foreground">{{ field.title || '—' }}</td>
                    <td class="py-2.5 px-4 text-xs text-muted-foreground hidden sm:table-cell max-w-[280px] truncate" :title="field.description || ''">
                      {{ field.description || '—' }}
                    </td>
                    <td class="py-2.5 px-4">
                      <span
                        v-if="field.resolvedAs"
                        class="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5"
                      >
                        {{ field.resolvedAs }}
                      </span>
                      <span v-else class="text-xs text-muted-foreground">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 4. Available schemas (rendered when projectSchema is null but the policy did decode) -->
          <div
            v-if="!decodedData.projectSchema && decodedData.availableSchemas && decodedData.availableSchemas.length > 0"
            class="rounded-xl border bg-card overflow-hidden"
          >
            <div class="px-5 py-3.5 border-b bg-muted/30">
              <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <Hash class="h-4 w-4 text-primary" />
                {{ $t('methodologies.detail.decoded.availableSchemasTitle') }}
                <span class="text-xs font-normal text-muted-foreground">
                  ({{ decodedData.availableSchemas.length }})
                </span>
              </h2>
            </div>
            <div class="divide-y">
              <div
                v-for="schema in decodedData.availableSchemas"
                :key="schema.schemaId"
                class="px-5 py-4"
              >
                <div class="flex items-start justify-between gap-3 mb-2">
                  <div class="min-w-0">
                    <div class="text-sm font-medium text-foreground truncate">
                      {{ schema.schemaName || $t('methodologies.detail.decoded.untitledSchema') }}
                    </div>
                    <div v-if="schema.schemaDescription" class="text-xs text-muted-foreground mt-0.5">
                      {{ schema.schemaDescription }}
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-1.5 shrink-0">
                    <span
                      v-if="schema.hasGeoJsonField"
                      class="text-[10px] font-medium bg-stat-green/10 text-stat-green rounded-full px-2 py-0.5"
                    >
                      {{ $t('methodologies.detail.decoded.hasGeo') }}
                    </span>
                    <span
                      v-else
                      class="text-[10px] font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5"
                    >
                      {{ $t('methodologies.detail.decoded.noGeo') }}
                    </span>
                  </div>
                </div>
                <div v-if="schema.fields.length > 0" class="overflow-x-auto">
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="border-b">
                        <th class="text-left py-1.5 px-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.decoded.columns.fieldKey') }}</th>
                        <th class="text-left py-1.5 px-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.decoded.columns.title') }}</th>
                        <th class="text-left py-1.5 px-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{{ $t('methodologies.detail.decoded.columns.description') }}</th>
                        <th class="text-left py-1.5 px-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.decoded.columns.type') }}</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y">
                      <tr v-for="f in schema.fields" :key="f.fieldKey" class="hover:bg-muted/30">
                        <td class="py-1.5 px-2">
                          <code class="text-[10px] font-mono bg-muted rounded px-1 py-0.5">{{ f.fieldKey }}</code>
                        </td>
                        <td class="py-1.5 px-2 text-foreground">
                          <span :class="f.isGeoJson ? 'text-stat-green font-medium' : ''">{{ f.title || '—' }}</span>
                        </td>
                        <td class="py-1.5 px-2 text-muted-foreground hidden sm:table-cell max-w-[260px] truncate" :title="f.description || ''">
                          {{ f.description || '—' }}
                        </td>
                        <td class="py-1.5 px-2">
                          <span
                            v-if="f.isGeoJson"
                            class="text-[10px] font-medium bg-stat-green/10 text-stat-green rounded-full px-1.5 py-0.5"
                          >GeoJSON</span>
                          <span v-else class="text-muted-foreground text-[10px]">{{ f.type || '—' }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="text-xs text-muted-foreground italic">
                  {{ $t('methodologies.detail.decoded.noFields') }}
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Not yet loaded (immediate=true but tab wasn't active yet; shouldn't reach here) -->
        <template v-else-if="!decodedPending && !decodedLoaded">
          <div class="rounded-xl border bg-card px-6 py-10 text-center">
            <p class="text-sm text-muted-foreground">{{ $t('methodologies.detail.decoded.decodeNotComplete') }}</p>
          </div>
        </template>
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
                  <th class="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Raw Data</th>
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
                  <td class="py-3 px-4 text-center">
                    <button
                      class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="View Raw Data"
                      @click="viewIssuanceVc(c)"
                    >
                      <FileJson class="h-3.5 w-3.5" />
                    </button>
                  </td>
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

  <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
</template>
