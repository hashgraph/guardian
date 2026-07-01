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
  Download,
} from "lucide-vue-next";
import { formatCredits, formatNumber } from "~/lib/format";
import { allocateDonutColors } from "~/lib/chart-colors";
import type {
  MethodologyDto,
  MethodologiesResponse,
} from "~/composables/api/useMethodologiesApi";
import type { DecodedMethodologyResponse } from "~/composables/api/useDecodedMethodologyApi";
import { mapApiProject } from "~/composables/useProjects";
import { meetsDashboardThreshold } from "~/lib/methodology-threshold";
import { naturalCompare } from '~/lib/utils';

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

const hashscanUrl = computed(() => {
  // Prefer the exact transaction that published the policy document — its HCS
  // consensus timestamp is methodology.sourceTimestamp. Fall back to the topic
  // view when the timestamp is unavailable.
  const ts = methodology.value?.sourceTimestamp;
  if (ts) return `https://hashscan.io/${network.value}/transaction/${ts}`;
  return methodology.value?.topicId
    ? `https://hashscan.io/${network.value}/topic/${methodology.value.topicId}`
    : null;
});

// Download the policy ZIP through our API (served from cached IPFS content).
// Shown only once the policy is decoded — that's when the ZIP is cached.
const policyPackageUrl = computed(() => {
  if (methodology.value?.decodeStatus !== 'success') return null;
  const base = (useRuntimeConfig().public.apiBaseUrl as string) || '';
  return `${base}/api/v1/${network.value}/methodologies/${id.value}/policy-package`;
});

const publishedAt = computed(() => {
  const ts = methodology.value?.sourceTimestamp;
  if (!ts) return null;
  return new Date(parseFloat(ts) * 1000).toLocaleString();
});

const showDashboard = computed(() =>
  methodology.value
    ? meetsDashboardThreshold(methodology.value.stats.projectCount, methodology.value.stats.issuanceCount)
    : false,
);

// Linked Projects: fetch when tab is activated
const linkedProjects = ref<Record<string, any>[]>([]);
const linkedProjectsPending = ref(false);
const linkedProjectsLoaded = ref(false);

const linkedProjectsMapped = computed(() => linkedProjects.value.map(mapApiProject));
const { resolvedCode: resolvedProjectCode, resolvedName: resolvedProjectName } = useGeocodedCountries(linkedProjectsMapped);

