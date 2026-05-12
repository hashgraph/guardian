<script setup lang="ts">
import {
    ArrowLeft, FileJson, MapPin, Calendar, Building2, Shield, Coins,
    ChevronDown, ChevronUp, Copy, Check, Users, BookOpen, Target,
    Globe, Leaf, FolderKanban, Layers, BarChart3, Clock, Activity,
    GitBranch, ArrowRight, CheckCircle2, Circle, Zap, FileText, Network, Repeat, Flame,
    TrendingUp, TrendingDown, AlertTriangle, Database, ExternalLink, RotateCcw,
} from 'lucide-vue-next';
import type { Credit } from '~/types/models';
import { formatCredits, formatNumber } from '~/lib/format';
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

const linkedCredits = computed<Credit[]>(() => {
    if (!project.value?.issuances?.length) return [];
    return project.value.issuances.map(i => ({
        id: i.tokenId,
        tokenId: i.tokenId,
        name: i.name ?? '',
        symbol: i.symbol ?? '',
        type: (i.type === 'FUNGIBLE_COMMON' ? 'Fungible' : 'Non-Fungible') as 'Fungible' | 'Non-Fungible',
        supply: i.supply,
        projectId: project.value!.id,
        registry: project.value!.registry,
        mintDate: i.mintDate ?? '',
    }));
});
const linkedTransfers = computed(() => []);
const linkedRetirements = computed(() => []);

// Lifecycle summary sourced from backend-computed totals.
// totalIssued = all NFT serials ever minted + fungible supply
// totalRetired = NFT serials marked deleted by Mirror Node
// totalActive  = totalIssued - totalRetired
const lifecycleSummary = computed(() => {
    const totalIssued = project.value?.totalIssued ?? 0;
    const totalRetired = project.value?.totalRetired ?? 0;
    const active = project.value?.totalActive ?? 0;
    return { totalIssued, totalTransferred: 0, totalRetired, active };
});

const methodologyMappingOpen = ref(false);

// Fetch the methodology's resolved field mapping using this project's
// instance topic (the same URL the methodology detail page uses). Lazy:
// only triggered when the user expands the section.
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

const vcViewerOpen = ref(false);
const vcViewerTitle = ref('');
const vcViewerData = ref<Record<string, any> | null>(null);

// "View Raw Data" — show the project's anchor VC document. Picks the first VC
// from the project schema; falls back to the first non-MintToken linked VC; if
// no linked VCs at all, falls back to the aggregated project businessData
// (older projects predating linkedVcs tracking).
async function viewProjectVc() {
    if (!project.value) return;
    const schemas = project.value.linkedSchemas ?? [];
    const projectSchema = schemas.find(s => s.isProjectSchema && s.linkedVcs.length > 0);
    const fallback = schemas.find(s => s.schemaUuid !== 'MintToken' && s.linkedVcs.length > 0);
    const pick = projectSchema ?? fallback;
    const anchor = pick?.linkedVcs[0];

    if (anchor) {
        await viewLinkedVcJson(anchor.consensusTimestamp);
        vcViewerTitle.value = `${project.value.name} — ${pick!.schemaName ?? pick!.schemaUuid}`;
        return;
    }

    vcViewerTitle.value = project.value.name;
    vcViewerData.value = project.value as unknown as Record<string, any>;
    vcViewerOpen.value = true;
}

function viewCreditVc(c: Credit) {
    vcViewerTitle.value = c.name;
    const issuance = project.value?.issuances?.find(i => i.tokenId === c.tokenId);
    vcViewerData.value = issuance?.rawVc ?? null;
    vcViewerOpen.value = true;
}

