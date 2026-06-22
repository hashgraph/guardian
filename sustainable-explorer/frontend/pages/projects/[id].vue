<script setup lang="ts">
import {
    BookOpen, Coins, Layers, Shield,
    Globe, MapPin,
    Network, FileText, ChevronDown,
    Database,
    FolderKanban, BarChart3, RotateCcw, CloudDownload, Loader2, Search, X, Download,
} from 'lucide-vue-next';
import type { Credit } from '~/types/models';
import { formatDate } from '~/lib/format';
import { exportProject, type ExportFormat } from '~/lib/project-export';
import { getSDG } from '~/lib/sdgs';
import { getMethodologyName } from '~/lib/methodologies';
import { useDecodedMethodologyApi } from '~/composables/api/useDecodedMethodologyApi';
import { COUNTRY_ALPHA3 } from '~/composables/useProjects';
import { nominatimReverse, nominatimCountryCenter } from '~/composables/useNominatim';

const route = useRoute();
const { network } = useNetwork();
const projectId = computed(() => route.params.id as string);
const { project, pending } = useProjectDetail(projectId);

// When the API returns no country (UNK) but we have valid coordinates, fall back
// to a Nominatim reverse-geocode lookup so the correct flag is shown.
const geocodedCountry = ref<{ code: string; name: string } | null>(null);
watch(project, async (p) => {
    geocodedCountry.value = null;
    if (!p || p.countryCode !== 'UNK' || !p.lat || !p.lng) return;
    geocodedCountry.value = await nominatimReverse(p.lat, p.lng, n => COUNTRY_ALPHA3[n] ?? 'UNK');
}, { immediate: true });

