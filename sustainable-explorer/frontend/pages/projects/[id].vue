<script setup lang="ts">
import {
    BookOpen, Coins, Layers, Shield,
    Globe, MapPin, Clock, Activity,
    Network, FileText, ChevronDown,
    CheckCircle2, Circle, Zap, Database,
    FolderKanban, BarChart3, RotateCcw, CloudDownload,
} from 'lucide-vue-next';
import type { Credit } from '~/types/models';
import { getSDG } from '~/lib/sdgs';
import { getMethodologyName } from '~/lib/methodologies';
import { useDecodedMethodologyApi } from '~/composables/api/useDecodedMethodologyApi';
import { COUNTRY_ALPHA3 } from '~/composables/useProjects';

const route = useRoute();
const { network } = useNetwork();
const projectId = computed(() => route.params.id as string);
const { project, pending } = useProjectDetail(projectId);
const { activity: activityEvents } = useProjectActivity(projectId);

// When the API returns no country (UNK) but we have valid coordinates, fall back
// to a Nominatim reverse-geocode lookup so the correct flag is shown.
const geocodedCountry = ref<{ code: string; name: string } | null>(null);
watch(project, async (p) => {
    geocodedCountry.value = null;
    if (!p || p.countryCode !== 'UNK' || !p.lat || !p.lng) return;
    try {
        const res = await $fetch<any>('https://nominatim.openstreetmap.org/reverse', {
            params: { lat: p.lat, lon: p.lng, format: 'json', zoom: 3 },
            headers: { 'Accept-Language': 'en' },
        });
        const name: string = res?.address?.country ?? '';
        const code = COUNTRY_ALPHA3[name] ?? 'UNK';
        if (code !== 'UNK') geocodedCountry.value = { code, name };
    } catch { /* ignore — fallback stays UNK */ }
}, { immediate: true });

const INVALID_COUNTRY = new Set([
    'not applicable', 'not specified', 'n/a', 'na', 'none', 'not stated',
    'not available', 'not provided', 'unknown',
    'point', 'multipoint', 'linestring', 'multilinestring',
    'polygon', 'multipolygon', 'geometrycollection',
]);
const displayCountryCode = computed(() => geocodedCountry.value?.code ?? project.value?.countryCode ?? 'UNK');
const displayCountry = computed(() => {
    const raw = geocodedCountry.value?.name ?? project.value?.country ?? '';
    return INVALID_COUNTRY.has(raw.toLowerCase().trim()) ? '' : raw;
});

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const activeTab = ref<'summary' | 'issuances' | 'documents' | 'advanced'>('summary');

const tabs = [
    { key: 'summary' as const,   label: 'Summary',            icon: FolderKanban },
    { key: 'issuances' as const, label: 'Issuances & Credits', icon: Coins },
    { key: 'documents' as const, label: 'Documents',           icon: FileText },
    { key: 'advanced' as const,  label: 'Advanced',            icon: Shield },
];

// ─── VC business data (lazy-loaded per schema) ───────────────────────────────

const SYSTEM_KEYS = new Set(['@context', 'type', 'id', 'policyId', 'ref']);

const vcDataBySchema = ref<Record<string, Record<string, any>[]>>({});
const vcDataPending = ref<Record<string, boolean>>({});

async function loadSchemaVcData(schemaUuid: string) {
    if (vcDataBySchema.value[schemaUuid] || vcDataPending.value[schemaUuid]) return;
    if (!project.value || !import.meta.client) return;
    const schema = project.value.linkedSchemas?.find(s => s.schemaUuid === schemaUuid);
    if (!schema?.linkedVcs.length) return;

    vcDataPending.value[schemaUuid] = true;
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;
    const results: Record<string, any>[] = [];

    for (const vc of schema.linkedVcs) {
        try {
            const data = await $fetch<Record<string, any>>(
                `/api/v1/${network.value}/projects/${projectId.value}/linked-vcs/${vc.consensusTimestamp}`,
                { baseURL },
            );
            const cs = data?.credentialSubject?.[0] ?? data?.credentialSubject ?? data ?? {};
            results.push(cs);
        } catch {
            // skip failed fetches
        }
    }
    vcDataBySchema.value = { ...vcDataBySchema.value, [schemaUuid]: results };
    vcDataPending.value[schemaUuid] = false;
}