const statusColor: Record<string, { bg: string; text: string; dot: string }> = {
    Registered: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
    'Under Validation': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    Verified: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    Issuing: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    Completed: { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
};

const creditingPeriodStart = computed(() => {
    if (project.value?.createdAt) return project.value.createdAt.slice(0, 10);
    if (!project.value?.vintage) return '-';
    const yr = parseInt(project.value.vintage);
    return isNaN(yr) ? '-' : `${yr - 1}-01-01`;
});

const creditingPeriodEnd = computed(() => {
    if (project.value?.creditingPeriodEnd) return project.value.creditingPeriodEnd.slice(0, 10);
    if (!project.value?.vintage) return '-';
    const yr = parseInt(project.value.vintage);
    return isNaN(yr) ? '-' : `${yr + 9}-12-31`;
});

// Emission data not yet available from API
const emissions = computed(() => {
    if (!project.value) return null;
    return { baseline: '-', project: '-', leakage: '-', baselineEmissionFactor: '-' };
});

const activityLog = computed(() => activityEvents.value ?? []);

const activityTypeIcon: Record<string, { icon: any; color: string }> = {
    document: { icon: FileText, color: 'text-muted-foreground bg-muted' },
    verification: { icon: Shield, color: 'text-amber-600 bg-amber-50' },
    registry: { icon: Database, color: 'text-primary bg-primary/10' },
    monitoring: { icon: Activity, color: 'text-sky-600 bg-sky-50' },
    credit: { icon: Coins, color: 'text-emerald-600 bg-emerald-50' },
};

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

const hashscanTopicUrl = computed(() => {
    if (!project.value?.topicId) return '';
    return `https://hashscan.io/${network.value}/topic/${project.value.topicId}`;
});

const hashscanPolicyUrl = computed(() => {
    if (!project.value?.policyTopicId) return '';
    return `https://hashscan.io/${network.value}/topic/${project.value.policyTopicId}`;
});

const vcTimestamp = computed(() => {
    const ts = project.value?.sourceTimestamp;
    if (!ts) return null;
    return new Date(parseFloat(ts) * 1000).toLocaleString();
});

const fullMethodologyName = computed(() => {
    if (!project.value) return '';
    return getMethodologyName(project.value.methodologyId) || project.value.methodology;
});

// ─── Linked VCs panel ────────────────────────────────────────────────────────

// Per-schema open/closed state. First schema with vcCount > 0 starts expanded.
const schemaOpenState = ref<Record<string, boolean>>({});

watch(project, (p) => {
    if (!p?.linkedSchemas?.length) return;
    const state: Record<string, boolean> = {};
    let firstExpanded = false;
    for (const s of p.linkedSchemas) {
        if (!firstExpanded && s.vcCount > 0) {
            state[s.schemaUuid] = true;
            firstExpanded = true;
        } else {
            state[s.schemaUuid] = false;
        }
    }
    schemaOpenState.value = state;
}, { immediate: true });

function toggleSchema(uuid: string) {
    schemaOpenState.value = { ...schemaOpenState.value, [uuid]: !schemaOpenState.value[uuid] };
}

function schemaDisplayName(uuid: string, name: string | null): string {
    if (name) return name;
    // Truncate UUID to first 8 chars with ellipsis
    return `${uuid.slice(0, 8)}...`;
}

function formatTimestamp(ts: string): string {
    if (!ts) return '—';
    const secs = parseFloat(ts);
    if (isNaN(secs)) return ts;
    return new Date(secs * 1000).toLocaleString();
}

// Copy-to-clipboard for topic IDs (reuse pattern from existing code)
const copiedTopicId = ref<string | null>(null);

async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        copiedTopicId.value = text;
        setTimeout(() => { copiedTopicId.value = null; }, 1500);
    } catch { /* ignore */ }
}

