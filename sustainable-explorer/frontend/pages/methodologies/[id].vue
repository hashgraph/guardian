<script setup lang="ts">
import {
    ArrowLeft, BookOpen, Shield, Coins, ExternalLink, FileJson,
    CheckCircle2, Clock, GitBranch, BarChart3, Zap, Globe,
    Building2, Layers, Activity, Network, ChevronRight, FileText,
    TrendingUp, TrendingDown, Users, Copy, Check, Hash,
} from 'lucide-vue-next';
import { MOCK_METHODOLOGY } from '~/data';
import { formatCredits, formatNumber } from '~/lib/format';

const route = useRoute();

// Use mock data for all methodology IDs
const methodology = MOCK_METHODOLOGY;

const activeTab = ref<'overview' | 'versions' | 'projects' | 'policy' | 'analytics' | 'actions'>('overview');

const tabs = [
    { key: 'overview', label: 'Overview', icon: BookOpen },
    { key: 'versions', label: 'Version History', icon: Clock },
    { key: 'projects', label: 'Linked Projects', icon: Layers },
    { key: 'policy', label: 'Hedera Policy', icon: Shield },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'actions', label: 'Actions', icon: Zap },
] as const;

const statusColor: Record<string, { bg: string; text: string; dot: string }> = {
    Active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    Deprecated: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
};

const typeColor: Record<string, string> = {
    Avoidance: 'bg-sky-50 text-sky-700',
    Removal: 'bg-violet-50 text-violet-700',
};

const projectStatusColor: Record<string, { dot: string }> = {
    Registered: { dot: 'bg-slate-400' },
    'Under Validation': { dot: 'bg-amber-500' },
    Verified: { dot: 'bg-blue-500' },
    Issuing: { dot: 'bg-emerald-500' },
    Completed: { dot: 'bg-purple-500' },
};

const copiedValue = ref<string | null>(null);
async function copyValue(val: string) {
    try {
        await navigator.clipboard.writeText(val);
        copiedValue.value = val;
        setTimeout(() => { if (copiedValue.value === val) copiedValue.value = null; }, 2000);
    } catch {}
}

const hashscanUrl = computed(() =>
    `https://hashscan.io/mainnet/topic/${methodology.topicId}`
);

const retirementPct = computed(() =>
    methodology.stats.totalIssuance > 0
        ? ((methodology.stats.totalRetirement / methodology.stats.totalIssuance) * 100).toFixed(1)
        : '0'
);
</script>

