<script setup lang="ts">
import {
    ArrowLeft, FileJson, MapPin, Calendar, Building2, Shield, Coins,
    ChevronDown, ChevronUp, Copy, Check, Users, BookOpen, Target,
    Globe, Leaf, FolderKanban, Layers, BarChart3, Clock, Activity,
    GitBranch, ArrowRight, CheckCircle2, Circle, Zap, FileText, Network, Repeat, Flame,
    TrendingUp, TrendingDown, AlertTriangle, Database, ExternalLink,
} from 'lucide-vue-next';
import type { Credit } from '~/types/models';
import { formatCredits, formatNumber } from '~/lib/format';
import { getSDG } from '~/lib/sdgs';
import { REGISTRY_TERM_MAPPINGS } from '~/lib/registry-terms';
import { getMethodologyName } from '~/lib/methodologies';
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

const displayCountryCode = computed(() => geocodedCountry.value?.code ?? project.value?.countryCode ?? 'UNK');
const displayCountry = computed(() => geocodedCountry.value?.name ?? project.value?.country ?? '');

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

const termMappingOpen = ref(false);
const vcViewerOpen = ref(false);
const vcViewerTitle = ref('');
const vcViewerData = ref<Record<string, any> | null>(null);

function viewProjectVc() {
    if (!project.value || !projectVc.value) return;
    vcViewerTitle.value = project.value.name;
    vcViewerData.value = projectVc.value;
    vcViewerOpen.value = true;
}

function viewCreditVc(c: Credit) {
    vcViewerTitle.value = c.name;
    vcViewerData.value = generateCreditVc(c, project.value?.name);
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
    if (!project.value?.vintage) return '-';
    const yr = parseInt(project.value.vintage);
    return isNaN(yr) ? '-' : `${yr - 1}-01-01`;
});

const creditingPeriodEnd = computed(() => {
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
                        <CountryFlag :code="displayCountryCode" size="sm" class="mr-0.5" /> {{ displayCountry }} &middot; {{ project.registry }} &middot; {{ project.developer }}
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
                    <div class="text-sm font-medium text-foreground flex items-center gap-1.5"><CountryFlag :code="displayCountryCode" size="sm" /> {{ displayCountry }}</div>
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
                    <div class="text-sm font-medium text-foreground">{{ fullMethodologyName }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Registry</div>
                    <div class="text-sm font-medium text-foreground">{{ project.registry }}</div>
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

            <!-- Registry Term Mapping (collapsible) -->
            <div class="border-t">
                <button
                    class="flex w-full items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                    @click="termMappingOpen = !termMappingOpen"
                >
                    <span class="flex items-center gap-2">
                        <Layers class="h-3.5 w-3.5" />
                        Registry Term Mapping — {{ project.registry }}
                    </span>
                    <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="termMappingOpen ? 'rotate-180' : ''" />
                </button>
                <div v-if="termMappingOpen" class="border-t">
                    <table class="w-full text-xs">
                        <thead>
                            <tr class="bg-muted/20">
                                <th class="text-left py-2 px-5 font-medium text-muted-foreground uppercase tracking-wider">Standard Term</th>
                                <th class="text-left py-2 px-4 font-medium text-muted-foreground uppercase tracking-wider">{{ project.registry }} Term</th>
                                <th class="text-left py-2 px-4 font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <tr v-for="m in REGISTRY_TERM_MAPPINGS" :key="m.canonical" class="hover:bg-muted/20">
                                <td class="py-2 px-5 font-medium text-foreground">{{ m.canonical }}</td>
                                <td class="py-2 px-4">
                                    <span class="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[11px] font-medium">
                                        {{ m.terms[project.registry] || m.canonical }}
                                    </span>
                                </td>
                                <td class="py-2 px-4 text-muted-foreground">{{ m.description }}</td>
                            </tr>
                        </tbody>
                    </table>
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
                    {{ project.lat.toFixed(4) }}, {{ project.lng.toFixed(4) }} &middot; {{ project.country }}
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
                        :project-name="project.name"
                        :methodology="project.methodology"
                        :methodology-id="project.methodologyId"
                        :registry="project.registry"
                        :developer="project.developer"
                        :project-id="project.id"
                        :vintage="project.vintage"
                        :country="project.country"
                        :sector="project.sector"
                        :token-symbol="linkedCredits[0]?.symbol"
                        :token-name="linkedCredits[0]?.name"
                        :token-id="linkedCredits[0]?.tokenId"
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

        <!-- Raw Data Viewer Modal -->
        <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
    </div>
</template>