if (import.meta.client) {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;

  async function loadLinkedProjects(instId: string) {
    linkedProjectsPending.value = true;
    try {
      const res = await $fetch<{ data: Record<string, any>[]; meta: { total: number } }>(
        `/api/v1/${network.value}/projects`,
        { baseURL, query: { instanceTopicId: instId, limit: 100, page: 1 } },
      );
      linkedProjects.value = res.data ?? [];
    } catch {
      linkedProjects.value = [];
    } finally {
      linkedProjectsPending.value = false;
      linkedProjectsLoaded.value = true;
    }
  }

  // Linked projects scope to this *version* of the methodology — filtered by
  // instanceTopicId (the URL id), not policyTopicId, so v0.1 and v0.2 of the
  // same policy show different project lists.
  watch(
    [activeTab, id],
    async ([tab, instId], [, oldInstId]) => {
      if (tab !== 'projects' || !instId) return;
      if (instId === oldInstId && linkedProjectsLoaded.value) return;
      linkedProjectsLoaded.value = false;
      await loadLinkedProjects(instId);
    },
    { immediate: true },
  );

  // Eagerly load for dashboard section when threshold is met
  watch(
    [methodology, id] as const,
    ([m, instId]) => {
      if (!m || !instId) return;
      if (!meetsDashboardThreshold(m.stats.projectCount, m.stats.issuanceCount)) return;
      if (linkedProjectsLoaded.value) return;
      loadLinkedProjects(instId);
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

// Decode / reparse / edit-mapping are admin-only maintenance actions (spec).
const { isAdmin } = useAuth();
const { header: csrfHeader } = useCsrf();
const redecodePending = ref(false);

async function triggerRedecode() {
  if (!import.meta.client) return;
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;
  redecodePending.value = true;
  try {
    await $fetch(
      `/api/v1/${network.value}/methodologies/${id.value}/redecode`,
      { method: 'POST', baseURL, credentials: 'include', headers: csrfHeader() },
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
      { method: 'POST', baseURL, credentials: 'include', headers: csrfHeader() },
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
  'description',
  'country',
  'developer',
  'category',
  'scale',
  'sector',
  'vintageRaw',
  'creditingPeriodStart',
  'creditingPeriodEnd',
  'sdgOrCobenefits',
  'geo',
];

const FIELD_LABELS: Record<ResolvedFieldKey, string> = {
  name: 'Project Title',
  description: 'Description',
  country: 'Country',
  developer: 'Developer',
  category: 'Category',
  scale: 'Scale',
  sector: 'Sector',
  vintageRaw: 'Vintage / Start Date',
  creditingPeriodStart: 'Crediting Period Start',
  creditingPeriodEnd: 'Crediting Period End',
  sdgOrCobenefits: 'SDGs / Co-benefits',
  geo: 'Project Location',
};

const editingMapping = ref(false);
// formState: key → "schemaId.fieldKey" or '' (unmapped)
const formState = ref<Record<ResolvedFieldKey, string>>({} as Record<ResolvedFieldKey, string>);
const saveMappingPending = ref(false);

// Look up the schemaIri that owns a given fieldPath. For nested paths like
// "projectSiteCountryarea", the backend stores it under a sub-schema IRI
// (e.g., "#3cbd0aa8-...&1.0.0"). We scan availableSchemas to find which
// schema actually defines that field key, so the dropdown value matches.
function findOwningSchemaIri(fieldPath: string, defaultIri: string): string {
  const schemas = decodedData.value?.availableSchemas ?? [];
  for (const s of schemas) {
    if ((s.fields ?? []).some(f => f.fieldKey === fieldPath)) {
      return s.schemaId;
    }
  }
  return defaultIri;
}

function enterEditMode() {
  if (!decodedData.value?.projectSchema) return;
  const resolved = decodedData.value.projectSchema.resolvedFields as Record<string, { fieldKey: string } | null>;
  const ps = decodedData.value.projectSchema;
  const projectIri = ps.schemaId;
  const state = {} as Record<ResolvedFieldKey, string>;
  for (const key of EDITABLE_FIELD_KEYS) {
    if (key === 'geo') {
      if (ps.geoKey) {
        const iri = findOwningSchemaIri(ps.geoKey, projectIri);
        state[key] = `${iri}.${ps.geoKey}`;
      } else {
        state[key] = '';
      }
      continue;
    }
    const rf = resolved[key];
    if (rf) {
      const iri = findOwningSchemaIri(rf.fieldKey, projectIri);
      state[key] = `${iri}.${rf.fieldKey}`;
    } else {
      state[key] = '';
    }
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
  const resolved = decodedData.value.projectSchema.resolvedFields as Record<string, { fieldKey: string } | null>;
  const ps = decodedData.value.projectSchema;
  const projectIri = ps.schemaId;
  const state = {} as Record<ResolvedFieldKey, string>;
  for (const key of EDITABLE_FIELD_KEYS) {
    if (key === 'geo') {
      if (ps.geoKey) {
        const iri = findOwningSchemaIri(ps.geoKey, projectIri);
        state[key] = `${iri}.${ps.geoKey}`;
      } else {
        state[key] = '';
      }
      continue;
    }
    const rf = resolved[key];
    if (rf) {
      const iri = findOwningSchemaIri(rf.fieldKey, projectIri);
      state[key] = `${iri}.${rf.fieldKey}`;
    } else {
      state[key] = '';
    }
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
  const SKIP_KEYS = new Set(['@context', 'type', 'id', 'policyId', 'ref', 'uuid']);
  for (const schema of schemas) {
    if (!schema.fields?.length) continue;
    const groupLabel = schema.schemaName || schema.schemaId;
    for (const field of schema.fields) {
      if (field.isGeoJson) continue;
      if (SKIP_KEYS.has(field.fieldKey)) continue;
      if (field.type === 'object' || field.type === 'array' || field.type === '') continue;
      options.push({
        value: `${schema.schemaId}.${field.fieldKey}`,
        label: `${field.title || field.fieldKey} (${field.fieldKey})`,
        groupLabel,
      });
    }
  }
  // Ensure the projectSchema's own fieldMap entries are present as options
  // even if they aren't found in availableSchemas (data consistency edge case).
  if (decodedData.value.projectSchema) {
    const ps = decodedData.value.projectSchema;
    const existingValues = new Set(options.map(o => o.value));
    const groupLabel = ps.schemaName || ps.schemaId;
    for (const entry of ps.fieldMap ?? []) {
      const value = `${ps.schemaId}.${entry.fieldKey}`;
      if (!existingValues.has(value)) {
        options.push({
          value,
          label: `${entry.title || entry.fieldKey} (${entry.fieldKey})`,
          groupLabel,
        });
      }
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

// Geo row options are the INVERSE of the regular set: the "Project Location"
// row maps to a GeoJSON geometry field, which mappingSelectOptions deliberately
// excludes (and they're object-typed, so the object/array filter drops them too).
// Without this, the currently-mapped geo field has no matching option — the
// dropdown shows a raw "#schemaIri.fieldPath" value and the field can't be
// reselected. So build a geo-specific list of the isGeoJson fields.
const geoSelectOptions = computed<SelectOption[]>(() => {
  if (!decodedData.value) return [];
  const options: SelectOption[] = [];
  const seen = new Set<string>();
  const SKIP_KEYS = new Set(['@context', 'type', 'id', 'policyId', 'ref', 'uuid']);
  for (const schema of decodedData.value.availableSchemas ?? []) {
    if (!schema.fields?.length) continue;
    const groupLabel = schema.schemaName || schema.schemaId;
    for (const field of schema.fields) {
      if (!field.isGeoJson) continue;
      if (SKIP_KEYS.has(field.fieldKey)) continue;
      const value = `${schema.schemaId}.${field.fieldKey}`;
      if (seen.has(value)) continue;
      seen.add(value);
      options.push({
        value,
        label: `${field.title || field.fieldKey} (${field.fieldKey})`,
        groupLabel,
      });
    }
  }
  return options;
});

const geoOptionGroups = computed<{ label: string; options: SelectOption[] }[]>(() => {
  const map = new Map<string, SelectOption[]>();
  for (const opt of geoSelectOptions.value) {
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
        credentials: 'include',
        headers: csrfHeader(),
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

type ResolvedFieldKey = 'name' | 'description' | 'country' | 'developer' | 'category' | 'scale' | 'sector' | 'vintageRaw' | 'creditingPeriodStart' | 'creditingPeriodEnd' | 'sdgOrCobenefits' | 'geo';

interface ProjectFieldRow {
  labelKey: string;
  fieldKey: ResolvedFieldKey | 'geo' | 'creditingPeriod';
}

const PROJECT_FIELD_ROWS: ProjectFieldRow[] = [
  { labelKey: 'name', fieldKey: 'name' },
  { labelKey: 'description', fieldKey: 'description' },
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

async function viewIssuanceVc(c: { tokenId: string; name: string }) {
  vcViewerTitle.value = c.name || c.tokenId;
  vcViewerOpen.value = true;
  vcViewerData.value = null;
  const apiBaseURL = (useRuntimeConfig().public.apiBaseUrl as string) || '';
  try {
    const raw = await $fetch<{ mintEvents: Array<{ document: Record<string, any> | null }> }>(
      `/api/v1/${network.value}/credits/${encodeURIComponent(c.tokenId)}/raw`,
      { baseURL: apiBaseURL },
    );
    const events = raw.mintEvents ?? [];
    vcViewerData.value = events[events.length - 1]?.document ?? null;
  } catch (err) {
    vcViewerData.value = {
      error: 'Failed to load raw data',
      message: err instanceof Error ? err.message : String(err),
      tokenId: c.tokenId,
    };
  }
}

// Lifecycle summary — sourced from backend-computed totals on the methodology
const lifecycleSummary = computed(() => {
  const totalIssued = methodology.value?.totalIssued ?? 0;
  const totalRetired = methodology.value?.totalRetired ?? 0;
  const active = methodology.value?.totalActive ?? 0;
  return { totalIssued, totalRetired, active };
});

// ─── Methodology Dashboard ────────────────────────────────────────────────────

const INVALID_COUNTRY_LOWER = new Set([
  'not applicable', 'not specified', 'n/a', 'na', 'none', 'not stated',
  'not available', 'not provided', 'unknown',
  'point', 'multipoint', 'linestring', 'multilinestring',
  'polygon', 'multipolygon', 'geometrycollection',
]);

const geoDistribution = computed(() => {
  // Subscribe to geocoding cache updates so this recomputes when lat/lng lookups resolve
  const counts: Record<string, { projects: number; code: string }> = {};
  for (const p of linkedProjectsMapped.value) {
    const code = resolvedProjectCode(p);
    if (code === 'UNK') continue;
    const name = resolvedProjectName(p);
    if (!name || INVALID_COUNTRY_LOWER.has(name.toLowerCase())) continue;
    if (!counts[name]) counts[name] = { projects: 0, code };
    counts[name].projects++;
  }
  return Object.entries(counts)
    .map(([country, d]) => ({ country, projects: d.projects, code: d.code, countryCode: d.code }))
    .sort((a, b) => b.projects - a.projects);
});

const mapPoints = computed(() =>
  linkedProjectsMapped.value
    .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number' && (p.lat !== 0 || p.lng !== 0))
    .map(p => ({ name: p.name ?? '', lat: p.lat as number, lng: p.lng as number }))
);

const selectedGeoCountry = ref<string | null>(null);

const activeGeoDetail = computed(() => {
  const code = selectedGeoCountry.value;
  if (!code) return null;
  const entry = geoDistribution.value.find(c => c.countryCode === code);
  if (!entry) return null;

  const countryProjects = linkedProjectsMapped.value.filter(p => resolvedProjectCode(p) === code);
  const catCounts: Record<string, number> = {};
  for (const p of countryProjects) {
    const label = p.category || p.sector || 'Unknown';
    catCounts[label] = (catCounts[label] ?? 0) + 1;
  }
  const total = countryProjects.length || 1;
  const ordered = Object.entries(catCounts)
    .map(([label, count]) => ({ label, value: Math.round((count / total) * 100) }))
    .sort((a, b) => b.value - a.value);
  const colors = allocateDonutColors(ordered.length, `geo-sector-${code}`);
  const sectors = ordered.map((s, i) => ({ ...s, color: colors[i] ?? '#d4d4d8' }));

  return { ...entry, sectors };
});

function onGeoCountryClick(code: string) {
  selectedGeoCountry.value = selectedGeoCountry.value === code ? null : code;
}

const issuanceTrend = computed(() => {
  const byYear: Record<string, number> = {};
  for (const iss of (methodology.value?.issuances ?? [])) {
    if (!iss.mintDate) continue;
    const year = new Date(iss.mintDate).getFullYear().toString();
    byYear[year] = (byYear[year] ?? 0) + iss.supply;
  }
  const years = Object.keys(byYear).sort();
  if (years.length === 0) return { data: [], unit: '' };

  // Fill every year in the range (including gaps with 0) so the line connects.
  // When there is only a single year, prepend the previous year at 0 to ensure
  // at least two points so a line segment can be drawn.
  const minYear = parseInt(years[0]);
  const maxYear = parseInt(years[years.length - 1]);
  const startYear = minYear === maxYear ? minYear - 1 : minYear;
  const filled: [string, number][] = [];
  for (let y = startYear; y <= maxYear; y++) {
    filled.push([String(y), byYear[String(y)] ?? 0]);
  }

  const maxVal = filled.reduce((m, [, v]) => Math.max(m, v), 0);
  const divisor = maxVal >= 1_000_000 ? 1_000_000 : maxVal >= 1_000 ? 1_000 : 1;
  const unit = maxVal >= 1_000_000 ? 'M' : maxVal >= 1_000 ? 'K' : '';
  return {
    data: filled.map(([label, value]) => ({ label, value: Math.round((value / divisor) * 10) / 10 })),
    unit,
  };
});

const vintageByIssuance = computed(() => {
  const byVintage: Record<string, { credits: number; projects: number }> = {};
  for (const p of linkedProjectsMapped.value) {
    const raw = p.vintage?.trim() || (p.creditingPeriodStart ? String(new Date(p.creditingPeriodStart as string).getFullYear()) : '');
    const match = raw.match(/\d{4}/);
    if (!match) continue;
    const year = match[0];
    if (!byVintage[year]) byVintage[year] = { credits: 0, projects: 0 };
    byVintage[year].credits += p.credits ?? 0;
    byVintage[year].projects += 1;
  }
  return Object.entries(byVintage)
    .sort(([a], [b]) => naturalCompare(a, b))
    .map(([label, d]) => ({ label, credits: d.credits, projects: d.projects }));
});

const vintageMax = computed(() => Math.max(...vintageByIssuance.value.map(v => v.credits), 0));

const vintageTotal = computed(() => vintageByIssuance.value.reduce((s, v) => s + v.projects, 0));


const issuanceTrendTotal = computed(() =>
  Math.round(issuanceTrend.value.data.reduce((s, d) => s + d.value, 0) * 10) / 10,
);

function getResolvedField(fieldKey: string) {
  const fields = decodedData.value?.projectSchema?.resolvedFields;
  if (!fields) return null;
  return (fields as Record<string, { fieldKey: string; title: string; description?: string } | null>)[fieldKey] ?? null;
}
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

      <!-- Methodology Dashboard -->
      <div v-if="showDashboard" class="rounded-xl border bg-card overflow-hidden">
        <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 class="h-4 w-4 text-primary" />
            {{ $t('methodologies.detail.dashboard.title') }}
          </h2>
        </div>

        <div v-if="linkedProjectsPending && linkedProjects.length === 0" class="px-5 py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw class="h-4 w-4 animate-spin" />
          Loading dashboard data...
        </div>

        <div v-else>
          <!-- Geographic Distribution (full width) -->
          <div class="border-b">
            <div class="flex items-center justify-between px-5 py-4">
              <div>
                <h3 class="text-sm font-semibold text-foreground">{{ $t('methodologies.detail.charts.geographicDistribution') }}</h3>
                <p class="text-xs text-muted-foreground mt-0.5">{{ $t('methodologies.detail.charts.geographicDistributionSub') }}</p>
              </div>
              <span class="text-[11px] text-muted-foreground">{{ geoDistribution.length }} {{ geoDistribution.length !== 1 ? $t('methodologies.detail.charts.geographicCountries') : $t('methodologies.detail.charts.geographicCountry') }}</span>
            </div>
            <div v-if="geoDistribution.length > 0" class="rounded-xl border mx-5 mb-5 bg-card overflow-hidden">
              <div class="flex h-[28rem]">
                <!-- Map -->
                <div class="flex-1 relative">
                  <ProjectMap
                    :countries="geoDistribution.map(c => ({ country: c.country, countryCode: c.countryCode, projects: c.projects, credits: '' }))"
                    :points="mapPoints"
                    @country-click="onGeoCountryClick"
                  />
                </div>
                <!-- Side panel -->
                <Transition
                  enter-active-class="transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.16,0.64,1)]"
                  enter-from-class="w-0 opacity-0"
                  enter-to-class="w-64 opacity-100"
                  leave-active-class="transition-all duration-200 ease-in"
                  leave-from-class="w-64 opacity-100"
                  leave-to-class="w-0 opacity-0"
                >
                  <div
                    v-if="activeGeoDetail"
                    class="w-64 shrink-0 border-l overflow-y-auto overflow-x-hidden bg-card"
                    style="scrollbar-gutter: stable;"
                  >
                    <div class="p-4 space-y-4">
                      <!-- Header -->
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2 min-w-0">
                          <CountryFlag :code="activeGeoDetail.countryCode" size="lg" />
                          <h3 class="text-sm font-semibold text-foreground truncate">{{ activeGeoDetail.country }}</h3>
                        </div>
                        <button
                          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          @click="selectedGeoCountry = null"
                        >
                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                      <!-- Project count -->
                      <NuxtLink
                        :to="{ path: '/projects', query: { country: activeGeoDetail.country } }"
                        class="block text-center group rounded-lg hover:bg-muted/30 transition-colors py-1"
                      >
                        <div class="text-3xl font-bold text-primary group-hover:underline tabular-nums">{{ activeGeoDetail.projects.toLocaleString() }}</div>
                        <div class="text-[11px] text-muted-foreground mt-0.5">Active Projects →</div>
                      </NuxtLink>
                      <!-- Sector breakdown -->
                      <div v-if="activeGeoDetail.sectors.length > 0">
                        <h4 class="text-xs font-semibold text-foreground mb-3">Sector</h4>
                        <div class="flex items-start gap-3">
                          <div class="w-[90px] h-[90px] shrink-0 flex items-center justify-center">
                            <DonutChart :segments="activeGeoDetail.sectors" :size="90" />
                          </div>
                          <div class="space-y-1.5 flex-1 min-w-0">
                            <div v-for="s in activeGeoDetail.sectors" :key="s.label" class="flex items-center gap-2 min-w-0">
                              <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />
                              <span class="text-[11px] text-muted-foreground truncate min-w-0">
                                <strong class="text-foreground">{{ s.value }}%</strong> {{ s.label }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
            <div v-else class="mx-5 mb-5 rounded-xl border bg-card flex items-center justify-center h-32">
              <p class="text-sm text-muted-foreground">{{ $t('methodologies.detail.charts.noGeographicData') }}</p>
            </div>
          </div>

          <!-- Issuance Trend + Vintage Distribution -->
          <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
          <!-- Issuance Trend -->
          <div>
            <div class="flex items-center justify-between px-5 py-4">
              <div>
                <h3 class="text-sm font-semibold text-foreground">{{ $t('methodologies.detail.charts.issuanceTrend') }}</h3>
                <p class="text-xs text-muted-foreground mt-0.5">{{ $t('methodologies.detail.charts.issuanceTrendSub', { unit: issuanceTrend.unit || 'units' }) }}</p>
              </div>
            </div>
            <div class="px-5 pb-5">
              <div class="rounded-xl border bg-card p-5">
                <TrendLineChart
                  :data="issuanceTrend.data"
                  :unit="issuanceTrend.unit"
                  color="hsl(142, 76%, 36%)"
                  fill-color="hsl(142, 76%, 36%, 0.08)"
                  :empty-text="$t('methodologies.detail.charts.noIssuanceData')"
                />
                <div class="flex items-center justify-between mt-4 pt-3 border-t">
                  <span class="text-xs text-muted-foreground">{{ issuanceTrend.data.length }} {{ issuanceTrend.data.length !== 1 ? $t('methodologies.detail.charts.issuanceTrendYears') : $t('methodologies.detail.charts.issuanceTrendYear') }}</span>
                  <span class="text-sm font-semibold text-foreground">{{ $t('methodologies.detail.charts.issuanceTrendTotal', { total: issuanceTrendTotal, unit: issuanceTrend.unit }) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Vintage Distribution -->
          <div class="flex flex-col">
            <div class="flex items-center justify-between px-5 py-4">
              <div>
                <h3 class="text-sm font-semibold text-foreground">{{ $t('methodologies.detail.charts.vintageDistribution') }}</h3>
                <p class="text-xs text-muted-foreground mt-0.5">{{ $t('methodologies.detail.charts.vintageDistributionSub') }}</p>
              </div>
            </div>
            <div class="px-5 pb-5 flex-1 flex flex-col">
              <div class="rounded-xl border bg-card p-5 flex-1 flex flex-col">
                <div v-if="vintageByIssuance.length > 0" class="flex items-end gap-3 flex-1 min-h-48">
                  <div
                    v-for="item in vintageByIssuance"
                    :key="item.label"
                    class="flex-1 flex flex-col items-center gap-2"
                  >
                    <span class="text-[11px] font-medium text-muted-foreground tabular-nums">{{ formatCredits(item.credits) }}</span>
                    <div
                      class="w-full rounded-t-md bg-chart-2/80 hover:bg-chart-2 transition-colors"
                      :style="{ height: `${vintageMax > 0 ? (item.credits / vintageMax) * 140 : 0}px` }"
                    />
                    <span class="text-[11px] text-muted-foreground">{{ item.label }}</span>
                  </div>
                </div>
                <div v-else class="flex items-center justify-center flex-1 min-h-48 text-sm text-muted-foreground">
                  {{ $t('methodologies.detail.charts.noVintageData') }}
                </div>
                <div class="flex items-center justify-between mt-4 pt-3 border-t">
                  <span class="text-xs text-muted-foreground">{{ vintageByIssuance.length }} {{ vintageByIssuance.length !== 1 ? $t('methodologies.detail.charts.vintageYears') : $t('methodologies.detail.charts.vintageYear') }}</span>
                  <span class="text-sm font-semibold text-foreground">{{ vintageTotal }} {{ vintageTotal !== 1 ? $t('methodologies.detail.charts.vintageProjects') : $t('methodologies.detail.charts.vintageProject') }}</span>
                </div>
              </div>
            </div>
          </div>
          </div><!-- end Issuance + Vintage grid -->

        </div><!-- end v-else -->
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
              <!-- Action buttons row (admin-only maintenance actions) -->
              <div v-if="isAdmin" class="flex items-center justify-end gap-2 pt-1">
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
              <!-- Edit mapping controls — admin-only, when projectSchema and availableSchemas are present -->
              <template v-if="isAdmin && decodedData.projectSchema && decodedData.availableSchemas && decodedData.availableSchemas.length > 0">
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
                    <!-- Geo row: dropdown in edit mode, geoKey display in view mode -->
                    <template v-if="row.fieldKey === 'geo'">
                      <template v-if="editingMapping">
                        <MappingFieldSelect
                          v-model="formState['geo']"
                          :groups="geoOptionGroups"
                          :unmapped-label="$t('methodologies.detail.decoded.actions.unmapped')"
                          :placeholder="$t('common.searchEllipsis')"
                        />
                      </template>
                      <template v-else>
                        <template v-if="decodedData.projectSchema.geoKey">
                          <div class="text-sm text-foreground font-medium">
                            {{ decodedData.projectSchema.geoFieldTitle || decodedData.projectSchema.geoKey }}
                            <span class="text-muted-foreground font-normal">({{ decodedData.projectSchema.geoKey }})</span>
                          </div>
                        </template>
                        <span v-else class="text-sm text-muted-foreground">—</span>
                      </template>
                    </template>
                    <!-- Crediting Period: combined view, split edit -->
                    <template v-else-if="row.fieldKey === 'creditingPeriod'">
                      <template v-if="editingMapping">
                        <div class="space-y-2">
                          <div>
                            <div class="text-[10px] text-muted-foreground mb-0.5">Start</div>
                            <MappingFieldSelect
                              v-model="formState['creditingPeriodStart']"
                              :groups="mappingOptionGroups"
                              :unmapped-label="$t('methodologies.detail.decoded.actions.unmapped')"
                              :placeholder="$t('common.searchEllipsis')"
                            />
                          </div>
                          <div>
                            <div class="text-[10px] text-muted-foreground mb-0.5">End</div>
                            <MappingFieldSelect
                              v-model="formState['creditingPeriodEnd']"
                              :groups="mappingOptionGroups"
                              :unmapped-label="$t('methodologies.detail.decoded.actions.unmapped')"
                              :placeholder="$t('common.searchEllipsis')"
                            />
                          </div>
                        </div>
                      </template>
                      <template v-else>
                        <div class="space-y-1">
                          <template v-if="decodedData.projectSchema.resolvedFields['creditingPeriodStart']">
                            <div class="text-sm text-foreground">
                              <span class="text-muted-foreground text-xs">Start:</span>
                              <span class="font-medium ml-1">{{ decodedData.projectSchema.resolvedFields['creditingPeriodStart']!.title }}</span>
                              <span class="text-muted-foreground font-normal ml-0.5">({{ decodedData.projectSchema.resolvedFields['creditingPeriodStart']!.fieldKey }})</span>
                            </div>
                          </template>
                          <template v-if="decodedData.projectSchema.resolvedFields['creditingPeriodEnd']">
                            <div class="text-sm text-foreground">
                              <span class="text-muted-foreground text-xs">End:</span>
                              <span class="font-medium ml-1">{{ decodedData.projectSchema.resolvedFields['creditingPeriodEnd']!.title }}</span>
                              <span class="text-muted-foreground font-normal ml-0.5">({{ decodedData.projectSchema.resolvedFields['creditingPeriodEnd']!.fieldKey }})</span>
                            </div>
                          </template>
                          <span v-if="!decodedData.projectSchema.resolvedFields['creditingPeriodStart'] && !decodedData.projectSchema.resolvedFields['creditingPeriodEnd']" class="text-sm text-muted-foreground">—</span>
                        </div>
                      </template>
                    </template>
                    <!-- Regular fields — select in edit mode, text in view mode -->
                    <template v-else>
                      <template v-if="editingMapping">
                        <MappingFieldSelect
                          v-model="formState[row.fieldKey as ResolvedFieldKey]"
                          :groups="mappingOptionGroups"
                          :unmapped-label="$t('methodologies.detail.decoded.actions.unmapped')"
                          :placeholder="$t('common.searchEllipsis')"
                        />
                      </template>
                      <template v-else>
                        <template v-if="getResolvedField(row.fieldKey)">
                          <div class="text-sm text-foreground font-medium">
                            {{ getResolvedField(row.fieldKey)?.title }}
                            <span class="text-muted-foreground font-normal">({{ getResolvedField(row.fieldKey)?.fieldKey }})</span>
                          </div>
                          <div
                            v-if="getResolvedField(row.fieldKey)?.description"
                            class="text-xs text-muted-foreground mt-0.5 leading-relaxed"
                          >
                            {{ getResolvedField(row.fieldKey)?.description }}
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
                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.linkedProjects.columns.issuances') }}</th>
                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.linkedProjects.columns.mintedAmount') }}</th>
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
                    <span>{{ resolvedProjectName(p) || '' }}</span>
                  </div>
                  <span v-else>—</span>
                </td>
                <td class="py-3 px-4 text-sm text-muted-foreground truncate max-w-[160px]">
                  {{ p.registry || '—' }}
                </td>
                <td class="py-3 px-4 text-right tabular-nums text-sm font-medium text-foreground">
                  {{ p.issuanceCount != null ? p.issuanceCount.toLocaleString() : '—' }}
                </td>
                <td class="py-3 px-4 text-right tabular-nums text-sm text-muted-foreground">
                  {{ (p.totalIssued ?? 0) > 0 ? formatCredits(p.totalIssued!) : '—' }}
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
                <td colspan="6" class="py-8 text-center text-sm text-muted-foreground">
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

            <div class="flex flex-wrap items-center gap-4">
              <a
                v-if="hashscanUrl"
                :href="hashscanUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <ExternalLink class="h-4 w-4" />
                {{ $t('methodologies.detail.viewOnHashScan') }}
              </a>
              <a
                v-if="policyPackageUrl"
                :href="policyPackageUrl"
                download
                class="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <Download class="h-4 w-4" />
                {{ $t('methodologies.detail.policy.downloadPolicy') }}
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
                  <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <span class="inline-flex items-start justify-end gap-1">{{ $t('credits.columns.supply') }} <span class="mt-0.5 shrink-0"><InfoTooltip :text="$t('credits.tooltips.mintAmount')" /></span></span>
                  </th>
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