<template>
    <div class="space-y-6 p-6">
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <NuxtLink to="/methodologies" class="hover:text-foreground transition-colors flex items-center gap-1">
                <ArrowLeft class="h-3.5 w-3.5" />
                Methodologies
            </NuxtLink>
            <ChevronRight class="h-3.5 w-3.5" />
            <span class="text-foreground font-medium">{{ methodology.code }}</span>
        </div>

        <!-- Header -->
        <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
                <div class="flex items-center gap-3 mb-2">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <BookOpen class="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-foreground">{{ methodology.code }}</h1>
                        <p class="text-sm text-muted-foreground">{{ methodology.registry }} &middot; {{ methodology.sector }} &middot; {{ methodology.version }}</p>
                    </div>
                </div>
                <p class="text-sm text-muted-foreground max-w-2xl">{{ methodology.description }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <NuxtLink
                    to="#projects"
                    class="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    @click.prevent="activeTab = 'projects'"
                >
                    <Layers class="h-4 w-4 text-primary" />
                    View Projects
                </NuxtLink>
                <a
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

        <!-- Summary header card -->
        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Registry</div>
                    <div class="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Building2 class="h-3.5 w-3.5 text-muted-foreground" />
                        {{ methodology.registry }}
                    </div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Sector</div>
                    <div class="text-sm font-medium text-foreground">{{ methodology.sector }}</div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Type</div>
                    <span :class="[typeColor[methodology.type], 'text-xs font-medium rounded-full px-2.5 py-1']">
                        {{ methodology.type }}
                    </span>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</div>
                    <div class="flex items-center gap-2">
                        <span :class="[statusColor[methodology.status]?.dot, 'h-2 w-2 rounded-full']" />
                        <span class="text-sm font-medium text-foreground">{{ methodology.status }}</span>
                    </div>
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
                        'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap'
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
            <!-- Description -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileText class="h-4 w-4 text-primary" />
                        Description
                    </h2>
                </div>
                <div class="px-5 py-5">
                    <p class="text-sm text-foreground leading-relaxed">{{ methodology.fullDescription }}</p>
                    <button class="mt-3 text-xs font-medium text-primary hover:underline">Read More →</button>
                </div>
            </div>

            <!-- Emission Reduction Approach -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <TrendingDown class="h-4 w-4 text-primary" />
                        Emission Reduction Approach
                    </h2>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border">
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Baseline Scenario</div>
                        <div class="text-sm text-foreground">{{ methodology.emissionReduction.baselineScenario }}</div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Project Scenario</div>
                        <div class="text-sm text-foreground">{{ methodology.emissionReduction.projectScenario }}</div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Calculation Method</div>
                        <div class="text-sm text-foreground">{{ methodology.emissionReduction.calculationMethod }}</div>
                    </div>
                </div>
            </div>

            <!-- Applicable Sectoral Scopes -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Globe class="h-4 w-4 text-primary" />
                        Applicable Sectoral Scopes
                    </h2>
                </div>
                <div class="px-5 py-5">
                    <div class="flex flex-wrap gap-2">
                        <span
                            v-for="scope in methodology.sectoralScopes"
                            :key="scope"
                            class="inline-flex items-center rounded-lg border bg-muted/30 px-3 py-1.5 text-sm text-foreground"
                        >
                            {{ scope }}
                        </span>
                    </div>
                    <button class="mt-4 text-xs font-medium text-primary hover:underline">View Calculations →</button>
                </div>
            </div>
        </div>

        <!-- Tab: Version History -->
        <div v-else-if="activeTab === 'versions'" class="space-y-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Clock class="h-4 w-4 text-primary" />
                        Version History
                    </h2>
                    <button class="text-xs text-muted-foreground hover:text-foreground transition-colors border rounded-md px-3 py-1.5">
                        Compare Versions (Future)
                    </button>
                </div>
                <div class="px-5 py-5">
                    <div class="relative">
                        <div class="absolute left-[15px] top-3 bottom-3 w-px bg-border" />
                        <div
                            v-for="(v, idx) in methodology.versionHistory"
                            :key="v.version"
                            class="relative flex items-start gap-4 pb-6 last:pb-0"
                        >
                            <div :class="[
                                v.isCurrent ? 'bg-emerald-50 border-emerald-200' : 'bg-muted/50 border-border',
                                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border'
                            ]">
                                <CheckCircle2 v-if="v.isCurrent" class="h-4 w-4 text-emerald-600" />
                                <Clock v-else class="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div class="pt-1 flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-sm font-semibold text-foreground">{{ v.version }}</span>
                                    <span v-if="v.isCurrent" class="text-[11px] font-medium bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">Current</span>
                                    <span class="text-xs text-muted-foreground">Updated: {{ v.date }}</span>
                                </div>
                                <p class="text-sm text-muted-foreground">{{ v.changes }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab: Linked Projects -->
        <div v-else-if="activeTab === 'projects'" class="space-y-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Layers class="h-4 w-4 text-primary" />
                        Linked Projects
                    </h2>
                    <span class="text-xs text-muted-foreground">{{ methodology.linkedProjects.length }} project(s)</span>
                </div>
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/20">
                            <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</th>
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Country</th>
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                            <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Credits</th>
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vintage</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr
                            v-for="p in methodology.linkedProjects"
                            :key="p.id"
                            class="hover:bg-muted/30 transition-colors cursor-pointer"
                            @click="navigateTo('/projects/' + p.id)"
                        >
                            <td class="py-3 px-5 font-medium text-foreground">{{ p.name }}</td>
                            <td class="py-3 px-4 text-muted-foreground">{{ p.country }}</td>
                            <td class="py-3 px-4">
                                <div class="flex items-center gap-2">
                                    <span :class="[projectStatusColor[p.status]?.dot || 'bg-muted-foreground', 'h-2 w-2 rounded-full']" />
                                    <span class="text-sm text-foreground">{{ p.status }}</span>
                                </div>
                            </td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">{{ formatNumber(p.credits) }}</td>
                            <td class="py-3 px-4 text-muted-foreground">{{ p.vintage }}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="border-t px-5 py-3 flex justify-end">
                    <button class="text-xs text-muted-foreground hover:text-foreground border rounded-md px-3 py-1.5 transition-colors">
                        Export List (Future)
                    </button>
                </div>
            </div>
        </div>

        <!-- Tab: Hedera Policy -->
        <div v-else-if="activeTab === 'policy'" class="space-y-6">
            <!-- Business View -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Shield class="h-4 w-4 text-primary" />
                        Business View
                    </h2>
                </div>
                <div class="px-5 py-5 space-y-4">
                    <div class="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                        <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
                        <div>
                            <div class="text-sm font-medium text-emerald-800">Verified on Hedera</div>
                            <div class="text-xs text-emerald-700">This methodology is governed by an on-chain policy.</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border rounded-lg overflow-hidden border">
                        <div class="bg-card px-5 py-4">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Policy</div>
                            <div class="text-sm font-medium text-foreground">{{ methodology.policyName }}</div>
                        </div>
                        <div class="bg-card px-5 py-4">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Last Verified</div>
                            <div class="text-sm font-medium text-foreground">{{ methodology.lastVerified }}</div>
                        </div>
                    </div>
                    <button class="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                        <FileJson class="h-4 w-4 text-primary" />
                        View Proof
                    </button>
                </div>
            </div>

            <!-- Technical View -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Hash class="h-4 w-4 text-primary" />
                        Technical View
                    </h2>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Hedera Topic ID</div>
                        <div class="group flex items-center gap-2">
                            <code class="text-sm font-mono text-foreground">{{ methodology.topicId }}</code>
                            <button
                                class="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                @click="copyValue(methodology.topicId)"
                            >
                                <Check v-if="copiedValue === methodology.topicId" class="h-3.5 w-3.5 text-stat-green" />
                                <Copy v-else class="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Instance Topic ID</div>
                        <div class="group flex items-center gap-2">
                            <code class="text-sm font-mono text-foreground">{{ methodology.instanceTopicId }}</code>
                            <button
                                class="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                @click="copyValue(methodology.instanceTopicId)"
                            >
                                <Check v-if="copiedValue === methodology.instanceTopicId" class="h-3.5 w-3.5 text-stat-green" />
                                <Copy v-else class="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Timestamp</div>
                        <div class="text-sm text-foreground">{{ methodology.lastVerified }}T12:45:22Z</div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Network</div>
                        <div class="text-sm text-foreground">Mainnet</div>
                    </div>
                </div>
                <div class="border-t px-5 py-3">
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

        <!-- Tab: Analytics -->
        <div v-else-if="activeTab === 'analytics'" class="space-y-6">
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-5">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Coins class="h-4 w-4 text-primary" />
                            </div>
                            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Issuance</div>
                        </div>
                        <div class="text-2xl font-bold text-foreground tabular-nums">{{ formatCredits(methodology.stats.totalIssuance) }}</div>
                    </div>
                </div>
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-5">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50">
                                <TrendingDown class="h-4 w-4 text-rose-500" />
                            </div>
                            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Retirement</div>
                        </div>
                        <div class="text-2xl font-bold text-stat-rose tabular-nums">{{ formatCredits(methodology.stats.totalRetirement) }}</div>
                    </div>
                </div>
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-5">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                                <Users class="h-4 w-4 text-emerald-600" />
                            </div>
                            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Projects</div>
                        </div>
                        <div class="text-2xl font-bold text-foreground tabular-nums">{{ methodology.stats.activeProjects }}</div>
                    </div>
                </div>
            </div>

            <!-- Issuance vs Retirement bar -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <BarChart3 class="h-4 w-4 text-primary" />
                        Issuance vs Retirement
                    </h2>
                </div>
                <div class="px-5 py-5">
                    <div class="flex h-3 rounded-full overflow-hidden bg-muted mb-3">
                        <div
                            class="bg-primary transition-all"
                            :style="{ width: `${((methodology.stats.totalIssuance - methodology.stats.totalRetirement) / methodology.stats.totalIssuance) * 100}%` }"
                            title="Active"
                        />
                        <div
                            class="bg-stat-rose transition-all"
                            :style="{ width: `${(methodology.stats.totalRetirement / methodology.stats.totalIssuance) * 100}%` }"
                            title="Retired"
                        />
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="flex items-center gap-1.5 text-xs text-muted-foreground"><span class="h-2.5 w-2.5 rounded-full bg-primary" /> Active</span>
                        <span class="flex items-center gap-1.5 text-xs text-muted-foreground"><span class="h-2.5 w-2.5 rounded-full bg-stat-rose" /> Retired ({{ retirementPct }}%)</span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-4 border rounded-lg px-4 py-3 bg-muted/20">
                        Issuance over time, retirement trend, and geography distribution charts will be available once live data is connected.
                    </p>
                </div>
            </div>
        </div>

        <!-- Tab: Actions -->
        <div v-else-if="activeTab === 'actions'" class="space-y-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Zap class="h-4 w-4 text-primary" />
                        Actions
                    </h2>
                </div>
                <div class="px-5 py-5 space-y-4">
                    <div>
                        <h3 class="text-sm font-semibold text-foreground mb-1">About this Methodology</h3>
                        <p class="text-sm text-muted-foreground">{{ methodology.fullDescription }}</p>
                        <p class="text-sm text-muted-foreground mt-2">
                            Related schema: <code class="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">{{ methodology.instanceTopicId }}</code>
                        </p>
                    </div>
                    <div class="border-t pt-4">
                        <h3 class="text-sm font-semibold text-foreground mb-2">Compare Methodologies</h3>
                        <p class="text-sm text-muted-foreground mb-3">Select another methodology to compare side-by-side against {{ methodology.code }}.</p>
                        <button
                            disabled
                            class="inline-flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                        >
                            <GitBranch class="h-4 w-4" />
                            Compare (Coming Soon)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