function formatFieldLabel(key: string): string {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function isDisplayableValue(val: unknown): boolean {
    if (val == null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val as object).length === 0) return false;
    return true;
}

function formatFieldValue(val: unknown): string {
    if (val == null || val === '') return '—';
    if (Array.isArray(val)) return val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
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
    vcViewerData.value = issuance?.rawVc ?? null;
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

// ─── Activity log ──────────────────────────────────────────────────────────────

const activityLog = computed(() => activityEvents.value ?? []);

const activityTypeIcon: Record<string, { icon: any; color: string }> = {
    document: { icon: FileText, color: 'text-muted-foreground bg-muted' },
    verification: { icon: Shield, color: 'text-amber-600 bg-amber-50' },
    registry: { icon: Database, color: 'text-primary bg-primary/10' },
    monitoring: { icon: Activity, color: 'text-sky-600 bg-sky-50' },
    credit: { icon: Coins, color: 'text-emerald-600 bg-emerald-50' },
};

// ─── Methodology workflow steps ────────────────────────────────────────────────

const methodologySteps = computed(() => {
    if (!project.value) return [];
    return [
        { label: 'Project Design', desc: 'PDD submission & stakeholder consultation', status: 'complete' },
        { label: 'Validation', desc: 'Third-party validation audit', status: 'complete' },
        { label: 'Registration', desc: 'Project registration on registry', status: 'complete' },
        { label: 'Monitoring', desc: 'Data collection & MRV reporting', status: ['Verified', 'Issuing', 'Completed'].includes(project.value.status) ? 'complete' : (project.value.status === 'Under Validation' ? 'active' : 'pending') },
        { label: 'Verification', desc: 'Emission reduction verification', status: ['Issuing', 'Completed'].includes(project.value.status) ? 'complete' : (project.value.status === 'Verified' ? 'active' : 'pending') },
        { label: 'Issuance', desc: 'Token minting to Hedera', status: project.value.status === 'Completed' ? 'complete' : (project.value.status === 'Issuing' ? 'active' : 'pending') },
    ];
});

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
                        @click="activeTab = tab.key"
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
                            {{ project.lat.toFixed(4) }}, {{ project.lng.toFixed(4) }}<span v-if="displayCountry"> · {{ displayCountry }}</span>
                        </p>
                    </div>
                    <div class="h-[320px]">
                        <ClientOnly>
                            <ProjectLocationMap :lat="project.lat" :lng="project.lng" :name="project.name" />
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
            <div v-else-if="activeTab === 'documents'" class="p-6 space-y-6">
                <template v-if="project.linkedSchemas?.length">
                    <div
                        v-for="schema in project.linkedSchemas.filter(s => s.schemaUuid !== 'MintToken')"
                        :key="schema.schemaUuid"
                        class="rounded-xl border bg-card overflow-hidden"
                    >
                        <!-- Schema header -->
                        <button
                            class="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                            @click="() => { const open = vcDataBySchema[schema.schemaUuid]; if (!open) loadSchemaVcData(schema.schemaUuid); }"
                        >
                            <div class="flex items-center gap-2 min-w-0">
                                <FileText class="h-4 w-4 text-primary shrink-0" />
                                <h3 class="text-sm font-semibold text-foreground truncate">
                                    {{ schema.schemaName || schema.schemaUuid }}
                                </h3>
                                <span
                                    v-if="schema.isProjectSchema"
                                    class="text-[10px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5 shrink-0"
                                >Project Schema</span>
                                <span class="text-[10px] text-muted-foreground shrink-0">
                                    {{ schema.vcCount }} VC{{ schema.vcCount !== 1 ? 's' : '' }}
                                </span>
                            </div>
                            <ChevronDown
                                class="h-4 w-4 text-muted-foreground transition-transform shrink-0"
                                :class="vcDataBySchema[schema.schemaUuid] ? 'rotate-180' : ''"
                            />
                        </button>

                        <!-- Schema VC data -->
                        <template v-if="vcDataPending[schema.schemaUuid]">
                            <div class="px-5 py-6 text-center text-xs text-muted-foreground">Loading VC data...</div>
                        </template>
                        <template v-else-if="vcDataBySchema[schema.schemaUuid]">
                            <div
                                v-for="(cs, vcIdx) in vcDataBySchema[schema.schemaUuid]"
                                :key="vcIdx"
                                class="border-t"
                            >
                                <div v-if="vcDataBySchema[schema.schemaUuid]!.length > 1" class="px-5 py-2 bg-muted/20 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Document {{ vcIdx + 1 }}
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                                    <template v-for="(val, key) in cs" :key="key">
                                        <div
                                            v-if="!SYSTEM_KEYS.has(String(key)) && isDisplayableValue(val)"
                                            class="bg-card px-5 py-3"
                                        >
                                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                                                {{ formatFieldLabel(String(key)) }}
                                            </div>
                                            <div class="text-sm text-foreground break-words">
                                                {{ formatFieldValue(val) }}
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </div>
                            <div v-if="vcDataBySchema[schema.schemaUuid]!.length === 0" class="px-5 py-6 text-center text-xs text-muted-foreground">
                                No VC data available for this schema.
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
                <div class="flex items-center gap-2">
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
                </div>

                <!-- Hedera On-Chain References -->
                <HederaReferences :project="project" :network="network" />

                <!-- Linked VCs (raw) -->
                <LinkedVcsPanel
                    :project="project"
                    :network="network"
                    @view-vc-json="handleViewVcJson"
                />

                <!-- Activity Log -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Clock class="h-4 w-4 text-primary" />
                            Activity Log
                        </h2>
                    </div>
                    <div v-if="activityLog.length > 0" class="px-5 py-5">
                        <div class="relative">
                            <div class="absolute left-[15px] top-3 bottom-3 w-px bg-border" />
                            <div
                                v-for="(event, idx) in activityLog"
                                :key="idx"
                                class="relative flex items-start gap-4 pb-5 last:pb-0"
                            >
                                <div :class="[activityTypeIcon[event.type]?.color || 'text-muted-foreground bg-muted', 'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full']">
                                    <component :is="activityTypeIcon[event.type]?.icon || Circle" class="h-3.5 w-3.5" />
                                </div>
                                <div class="pt-1">
                                    <div class="text-sm text-foreground">{{ event.action }}</div>
                                    <div class="text-[11px] text-muted-foreground mt-0.5">{{ event.date }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="px-5 py-8 text-center text-sm text-muted-foreground">
                        No activity log entries available for this project.
                    </div>
                </div>

                <!-- Methodology Workflow -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <BookOpen class="h-4 w-4 text-primary" />
                            Methodology
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">{{ fullMethodologyName }}</p>
                    </div>
                    <div class="px-5 py-5">
                        <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Workflow</div>
                        <div class="flex items-center gap-0 overflow-x-auto pb-2">
                            <template v-for="(step, idx) in methodologySteps" :key="idx">
                                <div class="flex flex-col items-center min-w-[120px]">
                                    <div
                                        :class="[
                                            step.status === 'complete' ? 'bg-emerald-50 border-emerald-200' :
                                            step.status === 'active' ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20' :
                                            'bg-muted/50 border-border',
                                            'flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                                        ]"
                                    >
                                        <CheckCircle2 v-if="step.status === 'complete'" class="h-5 w-5 text-emerald-600" />
                                        <Zap v-else-if="step.status === 'active'" class="h-5 w-5 text-primary" />
                                        <Circle v-else class="h-5 w-5 text-muted-foreground/40" />
                                    </div>
                                    <div class="mt-2 text-center">
                                        <div
                                            :class="[
                                                step.status === 'active' ? 'text-primary font-semibold' :
                                                step.status === 'complete' ? 'text-foreground font-medium' :
                                                'text-muted-foreground',
                                                'text-xs',
                                            ]"
                                        >
                                            {{ step.label }}
                                        </div>
                                        <div class="text-[10px] text-muted-foreground mt-0.5 max-w-[110px] leading-tight">{{ step.desc }}</div>
                                    </div>
                                </div>
                                <div
                                    v-if="idx < methodologySteps.length - 1"
                                    class="flex-1 min-w-[24px] h-px mt-[-24px]"
                                    :class="step.status === 'complete' ? 'bg-emerald-300' : 'bg-border'"
                                />
                            </template>
                        </div>
                    </div>
                </div>

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