const INVALID_COUNTRY = new Set([
    'not applicable', 'not specified', 'n/a', 'na', 'none', 'not stated',
    'not available', 'not provided', 'unknown',
    'point', 'multipoint', 'linestring', 'multilinestring',
    'polygon', 'multipolygon', 'geometrycollection',
]);
const displayCountryCode = computed(() => geocodedCountry.value?.code ?? project.value?.countryCode ?? 'UNK');
const displayCountry = computed(() => {
    const raw = (geocodedCountry.value?.name ?? project.value?.country ?? '').trim();
    if (!raw || INVALID_COUNTRY.has(raw.toLowerCase())) return '';
    // Never show a URL / IPFS-or-file URI / raw CID as a location.
    if (/:\/\//.test(raw) || /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{20,})$/i.test(raw)) return '';
    return raw;
});

// ─── Tabs (synced with URL hash) ──────────────────────────────────────────────

type TabKey = 'summary' | 'issuances' | 'documents' | 'advanced';
const VALID_TABS = new Set<TabKey>(['summary', 'issuances', 'documents', 'advanced']);

const router = useRouter();
const initialHash = (route.hash?.replace('#', '') ?? '') as TabKey;
const activeTab = ref<TabKey>(VALID_TABS.has(initialHash) ? initialHash : 'summary');

function setTab(key: TabKey) {
    activeTab.value = key;
    router.replace({ hash: key === 'summary' ? '' : `#${key}` });
}

const tabs = [
    { key: 'summary' as const,   label: 'Summary',              icon: FolderKanban },
    { key: 'documents' as const, label: 'Detailed Information',  icon: FileText },
    { key: 'issuances' as const, label: 'Issuances & Credits',  icon: Coins },
    { key: 'advanced' as const,  label: 'Advanced',             icon: Shield },
];

// ─── VC business data (lazy-loaded per schema) ───────────────────────────────

const SYSTEM_KEYS = new Set(['@context', 'type', 'id', 'policyId', 'ref', 'uuid']);

interface VcField { label: string; value: string; description?: string }
interface VcTable { label: string; columns: string[]; rows: Record<string, string>[] }
interface VcGroup { title: string; fields: VcField[]; tables: VcTable[] }
interface VcDocData { fields: VcField[]; tables: VcTable[]; groups: VcGroup[] }

const vcDataBySchema = ref<Record<string, VcDocData[]>>({});
const vcDataPending = ref<Record<string, boolean>>({});
const vcSchemaOpen = ref<Record<string, boolean>>({});
const vcRecordOpen = ref<Record<string, boolean>>({});
const docSearchQuery = ref('');

function filterDoc(doc: VcDocData, q: string): VcDocData | null {
    if (!q) return doc;
    const fieldMatches = (f: VcField) =>
        f.label.toLowerCase().includes(q)
        || f.value.toLowerCase().includes(q)
        || (f.description?.toLowerCase().includes(q) ?? false);
    const fields = doc.fields.filter(fieldMatches);
    const tables = doc.tables.filter(t =>
        t.label.toLowerCase().includes(q)
        || t.columns.some(c => humanizeKey(c).toLowerCase().includes(q))
        || t.rows.some(r => Object.values(r).some(v => v.toLowerCase().includes(q))),
    );
    const groups = doc.groups
        .map(g => {
            const gf = g.fields.filter(fieldMatches);
            const gt = g.tables.filter(t =>
                t.label.toLowerCase().includes(q)
                || t.rows.some(r => Object.values(r).some(v => v.toLowerCase().includes(q))),
            );
            if (gf.length === 0 && gt.length === 0 && !g.title.toLowerCase().includes(q)) return null;
            return { ...g, fields: gf.length > 0 || g.title.toLowerCase().includes(q) ? (gf.length > 0 ? gf : g.fields) : gf, tables: gt.length > 0 || g.title.toLowerCase().includes(q) ? (gt.length > 0 ? gt : g.tables) : gt };
        })
        .filter((g): g is VcGroup => g !== null);
    if (fields.length === 0 && tables.length === 0 && groups.length === 0) return null;
    return { fields, tables, groups };
}

function getFilteredDocs(schemaUuid: string): VcDocData[] {
    const docs = vcDataBySchema.value[schemaUuid];
    if (!docs) return [];
    const q = docSearchQuery.value.trim().toLowerCase();
    if (!q) return docs;
    return docs.map(d => filterDoc(d, q)).filter((d): d is VcDocData => d !== null);
}

function bareUuid(schemaId: string): string {
    return schemaId.replace(/^#/, '').replace(/&.*$/, '');
}

const schemaFieldTitles = computed<Record<string, Record<string, string>>>(() => {
    const schemas = decodedMethodology.data.value?.availableSchemas ?? [];
    const map: Record<string, Record<string, string>> = {};
    for (const s of schemas) {
        const fieldMap: Record<string, string> = {};
        for (const f of s.fields ?? []) {
            if (SYSTEM_KEYS.has(f.fieldKey)) continue;
            fieldMap[f.fieldKey] = f.title || f.fieldKey;
        }
        map[bareUuid(s.schemaId)] = fieldMap;
        map[s.schemaId] = fieldMap;
    }
    return map;
});

// Schema field descriptions — surfaced as tooltips next to field labels. Some
// methodologies define long descriptions for fields that only have terse
// titles (e.g. "G373"), so showing them inline would crowd the layout.
const schemaFieldDescriptions = computed<Record<string, Record<string, string>>>(() => {
    const schemas = decodedMethodology.data.value?.availableSchemas ?? [];
    const map: Record<string, Record<string, string>> = {};
    for (const s of schemas) {
        const fieldMap: Record<string, string> = {};
        for (const f of s.fields ?? []) {
            if (SYSTEM_KEYS.has(f.fieldKey)) continue;
            if (f.description) fieldMap[f.fieldKey] = f.description;
        }
        map[bareUuid(s.schemaId)] = fieldMap;
        map[s.schemaId] = fieldMap;
    }
    return map;
});

// Global fallback map: field key → description, merged across every schema in
// the policy. Used when the per-schema lookup misses — typically when a
// nested object lacks a `type` field, so structureVcData can't recover the
// right sub-schema UUID. Within one policy, field keys like G6 / G373 are
// effectively unique, so a flat merged lookup is safe.
const allFieldDescriptions = computed<Record<string, string>>(() => {
    const schemas = decodedMethodology.data.value?.availableSchemas ?? [];
    const map: Record<string, string> = {};
    for (const s of schemas) {
        for (const f of s.fields ?? []) {
            if (SYSTEM_KEYS.has(f.fieldKey)) continue;
            if (!f.description) continue;
            // First-seen wins so the top-level schema's description (more
            // authoritative) isn't overwritten by a later duplicate.
            if (!map[f.fieldKey]) map[f.fieldKey] = f.description;
        }
    }
    return map;
});

const schemaNames = computed<Record<string, string>>(() => {
    const schemas = decodedMethodology.data.value?.availableSchemas ?? [];
    const map: Record<string, string> = {};
    for (const s of schemas) {
        if (s.schemaName) {
            map[bareUuid(s.schemaId)] = s.schemaName;
            map[s.schemaId] = s.schemaName;
        }
    }
    return map;
});

// Reverse map: schema name (lowercase) → bare UUID, for resolving nested objects without a type field
const schemaNameToUuid = computed<Record<string, string>>(() => {
    const schemas = decodedMethodology.data.value?.availableSchemas ?? [];
    const map: Record<string, string> = {};
    for (const s of schemas) {
        if (s.schemaName) {
            map[s.schemaName.toLowerCase()] = bareUuid(s.schemaId);
        }
    }
    return map;
});

function resolveTitle(key: string, schemaUuid: string): string {
    const titles = schemaFieldTitles.value[schemaUuid]
        ?? schemaFieldTitles.value[bareUuid(schemaUuid)];
    if (titles?.[key]) return titles[key];
    return key
        .replace(/^field(\d+)$/, 'Field $1')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function resolveDescription(key: string, schemaUuid: string): string | undefined {
    const descs = schemaFieldDescriptions.value[schemaUuid]
        ?? schemaFieldDescriptions.value[bareUuid(schemaUuid)];
    // Fall back to the policy-wide map so nested-group fields whose
    // sub-schema we couldn't resolve still get tooltips.
    return descs?.[key] ?? allFieldDescriptions.value[key];
}

function humanizeKey(key: string): string {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function isArrayOfObjects(val: unknown): val is Record<string, any>[] {
    return Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null && !Array.isArray(val[0]);
}

function buildTable(label: string, arr: Record<string, any>[]): VcTable {
    const colSet = new Set<string>();
    for (const row of arr) {
        for (const k of Object.keys(row)) {
            if (!SYSTEM_KEYS.has(k)) colSet.add(k);
        }
    }
    const columns = Array.from(colSet);
    const rows = arr.map(row => {
        const mapped: Record<string, string> = {};
        for (const col of columns) {
            mapped[col] = formatCellValue(row[col]);
        }
        return mapped;
    });
    return { label, columns, rows };
}

function formatCellValue(v: unknown): string {
    if (v == null || v === '') return '—';
    if (Array.isArray(v)) {
        if (v.length === 0) return '—';
        if (v.every(x => typeof x === 'number')) {
            if (v.length <= 5) return v.map(n => Number(n.toFixed(4))).join(', ');
            const first = Number(v[0].toFixed(4));
            const last = Number(v[v.length - 1].toFixed(4));
            return `${first} → ${last} (${v.length} values)`;
        }
        return v.map(x => typeof x === 'object' ? formatCellValue(x) : String(x)).join(', ');
    }
    if (typeof v === 'object') {
        const obj = v as Record<string, unknown>;
        const keys = Object.keys(obj).filter(k => !SYSTEM_KEYS.has(k));
        if (keys.length === 0) return '—';
        return keys.map(k => {
            const val = obj[k];
            const fv = Array.isArray(val)
                ? (val.length <= 3 ? val.join(', ') : `[${val.length} items]`)
                : String(val ?? '—');
            return `${humanizeKey(k)}: ${fv}`;
        }).join(' · ');
    }
    return String(v);
}

function isDateRange(val: Record<string, any>): boolean {
    const keys = Object.keys(val).filter(k => !SYSTEM_KEYS.has(k));
    return keys.length === 2 && 'from' in val && 'to' in val;
}

function isCoordinates(val: Record<string, any>): boolean {
    return val['type'] === 'Point' && Array.isArray(val['coordinates']) && val['coordinates'].length >= 2;
}

function structureVcData(obj: Record<string, any>, schemaUuid: string): VcDocData {
    const fields: VcField[] = [];
    const tables: VcTable[] = [];
    const groups: VcGroup[] = [];

    for (const [key, val] of Object.entries(obj)) {
        if (SYSTEM_KEYS.has(key)) continue;
        if (val == null || val === '') continue;

        const label = resolveTitle(key, schemaUuid);
        const description = resolveDescription(key, schemaUuid);

        if (isArrayOfObjects(val)) {
            tables.push(buildTable(label, val));
        } else if (typeof val === 'object' && !Array.isArray(val) && isDateRange(val)) {
            const from = formatDate(val['from'] as string);
            const to = formatDate(val['to'] as string);
            fields.push({ label, value: `${from} → ${to}`, description });
        } else if (typeof val === 'object' && !Array.isArray(val) && isCoordinates(val)) {
            const coords = val['coordinates'] as number[];
            fields.push({ label, value: `${coords[0]}, ${coords[1]}`, description });
        } else if (typeof val === 'object' && !Array.isArray(val)) {
            const nestedType = val['type'] as string | undefined;
            let nestedId: string;
            if (nestedType) {
                nestedId = bareUuid(nestedType);
            } else {
                // No type field — try matching the parent field's title to a known schema name
                nestedId = schemaNameToUuid.value[label.toLowerCase()] ?? schemaUuid;
            }
            const groupTitle = schemaNames.value[nestedId] ?? label;
            const nested = structureVcData(val, nestedId);
            const allFields = [...nested.fields];
            for (const g of nested.groups) allFields.push(...g.fields);
            if (allFields.length > 0 || nested.tables.length > 0) {
                groups.push({ title: groupTitle, fields: allFields, tables: nested.tables });
            }
        } else if (Array.isArray(val)) {
            const displayable = val.filter(v => v != null && v !== '');
            if (displayable.length > 0) {
                fields.push({ label, value: displayable.join(', '), description });
            }
        } else {
            fields.push({ label, value: String(val), description });
        }
    }
    return { fields, tables, groups };
}

function toggleSchema(schemaUuid: string) {
    if (vcDataBySchema.value[schemaUuid]) {
        vcSchemaOpen.value = { ...vcSchemaOpen.value, [schemaUuid]: !vcSchemaOpen.value[schemaUuid] };
    } else {
        vcSchemaOpen.value = { ...vcSchemaOpen.value, [schemaUuid]: true };
        loadSchemaVcData(schemaUuid);
    }
}

async function loadSchemaVcData(schemaUuid: string) {
    if (vcDataBySchema.value[schemaUuid] || vcDataPending.value[schemaUuid]) return;
    if (!project.value || !import.meta.client) return;
    const schema = project.value.linkedSchemas?.find(s => s.schemaUuid === schemaUuid);
    if (!schema?.linkedVcs.length) return;

    if (!decodedMethodology.loaded.value && methodologyMappingId.value) {
        await decodedMethodology.fetch();
    }

    vcDataPending.value[schemaUuid] = true;
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;
    const results: VcDocData[] = [];

    for (const vc of schema.linkedVcs) {
        try {
            const data = await $fetch<Record<string, any>>(
                `/api/v1/${network.value}/projects/${projectId.value}/linked-vcs/${vc.consensusTimestamp}`,
                { baseURL },
            );
            const cs = data?.credentialSubject?.[0] ?? data?.credentialSubject ?? data ?? {};
            results.push(structureVcData(cs, schemaUuid));
        } catch {}
    }
    vcDataBySchema.value = { ...vcDataBySchema.value, [schemaUuid]: results };
    vcDataPending.value[schemaUuid] = false;
}

// ─── VC JSON Viewer modal ──────────────────────────────────────────────────────

const vcViewerOpen = ref(false);
const vcViewerTitle = ref('');
const vcViewerData = ref<Record<string, any> | null>(null);

// "View Raw Data" — show the project's anchor VC document.
async function viewProjectVc() {
    if (!project.value) return;
    const schemas = project.value.linkedSchemas ?? [];
    const projectSchema = schemas.find(s => s.isProjectSchema && s.linkedVcs.length > 0);
    const fallback = schemas.find(s => s.schemaUuid !== 'MintToken' && s.linkedVcs.length > 0);
    const pick = projectSchema ?? fallback;
    const anchor = pick?.linkedVcs[0];

    if (anchor) {
        await handleViewVcJson(anchor.consensusTimestamp);
        vcViewerTitle.value = `${project.value.name} — ${pick!.schemaName ?? pick!.schemaUuid}`;
        return;
    }

    vcViewerTitle.value = project.value.name;
    vcViewerData.value = project.value as unknown as Record<string, any>;
    vcViewerOpen.value = true;
}

function handleViewVc(c: Credit) {
    vcViewerTitle.value = c.name;
    const issuance = project.value?.issuances?.find(i => i.tokenId === c.tokenId);
    vcViewerData.value = issuance?.rawVc ?? c.rawVc ?? null;
    vcViewerOpen.value = true;
}

async function handleViewVcJson(consensusTimestamp: string) {
    if (!project.value) return;
    if (!import.meta.client) return;
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;
    try {
        const data = await $fetch<Record<string, any>>(
            `/api/v1/${network.value}/projects/${projectId.value}/linked-vcs/${consensusTimestamp}`,
            { baseURL },
        );
        vcViewerTitle.value = consensusTimestamp;
        vcViewerData.value = data;
        vcViewerOpen.value = true;
    } catch {
        const { toast } = await import('vue-sonner');
        toast.error('Failed to load VC document');
    }
}

// ─── Re-extract action ────────────────────────────────────────────────────────

const { t } = useI18n();
const reextractPending = ref(false);

async function triggerReextract() {
    if (!import.meta.client) return;
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;
    reextractPending.value = true;
    try {
        const res = await $fetch<{ enqueued: number }>(
            `/api/v1/${network.value}/projects/${projectId.value}/re-extract`,
            { method: 'POST', baseURL },
        );
        const { toast } = await import('vue-sonner');
        if (res.enqueued === 0) {
            toast.info(t('projects.detail.actions.reextractEmpty'));
        } else {
            toast.success(t('projects.detail.actions.reextractSuccess', { count: res.enqueued }));
        }
    } catch {
        const { toast } = await import('vue-sonner');
        toast.error(t('projects.detail.actions.reextractError'));
    } finally {
        reextractPending.value = false;
    }
}

// ─── Refresh IPFS + reparse action ────────────────────────────────────────────

const refreshIpfsPending = ref(false);

async function triggerRefreshIpfs() {
    if (!import.meta.client) return;
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;
    refreshIpfsPending.value = true;
    try {
        const res = await $fetch<{ refreshed: number; reparseEnqueued: number }>(
            `/api/v1/${network.value}/projects/${projectId.value}/refresh-ipfs`,
            { method: 'POST', baseURL },
        );
        const { toast } = await import('vue-sonner');
        const total = res.refreshed + res.reparseEnqueued;
        if (total === 0) {
            toast.info(t('projects.detail.actions.refreshIpfsEmpty'));
        } else {
            toast.success(t('projects.detail.actions.refreshIpfsSuccess', {
                refreshed: res.refreshed,
                reparse: res.reparseEnqueued,
            }));
        }
    } catch {
        const { toast } = await import('vue-sonner');
        toast.error(t('projects.detail.actions.refreshIpfsError'));
    } finally {
        refreshIpfsPending.value = false;
    }
}

// ─── Hashscan URL ──────────────────────────────────────────────────────────────

const hashscanTopicUrl = computed(() => {
    if (!project.value?.topicId) return '';
    return `https://hashscan.io/${network.value}/topic/${project.value.topicId}`;
});

// ─── Methodology name ──────────────────────────────────────────────────────────

const fullMethodologyName = computed(() => {
    if (!project.value) return '';
    return getMethodologyName(project.value.methodologyId) || project.value.methodology;
});

// ─── Methodology field mapping (Advanced tab, lazy-loaded) ────────────────────

const methodologyMappingOpen = ref(false);
const methodologyMappingId = computed(() => project.value?.instanceTopicId ?? '');
const decodedMethodology = useDecodedMethodologyApi({
    id: methodologyMappingId,
    network: computed(() => network.value as string),
});
const methodologyMappingRows = computed(() => {
    const ps = decodedMethodology.data.value?.projectSchema;
    if (!ps) return [];
    const rf = ps.resolvedFields;
    return [
        { label: 'Project Title',         field: rf.name },
        { label: 'Country',               field: rf.country },
        { label: 'Developer',             field: rf.developer },
        { label: 'Category',              field: rf.category },
        { label: 'Scale',                 field: rf.scale },
        { label: 'Sector',                field: rf.sector },
        { label: 'Vintage / Start Date',  field: rf.vintageRaw },
        { label: 'Crediting Period',      field: rf.creditingPeriod },
        { label: 'SDGs / Co-benefits',    field: rf.sdgOrCobenefits },
        {
            label: 'Project Location',
            field: ps.geoKey
                ? { fieldKey: ps.geoKey, title: ps.geoFieldTitle ?? ps.geoKey, description: '' }
                : null,
        },
    ];
});

watch(methodologyMappingOpen, (open) => {
    if (open && methodologyMappingId.value && !decodedMethodology.loaded.value) {
        decodedMethodology.fetch();
    }
});

// ─── Effective map location (falls back to Nominatim country center when no coordinates) ──

const countryCenterCoords = ref<{ lat: number; lng: number } | null>(null);

watch(project, async (p) => {
    if (!p) return;
    const hasCoords = p.lat !== 0 || p.lng !== 0;
    if (hasCoords) { countryCenterCoords.value = null; return; }
    if (!p.country) return;
    countryCenterCoords.value = await nominatimCountryCenter(p.country);
}, { immediate: true });

// effectiveLocation is null while Nominatim is still fetching for zero-coord
// projects.  The map component handles this "not yet ready" state internally
// rather than relying on v-if to mount/unmount it — avoiding a Leaflet
// initialisation race when the component mounts mid-hydration.
const effectiveLocation = computed(() => {
    if (!project.value) return null;
    const hasCoords = project.value.lat !== 0 || project.value.lng !== 0;
    if (hasCoords) return { lat: project.value.lat, lng: project.value.lng, approximate: false };
    if (countryCenterCoords.value) return { ...countryCenterCoords.value, approximate: true };
    return null;
});

// ─── Emission data (currently all dashes) ─────────────────────────────────────

const emissions = computed(() => {
    if (!project.value) return null;
    // Show only if at least one field is not a dash
    const data = { baseline: '-', project: '-', leakage: '-', baselineEmissionFactor: '-' };
    const hasData = Object.values(data).some(v => v !== '-');
    return hasData ? data : null;
});
</script>

<template>
    <!-- Loading state -->
    <div v-if="pending" class="flex items-center justify-center p-12">
        <div class="text-sm text-muted-foreground">Loading project...</div>
    </div>

    <!-- Error state -->
    <div v-else-if="!project" class="p-6">
        <h1 class="text-xl font-bold text-foreground">{{ $t('projects.notFound') }}</h1>
    </div>

    <!-- Project detail -->
    <div v-else class="space-y-6 p-6">
        <!-- Header (always visible, above tabs) -->
        <ProjectHeader
            :project="project"
            :network="network"
            :display-country="displayCountry"
            :display-country-code="displayCountryCode"
            :hashscan-topic-url="hashscanTopicUrl"
            @view-raw-data="viewProjectVc"
        />

        <!-- Tab navigation -->
        <div class="rounded-xl border bg-card overflow-hidden">
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
                        @click="setTab(tab.key)"
                    >
                        <component :is="tab.icon" class="h-4 w-4" />
                        {{ tab.label }}
                    </button>
                </nav>
            </div>

            <!-- ── Tab: Summary ───────────────────────────────────────────────── -->
            <div v-if="activeTab === 'summary'" class="p-6 space-y-6">
                <!-- Key Facts -->
                <ProjectKeyFacts
                    :project="project"
                    :display-country="displayCountry"
                    :display-country-code="displayCountryCode"
                />

                <!-- SDG Icons -->
                <div v-if="project.sdgs?.length" class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Globe class="h-4 w-4 text-primary" />
                            Sustainable Development Goals
                        </h2>
                    </div>
                    <div class="px-5 py-5">
                        <div class="flex flex-wrap gap-3">
                            <div
                                v-for="sdgId in project.sdgs"
                                :key="sdgId"
                                class="group relative flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors"
                            >
                                <img
                                    :src="`/sdgs/E-WEB-Goal-${String(sdgId).padStart(2, '0')}.png`"
                                    :alt="`SDG ${sdgId}`"
                                    class="h-10 w-10 rounded"
                                />
                                <div>
                                    <div class="text-xs font-semibold text-foreground">SDG {{ sdgId }}</div>
                                    <div class="text-[11px] text-muted-foreground">{{ getSDG(sdgId)?.name }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Project Location Map -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <MapPin class="h-4 w-4 text-primary" />
                            Project Location
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">
                            <template v-if="effectiveLocation && !effectiveLocation.approximate">{{ effectiveLocation.lat.toFixed(4) }}, {{ effectiveLocation.lng.toFixed(4) }}</template>
                            <template v-else-if="effectiveLocation?.approximate">Country-level location</template>
                            <span v-if="displayCountry"> · {{ displayCountry }}</span>
                        </p>
                    </div>
                    <div class="h-[320px]">
                        <ClientOnly>
                            <!--
                                Mount on project (not effectiveLocation) so the component exists
                                when ClientOnly activates.  It watches hasLocation internally and
                                initialises Leaflet only once coordinates arrive — no mount/unmount
                                cycle, no Leaflet size-detection race on reload.
                            -->
                            <ProjectLocationMap
                                :lat="effectiveLocation?.lat ?? 0"
                                :lng="effectiveLocation?.lng ?? 0"
                                :name="project.name"
                                :approximate="effectiveLocation?.approximate ?? false"
                                :has-location="!!effectiveLocation"
                            />
                        </ClientOnly>
                    </div>
                </div>
            </div>

            <!-- ── Tab: Issuances & Credits ────────────────────────────────────── -->
            <div v-else-if="activeTab === 'issuances'" class="p-6 space-y-6">
                <CreditLifecycle :project="project" />
                <IssuancesTable
                    :project="project"
                    @view-vc="handleViewVc"
                />
            </div>

            <!-- ── Tab: Documents (VC business data grouped by schema) ────────── -->
            <div v-else-if="activeTab === 'documents'" class="p-6 space-y-4">
                <!-- Search filter -->
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        v-model="docSearchQuery"
                        type="text"
                        placeholder="Search fields, values, tables..."
                        class="w-full h-9 rounded-lg border border-input bg-card pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                        v-if="docSearchQuery"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        @click="docSearchQuery = ''"
                    >
                        <X class="h-3.5 w-3.5" />
                    </button>
                </div>

                <template v-if="project.linkedSchemas?.length">
                    <div
                        v-for="schema in project.linkedSchemas.filter(s => s.schemaUuid !== 'MintToken')"
                        :key="schema.schemaUuid"
                        class="rounded-xl border overflow-hidden"
                        :class="schema.vcCount === 0 ? 'bg-muted/30 opacity-60' : 'bg-card'"
                    >
                        <!-- Schema header -->
                        <button
                            class="w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors"
                            :class="schema.vcCount === 0 ? 'cursor-default' : 'hover:bg-muted/30'"
                            :disabled="schema.vcCount === 0"
                            @click="schema.vcCount > 0 && toggleSchema(schema.schemaUuid)"
                        >
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div
                                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                                    :class="schema.vcCount > 0 ? 'bg-primary/10' : 'bg-muted'"
                                >
                                    <FileText class="h-3.5 w-3.5" :class="schema.vcCount > 0 ? 'text-primary' : 'text-muted-foreground'" />
                                </div>
                                <div class="min-w-0">
                                    <h3 class="text-sm font-semibold truncate" :class="schema.vcCount > 0 ? 'text-foreground' : 'text-muted-foreground'">
                                        {{ schema.schemaName || schema.schemaUuid }}
                                    </h3>
                                    <div class="flex items-center gap-2 mt-0.5">
                                        <span
                                            v-if="schema.isProjectSchema"
                                            class="text-[10px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5"
                                        >Project Schema</span>
                                        <span
                                            class="text-[10px] font-medium rounded-full px-2 py-0.5"
                                            :class="schema.vcCount > 0
                                                ? 'bg-stat-green/10 text-stat-green'
                                                : 'bg-muted text-muted-foreground'"
                                        >
                                            {{ schema.vcCount }} record{{ schema.vcCount !== 1 ? 's' : '' }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ChevronDown
                                v-if="schema.vcCount > 0"
                                class="h-4 w-4 text-muted-foreground transition-transform shrink-0"
                                :class="vcSchemaOpen[schema.schemaUuid] ? 'rotate-180' : ''"
                            />
                        </button>

                        <!-- Schema VC data (grouped, leveled view) -->
                        <template v-if="!vcSchemaOpen[schema.schemaUuid]" />
                        <template v-else-if="vcDataPending[schema.schemaUuid]">
                            <div class="border-t px-5 py-6 text-center">
                                <div class="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 class="h-3.5 w-3.5 animate-spin" />
                                    Loading document data...
                                </div>
                            </div>
                        </template>
                        <template v-else-if="vcDataBySchema[schema.schemaUuid]">
                            <!-- No search results for this schema -->
                            <div
                                v-if="getFilteredDocs(schema.schemaUuid).length === 0 && docSearchQuery.trim()"
                                class="border-t px-5 py-6 text-center text-xs text-muted-foreground"
                            >
                                No matching fields found in this schema.
                            </div>
                            <div
                                v-for="(doc, vcIdx) in getFilteredDocs(schema.schemaUuid)"
                                :key="vcIdx"
                            >
                                <!-- Record header (collapsible when multiple) -->
                                <button
                                    v-if="getFilteredDocs(schema.schemaUuid).length > 1"
                                    class="w-full border-t px-5 py-3 bg-primary/8 flex items-center gap-2 hover:bg-primary/12 transition-colors text-left"
                                    @click="vcRecordOpen[`${schema.schemaUuid}-${vcIdx}`] = !(vcRecordOpen[`${schema.schemaUuid}-${vcIdx}`] ?? true)"
                                >
                                    <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold shrink-0">
                                        {{ vcIdx + 1 }}
                                    </div>
                                    <span class="text-sm font-semibold text-foreground flex-1">Record {{ vcIdx + 1 }}</span>
                                    <span class="text-[10px] text-muted-foreground mr-2">{{ doc.fields.length + doc.groups.reduce((s, g) => s + g.fields.length, 0) }} fields</span>
                                    <ChevronDown
                                        class="h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0"
                                        :class="(vcRecordOpen[`${schema.schemaUuid}-${vcIdx}`] ?? true) ? 'rotate-180' : ''"
                                    />
                                </button>
                                <div v-else class="border-t" />

                                <!-- Record content (collapsible) -->
                                <template v-if="getFilteredDocs(schema.schemaUuid).length <= 1 || (vcRecordOpen[`${schema.schemaUuid}-${vcIdx}`] ?? true)">
                                    <!-- Top-level fields -->
                                    <div v-if="doc.fields.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                                        <div
                                            v-for="f in doc.fields"
                                            :key="f.label"
                                            class="bg-card px-5 py-3"
                                        >
                                            <div class="flex items-center gap-1 mb-0.5">
                                                <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ f.label }}</span>
                                                <InfoTooltip v-if="f.description" :text="f.description" />
                                            </div>
                                            <div class="text-sm text-foreground break-words">{{ f.value }}</div>
                                        </div>
                                        <div v-if="doc.fields.length % 2 === 1" class="hidden sm:block bg-card" />
                                    </div>

                                    <!-- Top-level tables (arrays of objects) -->
                                    <div v-for="tbl in doc.tables" :key="tbl.label" class="border-t">
                                        <div class="px-5 py-2.5 bg-muted/40 flex items-center gap-2 border-b">
                                            <Database class="h-3.5 w-3.5 text-primary/60" />
                                            <span class="text-xs font-semibold text-foreground">{{ tbl.label }}</span>
                                            <span class="text-[10px] text-muted-foreground">{{ tbl.rows.length }} entries</span>
                                        </div>
                                        <div class="overflow-x-auto">
                                            <table class="w-full text-sm">
                                                <thead>
                                                    <tr class="bg-muted/20 border-b">
                                                        <th
                                                            v-for="col in tbl.columns"
                                                            :key="col"
                                                            class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                                                        >{{ humanizeKey(col) }}</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="divide-y">
                                                    <tr v-for="(row, rIdx) in tbl.rows" :key="rIdx" class="hover:bg-muted/20">
                                                        <td
                                                            v-for="col in tbl.columns"
                                                            :key="col"
                                                            class="py-2 px-4 text-foreground tabular-nums max-w-[300px]"
                                                            :title="row[col]"
                                                        >
                                                            <span class="block truncate">{{ row[col] }}</span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <!-- Nested groups (sub-schemas) -->
                                    <div
                                        v-for="group in doc.groups"
                                        :key="group.title"
                                        class="border-t"
                                    >
                                        <div class="px-5 py-2.5 bg-muted/40 flex items-center gap-2 border-b">
                                            <Layers class="h-3.5 w-3.5 text-primary/60" />
                                            <span class="text-xs font-semibold text-foreground">{{ group.title }}</span>
                                            <span class="text-[10px] text-muted-foreground">{{ group.fields.length }} fields</span>
                                        </div>
                                        <div v-if="group.fields.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
                                            <div
                                                v-for="f in group.fields"
                                                :key="f.label"
                                                class="bg-card px-5 py-3"
                                            >
                                                <div class="flex items-center gap-1 mb-0.5">
                                                    <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ f.label }}</span>
                                                    <InfoTooltip v-if="f.description" :text="f.description" />
                                                </div>
                                                <div class="text-sm text-foreground break-words tabular-nums">{{ f.value }}</div>
                                            </div>
                                            <template v-for="_ in (3 - (group.fields.length % 3)) % 3" :key="'pad-' + _">
                                                <div class="hidden lg:block bg-card" />
                                            </template>
                                            <div v-if="group.fields.length % 2 === 1" class="hidden sm:block lg:hidden bg-card" />
                                        </div>
                                        <!-- Tables inside groups -->
                                        <div v-for="tbl in group.tables" :key="tbl.label" class="border-t">
                                            <div class="px-5 py-2 bg-muted/20 flex items-center gap-2 border-b">
                                                <Database class="h-3 w-3 text-muted-foreground" />
                                                <span class="text-[11px] font-medium text-foreground">{{ tbl.label }}</span>
                                                <span class="text-[10px] text-muted-foreground">{{ tbl.rows.length }} entries</span>
                                            </div>
                                            <div class="overflow-x-auto">
                                                <table class="w-full text-sm">
                                                    <thead>
                                                        <tr class="bg-muted/10 border-b">
                                                            <th
                                                                v-for="col in tbl.columns"
                                                                :key="col"
                                                                class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                                                            >{{ humanizeKey(col) }}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody class="divide-y">
                                                        <tr v-for="(row, rIdx) in tbl.rows" :key="rIdx" class="hover:bg-muted/20">
                                                            <td
                                                                v-for="col in tbl.columns"
                                                                :key="col"
                                                                class="py-2 px-4 text-foreground tabular-nums whitespace-nowrap"
                                                            >{{ row[col] }}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    <div v-if="doc.fields.length === 0 && doc.groups.length === 0 && doc.tables.length === 0" class="px-5 py-6 text-center text-xs text-muted-foreground">
                                        No fields available.
                                    </div>
                                </template>
                            </div>
                        </template>
                    </div>
                </template>
                <div v-else class="rounded-xl border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                    No linked documents found for this project.
                </div>
            </div>

            <!-- ── Tab: Advanced ───────────────────────────────────────────────── -->
            <div v-else-if="activeTab === 'advanced'" class="p-6 space-y-6">
                <!-- Admin actions -->
                <div class="flex items-center gap-2 flex-wrap">
                    <button
                        :disabled="reextractPending"
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        @click="triggerReextract"
                    >
                        <RotateCcw :class="['h-4 w-4 text-primary', reextractPending ? 'animate-spin' : '']" />
                        Re-extract
                    </button>
                    <button
                        :disabled="refreshIpfsPending"
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        @click="triggerRefreshIpfs"
                    >
                        <CloudDownload :class="['h-4 w-4 text-primary', refreshIpfsPending ? 'animate-spin' : '']" />
                        Refresh IPFS
                    </button>
                    <div class="w-px h-6 bg-border" />
                    <button
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        @click="exportProject(project!, 'iwa', network)"
                    >
                        <Download class="h-4 w-4 text-primary" />
                        Export as IWA
                    </button>
                    <button
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        @click="exportProject(project!, 'cadtrust', network)"
                    >
                        <Download class="h-4 w-4 text-primary" />
                        Export as CADTrust
                    </button>
                    <button
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        @click="exportProject(project!, 'cdop', network)"
                    >
                        <Download class="h-4 w-4 text-primary" />
                        Export as CDOP
                    </button>
                </div>

                <!-- Hedera On-Chain References -->
                <HederaReferences :project="project" :network="network" />

                <!-- Pipeline (moved from the former Pipeline tab) -->
                <ClientOnly>
                    <ProjectPolicyCanvas :project="project" />
                </ClientOnly>
                <ProjectPipeline :project="project" />

                <!-- Linked VCs (raw) -->
                <LinkedVcsPanel
                    :project="project"
                    :network="network"
                    @view-vc-json="handleViewVcJson"
                />

                <!-- Trust Chain (moved from Pipeline tab) -->
                <ProjectTrustChain :project="project" />

                <!-- Methodology Field Mapping (lazy) -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div
                        class="w-full px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                        @click="methodologyMappingOpen = !methodologyMappingOpen"
                    >
                        <div class="min-w-0">
                            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Layers class="h-4 w-4 text-primary" />
                                Methodology Field Mapping
                            </h2>
                            <p class="text-[11px] text-muted-foreground mt-0.5">
                                <NuxtLink
                                    v-if="project.instanceTopicId"
                                    :to="`/methodologies/${project.instanceTopicId}`"
                                    class="text-primary hover:underline transition-colors inline-flex items-center gap-1"
                                    @click.stop
                                >
                                    {{ fullMethodologyName }}
                                </NuxtLink>
                                <span v-else>{{ fullMethodologyName }}</span>
                                — how project fields map to schema fields
                            </p>
                        </div>
                        <ChevronDown
                            class="h-4 w-4 text-muted-foreground transition-transform shrink-0"
                            :class="methodologyMappingOpen ? 'rotate-180' : ''"
                        />
                    </div>
                    <div v-if="methodologyMappingOpen">
                        <div v-if="decodedMethodology.pending.value" class="px-5 py-6 text-center text-xs text-muted-foreground">
                            Loading mapping…
                        </div>
                        <div v-else-if="!project.instanceTopicId" class="px-5 py-6 text-xs text-muted-foreground">
                            Methodology version is not linked to this project yet. Click <strong class="text-foreground">Re-extract</strong> above (or re-parse the methodology) to populate it.
                        </div>
                        <div v-else-if="decodedMethodology.error.value" class="px-5 py-6 text-xs text-destructive">
                            Failed to load methodology mapping.
                        </div>
                        <div v-else-if="!decodedMethodology.data.value?.projectSchema" class="px-5 py-6 text-xs text-muted-foreground">
                            No project schema has been confirmed for this methodology yet.
                        </div>
                        <table v-else class="w-full text-sm">
                            <thead>
                                <tr class="bg-muted/20 border-b">
                                    <th class="text-left py-2.5 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-1/3">Project Field</th>
                                    <th class="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Schema Field</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y">
                                <tr v-for="row in methodologyMappingRows" :key="row.label" class="hover:bg-muted/30 align-top">
                                    <td class="py-3 px-5 font-medium text-foreground">{{ row.label }}</td>
                                    <td class="py-3 px-4">
                                        <template v-if="row.field">
                                            <div class="text-foreground font-medium">
                                                {{ row.field.title || row.field.fieldKey }}
                                                <span class="text-muted-foreground font-normal">({{ row.field.fieldKey }})</span>
                                            </div>
                                            <div v-if="row.field.description" class="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                {{ row.field.description }}
                                            </div>
                                        </template>
                                        <span v-else class="text-muted-foreground">—</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Relationships Diagram -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Network class="h-4 w-4 text-primary" />
                            Relationships
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">Entity relationships between Registry, Policy, Schema, Role, Raw Data, VP, and Token</p>
                    </div>
                    <div class="px-5 py-5">
                        <ClientOnly>
                            <RelationshipDiagram
                                :project="project"
                                :network="network"
                                @view-vc="({ title, vc }) => { vcViewerTitle = title; vcViewerData = vc; vcViewerOpen = true; }"
                            />
                        </ClientOnly>
                    </div>
                </div>

                <!-- Emission Parameters (only shown when real data is available) -->
                <div v-if="emissions" class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <BarChart3 class="h-4 w-4 text-primary" />
                            Emission Parameters
                        </h2>
                    </div>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
                        <div class="bg-card px-5 py-5">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Baseline Emissions</div>
                            <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.baseline }}</div>
                        </div>
                        <div class="bg-card px-5 py-5">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Project Emissions</div>
                            <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.project }}</div>
                        </div>
                        <div class="bg-card px-5 py-5">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Leakage Emissions</div>
                            <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.leakage }}</div>
                        </div>
                        <div class="bg-card px-5 py-5">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Baseline Emission Factor</div>
                            <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.baselineEmissionFactor }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Raw Data Viewer Modal -->
        <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
    </div>
</template>