async function viewLinkedVcJson(consensusTimestamp: string) {
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
    } catch (err: any) {
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
</script>

<template>
    <div v-if="pending" class="flex items-center justify-center p-12">
        <div class="text-sm text-muted-foreground">Loading project...</div>
    </div>

    <div v-else-if="!project" class="p-6">
        <h1 class="text-xl font-bold text-foreground">{{ $t('projects.notFound') }}</h1>
    </div>

    <div v-else class="space-y-6 p-6">
        <!-- Header -->
        <div>
            <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                    <h1 class="text-2xl font-bold text-foreground">{{ project.name }}</h1>
                    <p class="text-sm text-muted-foreground mt-1">
                        <template v-if="displayCountry">
                            <CountryFlag :code="displayCountryCode" size="sm" class="mr-0.5" /> {{ displayCountry }} &middot;
                        </template>
                        <NuxtLink
                            v-if="project.registry && project.registryDid"
                            :to="`/registries?did=${encodeURIComponent(project.registryDid)}`"
                            class="hover:text-primary hover:underline transition-colors"
                        >{{ project.registry }}</NuxtLink>
                        <template v-else>{{ project.registry }}</template>
                        &middot; {{ project.developer }}
                    </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <a
                        v-if="hashscanTopicUrl"
                        :href="hashscanTopicUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        <ExternalLink class="h-4 w-4 text-primary" />
                        {{ $t('common.viewOnExplorer') }}
                    </a>
                    <button
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        @click="viewProjectVc"
                    >
                        <FileJson class="h-4 w-4 text-primary" />
                        {{ $t('common.viewRawData') }}
                    </button>
                    <button
                        :disabled="reextractPending"
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        @click="triggerReextract"
                    >
                        <RotateCcw :class="['h-4 w-4 text-primary', reextractPending ? 'animate-spin' : '']" />
                        {{ $t('projects.detail.actions.reextract') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Project Details Card -->
        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30">
                <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FolderKanban class="h-4 w-4 text-primary" />
                    {{ $t('projects.details.projectDetails') }}
                </h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Project Name</div>
                    <div class="text-sm font-medium text-foreground">{{ project.name }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Country</div>
                    <div class="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <template v-if="displayCountry">
                            <CountryFlag :code="displayCountryCode" size="sm" />
                            {{ displayCountry }}
                        </template>
                        <span v-else class="text-muted-foreground">—</span>
                    </div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</div>
                    <div class="flex items-center gap-2">
                        <span :class="[statusColor[project.status]?.dot || 'bg-muted-foreground', 'h-2 w-2 rounded-full']" />
                        <span class="text-sm font-medium text-foreground">{{ project.status }}</span>
                    </div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Methodology</div>
                    <NuxtLink
                        v-if="project.instanceTopicId"
                        :to="`/methodologies/${project.instanceTopicId}`"
                        class="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors"
                    >
                        {{ fullMethodologyName }}
                    </NuxtLink>
                    <div v-else class="text-sm font-medium text-foreground">{{ fullMethodologyName }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Registry</div>
                    <NuxtLink
                        v-if="project.registry && project.registryDid"
                        :to="`/registries?did=${encodeURIComponent(project.registryDid)}`"
                        class="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors"
                    >
                        {{ project.registry }}
                    </NuxtLink>
                    <div v-else class="text-sm font-medium text-foreground">{{ project.registry || '—' }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Developer</div>
                    <div class="text-sm font-medium text-foreground">{{ project.developer }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Sector</div>
                    <div class="text-sm font-medium text-foreground">{{ project.sector }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Sectoral Scope</div>
                    <div class="text-sm font-medium text-foreground">{{ project.sectoralScope }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Category</div>
                    <div class="text-sm font-medium text-foreground">{{ project.category }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Crediting Period Start</div>
                    <div class="text-sm font-medium text-foreground">{{ creditingPeriodStart }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Crediting Period End</div>
                    <div class="text-sm font-medium text-foreground">{{ creditingPeriodEnd }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Projected Emission Reductions</div>
                    <div class="text-sm font-medium text-foreground">{{ formatNumber(project.credits) }}</div>
                </div>
            </div>

        </div>

        <!-- Hedera On-Chain References -->
        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30">
                <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Shield class="h-4 w-4 text-primary" />
                    Hedera On-Chain References
                </h2>
            </div>
            <div class="px-5 py-4 space-y-4">
                <!-- Verified badge -->
                <div class="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                        <div class="text-sm font-medium text-emerald-800">Verified on Hedera</div>
                        <div class="text-xs text-emerald-700">This project is governed by an on-chain Guardian policy anchored to the Hedera network.</div>
                    </div>
                </div>

                <!-- Reference grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border rounded-lg overflow-hidden border">
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Instance Topic ID</div>
                        <div class="group flex items-center gap-2">
                            <code class="text-sm font-mono text-foreground">{{ project.topicId ?? '—' }}</code>
                            <a
                                v-if="hashscanTopicUrl"
                                :href="hashscanTopicUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="opacity-0 group-hover:opacity-100 transition-opacity"
                                title="View on HashScan"
                            >
                                <ExternalLink class="h-3.5 w-3.5 text-primary" />
                            </a>
                        </div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Policy Topic ID</div>
                        <div class="group flex items-center gap-2">
                            <code class="text-sm font-mono text-foreground">{{ project.policyTopicId ?? '—' }}</code>
                            <a
                                v-if="hashscanPolicyUrl"
                                :href="hashscanPolicyUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="opacity-0 group-hover:opacity-100 transition-opacity"
                                title="View on HashScan"
                            >
                                <ExternalLink class="h-3.5 w-3.5 text-primary" />
                            </a>
                        </div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">First VC Anchored At</div>
                        <div class="text-sm text-foreground">{{ vcTimestamp ?? '—' }}</div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Registry DID</div>
                        <code class="text-xs font-mono text-muted-foreground break-all">{{ project.registryDid ?? '—' }}</code>
                    </div>
                </div>

                <!-- External links -->
                <div class="flex flex-wrap items-center gap-4">
                    <a
                        v-if="hashscanTopicUrl"
                        :href="hashscanTopicUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                    >
                        <ExternalLink class="h-4 w-4" />
                        View Instance Topic on HashScan
                    </a>
                    <a
                        v-if="hashscanPolicyUrl"
                        :href="hashscanPolicyUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                    >
                        <ExternalLink class="h-4 w-4" />
                        View Policy Topic on HashScan
                    </a>
                </div>
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
                            <th class="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"><span class="inline-flex items-center gap-1">Raw Data <InfoTooltip text="Raw Data on the blockchain" /></span></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr v-for="c in linkedCredits" :key="c.id" class="hover:bg-muted/30 transition-colors">
                            <td class="py-3 px-5">
                                <div class="font-medium text-foreground">{{ c.name }}</div>
                                <div class="text-[11px] text-muted-foreground">{{ c.symbol }}</div>
                            </td>
                            <td class="py-3 px-4">
                                <code class="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">{{ c.tokenId }}</code>
                            </td>
                            <td class="py-3 px-4">
                                <span :class="[c.type === 'Fungible' ? 'bg-primary/10 text-primary' : 'bg-chart-4/10 text-chart-4', 'text-xs font-medium rounded-full px-2 py-0.5']">
                                    {{ c.type }}
                                </span>
                            </td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">{{ formatNumber(c.supply) }}</td>
                            <td class="py-3 px-4 text-muted-foreground">{{ c.mintDate }}</td>
                            <td class="py-3 px-4 text-center">
                                <button
                                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    title="View Raw Data"
                                    @click="viewCreditVc(c)"
                                >
                                    <FileJson class="h-3.5 w-3.5" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-else class="px-5 py-8 text-center text-sm text-muted-foreground">
                No issuances have been made for this project yet.
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

            <!-- Lifecycle Summary Bar -->
            <div class="grid grid-cols-4 gap-px bg-border">
                <div class="bg-card px-5 py-4 text-center">
                    <div class="text-lg font-semibold text-foreground tabular-nums">{{ formatNumber(lifecycleSummary.totalIssued) }}</div>
                    <div class="text-[11px] text-muted-foreground">Total Issued</div>
                </div>
                <div class="bg-card px-5 py-4 text-center">
                    <div class="text-lg font-semibold text-foreground tabular-nums">{{ formatNumber(lifecycleSummary.totalTransferred) }}</div>
                    <div class="text-[11px] text-muted-foreground">Transferred</div>
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
                        <span class="flex items-center gap-1 text-[10px] text-muted-foreground"><span class="h-2 w-2 rounded-full bg-stat-rose" /> Retired</span>
                        <span class="flex items-center gap-1 text-[10px] text-muted-foreground"><span class="h-2 w-2 rounded-full bg-stat-green" /> Active</span>
                    </div>
                    <span v-if="lifecycleSummary.totalIssued > 0" class="text-[10px] text-muted-foreground">
                        {{ ((lifecycleSummary.totalRetired / lifecycleSummary.totalIssued) * 100).toFixed(1) }}% retired
                    </span>
                </div>
            </div>

            <!-- Transfers -->
            <div v-if="linkedTransfers.length > 0" class="border-t">
                <div class="px-5 py-2.5 bg-muted/20 flex items-center gap-2">
                    <Repeat class="h-3.5 w-3.5 text-stat-blue" />
                    <span class="text-xs font-semibold text-foreground">Transfers</span>
                    <span class="text-[11px] text-muted-foreground">({{ linkedTransfers.length }})</span>
                </div>
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/10">
                            <th class="text-left py-2 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">From</th>
                            <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">To</th>
                            <th class="text-right py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                            <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                            <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr v-for="t in linkedTransfers" :key="t.id" class="hover:bg-muted/30 transition-colors">
                            <td class="py-2.5 px-5 text-foreground">{{ t.from }}</td>
                            <td class="py-2.5 px-4">
                                <span class="flex items-center gap-1.5">
                                    <ArrowRight class="h-3 w-3 text-stat-blue" />
                                    <span class="text-foreground">{{ t.to }}</span>
                                </span>
                            </td>
                            <td class="py-2.5 px-4 text-right tabular-nums font-medium">{{ formatNumber(t.quantity) }}</td>
                            <td class="py-2.5 px-4 text-muted-foreground">{{ t.date }}</td>
                            <td class="py-2.5 px-4">
                                <span :class="[t.status === 'Completed' ? 'bg-stat-green/10 text-stat-green' : 'bg-stat-amber/10 text-stat-amber', 'text-[11px] font-medium rounded-full px-2 py-0.5']">
                                    {{ t.status }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Retirements -->
            <div v-if="linkedRetirements.length > 0" class="border-t">
                <div class="px-5 py-2.5 bg-muted/20 flex items-center gap-2">
                    <Flame class="h-3.5 w-3.5 text-stat-rose" />
                    <span class="text-xs font-semibold text-foreground">Retirements</span>
                    <span class="text-[11px] text-muted-foreground">({{ linkedRetirements.length }})</span>
                </div>
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/10">
                            <th class="text-left py-2 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Beneficiary</th>
                            <th class="text-right py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                            <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reason</th>
                            <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                            <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr v-for="r in linkedRetirements" :key="r.id" class="hover:bg-muted/30 transition-colors">
                            <td class="py-2.5 px-5 text-foreground font-medium">{{ r.beneficiary }}</td>
                            <td class="py-2.5 px-4 text-right tabular-nums font-medium">{{ formatNumber(r.quantity) }}</td>
                            <td class="py-2.5 px-4 text-muted-foreground text-xs">{{ r.reason }}</td>
                            <td class="py-2.5 px-4 text-muted-foreground">{{ r.date }}</td>
                            <td class="py-2.5 px-4">
                                <span class="text-[11px] font-medium rounded-full px-2 py-0.5 bg-stat-green/10 text-stat-green">
                                    {{ r.status }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-if="linkedTransfers.length === 0 && linkedRetirements.length === 0" class="border-t px-5 py-6 text-center text-sm text-muted-foreground">
                No transfers or retirements recorded for this project yet.
            </div>
        </div>

        <!-- Emission Parameters Card -->
        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30">
                <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 class="h-4 w-4 text-primary" />
                    Emission Parameters
                </h2>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border" v-if="emissions">
                <div class="bg-card px-5 py-5">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                            <TrendingUp class="h-4 w-4 text-amber-600" />
                        </div>
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Baseline Emissions</div>
                    </div>
                    <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.baseline }}</div>
                </div>
                <div class="bg-card px-5 py-5">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
                            <TrendingDown class="h-4 w-4 text-sky-600" />
                        </div>
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Project Emissions</div>
                    </div>
                    <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.project }}</div>
                </div>
                <div class="bg-card px-5 py-5">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                            <AlertTriangle class="h-4 w-4 text-rose-500" />
                        </div>
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Leakage Emissions</div>
                    </div>
                    <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.leakage }}</div>
                </div>
                <div class="bg-card px-5 py-5">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                            <Target class="h-4 w-4 text-emerald-600" />
                        </div>
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Baseline Emission Factor</div>
                    </div>
                    <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.baselineEmissionFactor }}</div>
                </div>
            </div>
        </div>

        <!-- Location Map -->
        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30">
                <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin class="h-4 w-4 text-primary" />
                    Project Location
                </h2>
                <p class="text-[11px] text-muted-foreground mt-0.5">
                    {{ project.lat.toFixed(4) }}, {{ project.lng.toFixed(4) }}<span v-if="displayCountry"> &middot; {{ displayCountry }}</span>
                </p>
            </div>
            <div class="h-[320px]">
                <ClientOnly>
                    <ProjectLocationMap :lat="project.lat" :lng="project.lng" :name="project.name" />
                </ClientOnly>
            </div>
        </div>

        <!-- SDG Icons -->
        <div class="rounded-xl border bg-card overflow-hidden">
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
                    <!-- Timeline line -->
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

        <!-- Methodology -->
        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30">
                <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen class="h-4 w-4 text-primary" />
                    Methodology
                </h2>
                <p class="text-[11px] text-muted-foreground mt-0.5">{{ fullMethodologyName }}</p>
            </div>
            <div class="px-5 py-5">
                <!-- Workflow Diagram -->
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
                                <CheckCircle2
                                    v-if="step.status === 'complete'"
                                    class="h-5 w-5 text-emerald-600"
                                />
                                <Zap
                                    v-else-if="step.status === 'active'"
                                    class="h-5 w-5 text-primary"
                                />
                                <Circle
                                    v-else
                                    class="h-5 w-5 text-muted-foreground/40"
                                />
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

        <!-- Methodology Field Mapping -->
        <div class="rounded-xl border bg-card overflow-hidden">
            <button
                class="w-full px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                @click="methodologyMappingOpen = !methodologyMappingOpen"
            >
                <div>
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Layers class="h-4 w-4 text-primary" />
                        Methodology Field Mapping
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ fullMethodologyName }} — how project fields map to schema fields</p>
                </div>
                <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform" :class="methodologyMappingOpen ? 'rotate-180' : ''" />
            </button>
            <div v-if="methodologyMappingOpen">
                <!-- Loading -->
                <div v-if="decodedMethodology.pending.value" class="px-5 py-6 text-center text-xs text-muted-foreground">
                    Loading mapping…
                </div>
                <!-- No instanceTopicId — older project, needs reparse -->
                <div v-else-if="!project.instanceTopicId" class="px-5 py-6 text-xs text-muted-foreground">
                    Methodology version is not linked to this project yet. Click <strong class="text-foreground">Re-extract</strong> above (or re-parse the methodology) to populate it.
                </div>
                <!-- Fetch error -->
                <div v-else-if="decodedMethodology.error.value" class="px-5 py-6 text-xs text-destructive">
                    Failed to load methodology mapping.
                </div>
                <!-- No project schema decoded -->
                <div v-else-if="!decodedMethodology.data.value?.projectSchema" class="px-5 py-6 text-xs text-muted-foreground">
                    No project schema has been confirmed for this methodology yet.
                </div>
                <!-- Mapping table -->
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

        <!-- Linked VCs Panel -->
        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30">
                <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText class="h-4 w-4 text-primary" />
                    {{ $t('projects.detail.linkedVcs.title') }}
                </h2>
                <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('projects.detail.linkedVcs.subtitle') }}</p>
            </div>

            <!-- No tracking data at all -->
            <div v-if="!project.linkedSchemas?.length" class="px-5 py-8 text-center text-sm text-muted-foreground">
                {{ $t('projects.detail.linkedVcs.notTracked') }}
            </div>

            <!-- Schema cards -->
            <div v-else class="divide-y">
                <div
                    v-for="schema in project.linkedSchemas"
                    :key="schema.schemaUuid"
                    :class="['transition-colors', schema.vcCount === 0 ? 'border-l-2 border-l-amber-300' : '']"
                >
                    <!-- Schema header (collapsible toggle) -->
                    <button
                        class="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-muted/30 transition-colors"
                        @click="toggleSchema(schema.schemaUuid)"
                    >
                        <span class="flex items-center gap-2 min-w-0">
                            <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span class="text-sm font-medium text-foreground truncate">{{ schemaDisplayName(schema.schemaUuid, schema.schemaName) }}</span>
                            <span
                                v-if="schema.isProjectSchema"
                                class="shrink-0 inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium"
                            >
                                {{ $t('projects.detail.linkedVcs.projectSchemaBadge') }}
                            </span>
                            <span
                                v-if="schema.vcCount === 0"
                                class="shrink-0 inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium"
                            >
                                0 VCs
                            </span>
                        </span>
                        <span class="flex items-center gap-2 shrink-0">
                            <span class="text-xs text-muted-foreground tabular-nums">{{ schema.vcCount }} VC(s)</span>
                            <ChevronDown
                                class="h-3.5 w-3.5 text-muted-foreground transition-transform"
                                :class="schemaOpenState[schema.schemaUuid] ? 'rotate-180' : ''"
                            />
                        </span>
                    </button>

                    <!-- Expanded content -->
                    <div v-if="schemaOpenState[schema.schemaUuid]" class="border-t">
                        <!-- Empty state -->
                        <div v-if="schema.vcCount === 0" class="px-5 py-4 text-sm text-muted-foreground italic">
                            {{ $t('projects.detail.linkedVcs.empty') }}
                        </div>

                        <!-- VC table -->
                        <table v-else class="w-full text-sm">
                            <thead>
                                <tr class="bg-muted/20">
                                    <th class="text-left py-2 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.linkedVcs.columns.timestamp') }}</th>
                                    <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.linkedVcs.columns.topicId') }}</th>
                                    <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.linkedVcs.columns.csId') }}</th>
                                    <th class="py-2 px-4" />
                                </tr>
                            </thead>
                            <tbody class="divide-y">
                                <tr v-for="vc in schema.linkedVcs" :key="vc.consensusTimestamp" class="hover:bg-muted/30 transition-colors">
                                    <td class="py-2.5 px-5 text-xs text-foreground tabular-nums">{{ formatTimestamp(vc.consensusTimestamp) }}</td>
                                    <td class="py-2.5 px-4">
                                        <span class="group inline-flex items-center gap-1.5">
                                            <code class="text-xs font-mono text-foreground">{{ vc.topicId }}</code>
                                            <button
                                                class="opacity-0 group-hover:opacity-100 transition-opacity"
                                                :title="$t('common.copy')"
                                                @click.stop="copyToClipboard(vc.topicId)"
                                            >
                                                <Check v-if="copiedTopicId === vc.topicId" class="h-3 w-3 text-emerald-500" />
                                                <Copy v-else class="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                            </button>
                                        </span>
                                    </td>
                                    <td class="py-2.5 px-4">
                                        <code v-if="vc.csId" class="text-xs font-mono text-muted-foreground" :title="vc.csId">
                                            {{ vc.csId.length > 16 ? vc.csId.slice(0, 14) + '…' : vc.csId }}
                                        </code>
                                        <span v-else class="text-xs text-muted-foreground">—</span>
                                    </td>
                                    <td class="py-2.5 px-4 text-right">
                                        <button
                                            class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                                            @click="viewLinkedVcJson(vc.consensusTimestamp)"
                                        >
                                            <FileJson class="h-3.5 w-3.5 text-primary" />
                                            {{ $t('projects.detail.linkedVcs.viewJson') }}
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Raw Data Viewer Modal -->
        <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
    </div>
</template>
