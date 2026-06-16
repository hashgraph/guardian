<script setup lang="ts">
import {
    ArrowLeft,
    Building2,
    Globe,
    FileJson,
    Copy,
    Check,
    ChevronRight,
    AlertCircle,
    ExternalLink,
    Shield,
    BookOpen,
    Coins,
    Layers,
    BarChart3,
    Tag,
    CheckCircle2,
    FolderKanban,
} from 'lucide-vue-next';
import { formatCredits } from '~/lib/format';
import { allocateDonutColors } from '~/lib/chart-colors';
import type { MethodologyDto, MethodologiesResponse } from '~/composables/api/useMethodologiesApi';
import type { CreditDto, CreditsResponse } from '~/composables/api/useCreditsApi';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { network } = useNetwork();

// Tabs (synced with URL hash, matching projects detail page pattern)
type TabKey = 'details' | 'advanced';
const VALID_TABS = new Set<TabKey>(['details', 'advanced']);
const initialHash = (route.hash?.replace('#', '') ?? '') as TabKey;
const activeTab = ref<TabKey>(VALID_TABS.has(initialHash) ? initialHash : 'details');
function setTab(key: TabKey) {
    activeTab.value = key;
    router.replace({ hash: key === 'details' ? '' : `#${key}` });
}
const tabs = [
    { key: 'details' as const,  label: t('registries.detail.info.title'), icon: FolderKanban },
    { key: 'advanced' as const, label: 'Advanced',                         icon: Shield },
];

const registryId = computed(() => route.params.id as string);

// Registry detail
const { data: registry, pending, error } = useRegistryApi({ id: registryId, network });

// Projects from global store filtered to this registry by DID (not name, to
// handle multiple registries sharing the same display name).
const { projects } = useProjects();
const registryProjects = computed(() =>
    registry.value
        ? projects.value.filter(p => p.registryDid === registry.value!.did)
        : [],
);

// Credits for this registry (fetched by DID once registry loads).
// We sum the supply of project-linked credits only, consistent with the
// linkedOnly=true navigation on the stat card.
const registryCredits = ref<CreditDto[]>([]);

if (import.meta.client) {
    const config = useRuntimeConfig();
    const creditsBaseURL = config.public.apiBaseUrl as string;

    watch(
        () => registry.value?.did,
        async (did) => {
            if (!did) return;
            try {
                const res = await $fetch<CreditsResponse>(
                    `/api/v1/${network.value}/credits`,
                    { baseURL: creditsBaseURL, query: { registryDid: did, limit: 500 } },
                );
                registryCredits.value = res.data ?? [];
            } catch {
                registryCredits.value = [];
            }
        },
        { immediate: true },
    );
}

const registryMinted = computed(() =>
    registryCredits.value.filter(c => c.projectId).reduce((sum, c) => sum + c.supply, 0),
);

// Methodologies for this registry (fetched client-side once registry DID is known)
const methodologies = ref<MethodologyDto[]>([]);
const methodologiesPending = ref(false);

if (import.meta.client) {
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;

    watch(
        () => registry.value?.did,
        async (did) => {
            if (!did) return;
            methodologiesPending.value = true;
            try {
                const res = await $fetch<MethodologiesResponse>(
                    `/api/v1/${network.value}/methodologies`,
                    { baseURL, query: { registryDid: did, limit: 50, sortBy: 'projects', sortDir: 'desc', page: 1 } },
                );
                methodologies.value = res.data ?? [];
            } catch {
                methodologies.value = [];
            } finally {
                methodologiesPending.value = false;
            }
        },
        { immediate: true },
    );
}

// Copy helper
const copiedValue = ref<string | null>(null);
async function copyValue(val: string) {
    try {
        await navigator.clipboard.writeText(val);
        copiedValue.value = val;
        setTimeout(() => { if (copiedValue.value === val) copiedValue.value = null; }, 2000);
    } catch {}
}

// Timestamp formatting (same pattern as registries list)
const localeTag = computed(() => locale.value === 'es' ? 'es-ES' : 'en-US');
const formatHederaTimestamp = (ts: string | null) => {
    if (!ts) return '—';
    const seconds = parseFloat(ts);
    if (isNaN(seconds)) return ts;
    return new Date(seconds * 1000).toLocaleDateString(localeTag.value);
};

// Tags
const tagsList = computed(() => {
    if (!registry.value?.tags) return [];
    return registry.value.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
});

// DID display (truncated)
const truncatedDid = computed(() => {
    const did = registry.value?.did;
    if (!did) return '—';
    if (did.length <= 45) return did;
    return did.slice(0, 28) + '…' + did.slice(-12);
});

// HashScan links
const sourceTopicHashscanUrl = computed(() =>
    registry.value?.topicId
        ? `https://hashscan.io/${network.value}/topic/${registry.value.topicId}`
        : null,
);
const registryTopicHashscanUrl = computed(() =>
    registry.value?.relatedTopicId
        ? `https://hashscan.io/${network.value}/topic/${registry.value.relatedTopicId}`
        : null,
);

// Map points (projects with valid coordinates)
const mapPoints = computed(() =>
    registryProjects.value
        .filter(p => p.lat !== 0 || p.lng !== 0)
        .map(p => ({ lat: p.lat, lng: p.lng, name: p.name })),
);

const mapCountries = computed(() => {
    const countryMap = new Map<string, { projects: number; countryCode: string }>();
    for (const p of registryProjects.value) {
        if (!p.country) continue;
        const existing = countryMap.get(p.country);
        if (existing) {
            existing.projects++;
        } else {
            countryMap.set(p.country, { projects: 1, countryCode: p.countryCode ?? '' });
        }
    }
    return [...countryMap.entries()].map(([country, data]) => ({
        country,
        countryCode: data.countryCode,
        projects: data.projects,
        credits: '',
    }));
});

// Top 10 methodologies sorted by instanceProjectCount (the value shown in the UI)
const topMethodologies = computed(() =>
    [...methodologies.value]
        .sort((a, b) => b.stats.instanceProjectCount - a.stats.instanceProjectCount)
        .slice(0, 10),
);

// Methodology donut: top 8 by instanceProjectCount
const methodologySegments = computed(() => {
    const items = [...methodologies.value]
        .sort((a, b) => b.stats.instanceProjectCount - a.stats.instanceProjectCount)
        .slice(0, 8)
        .filter(m => m.stats.instanceProjectCount > 0);
    if (items.length === 0) return [];
    const colors = allocateDonutColors(items.length, `reg-method-${registry.value?.id ?? ''}`);
    return items.map((m, i) => ({
        label: m.name,
        value: m.stats.instanceProjectCount,
        color: colors[i] ?? '#ccc',
    }));
});

// Projects by sector donut
const sectorSegments = computed(() => {
    const sectorMap = new Map<string, number>();
    for (const p of registryProjects.value) {
        const s = p.sector?.trim() || 'Unknown';
        sectorMap.set(s, (sectorMap.get(s) ?? 0) + 1);
    }
    const sorted = [...sectorMap.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return [];
    const colors = allocateDonutColors(sorted.length, `reg-sector-${registry.value?.id ?? ''}`);
    return sorted.map(([label, value], i) => ({
        label,
        value,
        color: colors[i] ?? '#ccc',
    }));
});

// Raw data viewer
const vcViewerOpen = ref(false);
function openRawData() {
    if (!registry.value) return;
    vcViewerOpen.value = true;
}
</script>

<template>
    <div class="space-y-6 p-6">
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <NuxtLink
                to="/registries"
                class="hover:text-foreground transition-colors flex items-center gap-1"
            >
                <ArrowLeft class="h-3.5 w-3.5" />
                {{ $t('registries.detail.breadcrumb') }}
            </NuxtLink>
            <ChevronRight class="h-3.5 w-3.5" />
            <span class="text-foreground font-medium truncate">{{ registry?.name ?? registryId }}</span>
        </div>

        <!-- Loading skeleton -->
        <template v-if="pending">
            <div class="space-y-4">
                <Skeleton class="h-10 w-2/3" />
                <Skeleton class="h-4 w-1/2" />
                <Skeleton class="h-24 w-full rounded-xl" />
                <Skeleton class="h-48 w-full rounded-xl" />
            </div>
        </template>

        <!-- Error state -->
        <template v-else-if="error || !registry">
            <div class="rounded-xl border bg-card px-6 py-12 text-center">
                <AlertCircle class="h-8 w-8 text-destructive mx-auto mb-3" />
                <p class="text-sm font-medium text-foreground mb-1">{{ $t('registries.detail.notFound') }}</p>
                <p class="text-xs text-muted-foreground mb-4">
                    {{ $t('registries.detail.notFoundDesc', { id: registryId, network }) }}
                </p>
                <NuxtLink to="/registries" class="text-sm text-primary hover:underline">
                    ← {{ $t('registries.detail.backLink') }}
                </NuxtLink>
            </div>
        </template>

        <!-- Main content -->
        <template v-else>

            <!-- ── Hero Header ─────────────────────────────────────────── -->
            <div class="flex items-start justify-between gap-4 flex-wrap">
                <div class="min-w-0">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <Building2 class="h-5 w-5 text-primary" />
                        </div>
                        <div class="min-w-0">
                            <h1 class="text-2xl font-bold text-foreground">{{ registry.name }}</h1>
                            <p
                                class="text-xs text-muted-foreground font-mono truncate max-w-[480px]"
                                :title="registry.did"
                            >{{ truncatedDid }}</p>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 ml-13">
                        <span
                            v-if="registry.geography"
                            class="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-medium text-sky-700"
                        >
                            <Globe class="h-3 w-3" />
                            {{ registry.geography }}
                        </span>
                        <span
                            v-for="tag in tagsList"
                            :key="tag"
                            class="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                        >
                            <Tag class="h-3 w-3" />
                            {{ tag }}
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button
                        class="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        :title="registry.did"
                        @click="copyValue(registry.did)"
                    >
                        <Check v-if="copiedValue === registry.did" class="h-3.5 w-3.5 text-stat-green" />
                        <Copy v-else class="h-3.5 w-3.5" />
                        {{ $t('registries.detail.copyDid') }}
                    </button>
                    <button
                        class="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        @click="openRawData"
                    >
                        <FileJson class="h-3.5 w-3.5" />
                        {{ $t('registries.detail.viewRawData') }}
                    </button>
                </div>
            </div>

            <!-- ── Stats Cards ─────────────────────────────────────────── -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NuxtLink
                    :to="`/methodologies?registryDid=${encodeURIComponent(registry.did)}`"
                    class="group rounded-xl border bg-card px-5 py-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
                >
                    <div class="flex items-center justify-between mb-3">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            {{ $t('registries.detail.stats.methodologies') }}
                        </div>
                        <div class="rounded-lg bg-primary/10 p-1.5 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-3">
                            <BookOpen class="h-3.5 w-3.5 text-primary" />
                        </div>
                    </div>
                    <div class="text-2xl font-bold text-foreground tabular-nums">
                        {{ registry.stats.policyCount.toLocaleString() }}
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">{{ $t('dashboard.stats.methodologiesSub') }}</p>
                </NuxtLink>

                <NuxtLink
                    :to="`/projects?registry=${encodeURIComponent(registry.name)}`"
                    class="group rounded-xl border bg-card px-5 py-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
                >
                    <div class="flex items-center justify-between mb-3">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            {{ $t('registries.detail.stats.projects') }}
                        </div>
                        <div class="rounded-lg bg-stat-amber/10 p-1.5 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-3">
                            <Layers class="h-3.5 w-3.5 text-stat-amber" />
                        </div>
                    </div>
                    <div class="text-2xl font-bold text-foreground tabular-nums">
                        {{ registry.stats.projectCount.toLocaleString() }}
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">{{ $t('dashboard.stats.projectsSub') }}</p>
                </NuxtLink>

                <NuxtLink
                    :to="`/credits?registryDid=${encodeURIComponent(registry.did)}&linkedOnly=true`"
                    class="group rounded-xl border bg-card px-5 py-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
                >
                    <div class="flex items-center justify-between mb-3">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            {{ $t('dashboard.stats.totalIssuances') }}
                        </div>
                        <div class="rounded-lg bg-stat-rose/10 p-1.5 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-3">
                            <Coins class="h-3.5 w-3.5 text-stat-rose" />
                        </div>
                    </div>
                    <div class="text-2xl font-bold text-foreground tabular-nums">
                        {{ formatCredits(registryMinted) }}
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">{{ $t('dashboard.stats.totalIssuancesSub') }}</p>
                </NuxtLink>
            </div>

            <!-- ── Details / Advanced Tab Card ──────────────────────── -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <!-- Tab nav -->
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

                <!-- Tab: Details -->
                <div v-if="activeTab === 'details'" class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('registries.detail.info.geography') }}
                        </div>
                        <div class="text-sm text-foreground">{{ registry.geography || '—' }}</div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('registries.detail.info.law') }}
                        </div>
                        <div class="text-sm text-foreground break-words">{{ registry.law || '—' }}</div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('registries.detail.info.website') }}
                        </div>
                        <div class="text-sm">
                            <a
                                v-if="registry.website"
                                :href="registry.website"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-primary hover:underline inline-flex items-center gap-1 break-all"
                            >
                                {{ registry.website }}
                                <ExternalLink class="h-3 w-3 shrink-0" />
                            </a>
                            <span v-else class="text-muted-foreground">—</span>
                        </div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('registries.detail.info.language') }}
                        </div>
                        <div class="text-sm text-foreground uppercase">{{ registry.lang || '—' }}</div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('registries.detail.info.tags') }}
                        </div>
                        <div class="flex flex-wrap gap-1">
                            <span
                                v-for="tag in tagsList"
                                :key="tag"
                                class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >{{ tag }}</span>
                            <span v-if="tagsList.length === 0" class="text-sm text-muted-foreground">—</span>
                        </div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('registries.detail.info.created') }}
                        </div>
                        <div class="text-sm text-foreground">{{ formatHederaTimestamp(registry.sourceTimestamp) }}</div>
                    </div>
                </div>

                <!-- Tab: Advanced (Hedera On-Chain) -->
                <div v-else-if="activeTab === 'advanced'" class="p-5 space-y-4">
                    <!-- Verified badge -->
                    <div class="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                        <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
                        <div>
                            <div class="text-sm font-medium text-emerald-800">Verified on Hedera</div>
                            <div class="text-xs text-emerald-700">This registry is governed by an on-chain Guardian policy anchored to the Hedera network.</div>
                        </div>
                    </div>

                    <!-- Reference grid (inline copy + HashScan pattern from HederaReferences.vue) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border rounded-lg overflow-hidden border">
                        <!-- Registry Topic ID (first position) -->
                        <div class="bg-card px-5 py-4">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                {{ $t('registries.detail.hedera.registryTopic') }}
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <code class="text-sm font-mono text-foreground">{{ registry.relatedTopicId || '—' }}</code>
                                <button
                                    v-if="registry.relatedTopicId"
                                    title="Copy"
                                    @click="copyValue(registry.relatedTopicId!)"
                                >
                                    <Check v-if="copiedValue === registry.relatedTopicId" class="h-3.5 w-3.5 text-emerald-500" />
                                    <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                </button>
                                <a
                                    v-if="registryTopicHashscanUrl"
                                    :href="registryTopicHashscanUrl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                    <ExternalLink class="h-3 w-3" />
                                    {{ $t('common.viewOnHashScan') }}
                                </a>
                            </div>
                        </div>

                        <!-- Source Topic ID (second position) -->
                        <div class="bg-card px-5 py-4">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                {{ $t('registries.detail.hedera.sourceTopic') }}
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <code class="text-sm font-mono text-foreground">{{ registry.topicId || '—' }}</code>
                                <button
                                    v-if="registry.topicId"
                                    title="Copy"
                                    @click="copyValue(registry.topicId!)"
                                >
                                    <Check v-if="copiedValue === registry.topicId" class="h-3.5 w-3.5 text-emerald-500" />
                                    <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                </button>
                                <a
                                    v-if="sourceTopicHashscanUrl"
                                    :href="sourceTopicHashscanUrl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                    <ExternalLink class="h-3 w-3" />
                                    {{ $t('common.viewOnHashScan') }}
                                </a>
                            </div>
                        </div>

                        <!-- Registry DID -->
                        <div class="bg-card px-5 py-4">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                {{ $t('registries.detail.hedera.did') }}
                            </div>
                            <div class="flex items-start gap-2">
                                <code
                                    class="text-xs font-mono text-muted-foreground break-all flex-1"
                                    :title="registry.did"
                                >{{ registry.did || '—' }}</code>
                                <button
                                    v-if="registry.did"
                                    class="shrink-0 mt-0.5"
                                    title="Copy"
                                    @click="copyValue(registry.did)"
                                >
                                    <Check v-if="copiedValue === registry.did" class="h-3.5 w-3.5 text-emerald-500" />
                                    <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                </button>
                            </div>
                        </div>

                        <!-- Network -->
                        <div class="bg-card px-5 py-4">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                {{ $t('registries.detail.hedera.network') }}
                            </div>
                            <span class="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                                {{ registry.network }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Project Locations Map ───────────────────────────────── -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="flex h-[28rem]">
                    <div class="flex-1 relative">
                        <ProjectMap :countries="mapCountries" :points="mapPoints" :auto-fit="true" />
                    </div>
                </div>
            </div>

            <!-- ── Top Methodologies ──────────────────────────────────── -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
                    <div>
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <BookOpen class="h-4 w-4 text-primary" />
                            {{ $t('registries.detail.topMethodologies.title') }}
                        </h2>
                        <p class="text-xs text-muted-foreground mt-0.5">{{ $t('registries.detail.topMethodologies.subtitle') }}</p>
                    </div>
                    <NuxtLink
                        v-if="registry.did"
                        :to="`/methodologies?registryDid=${encodeURIComponent(registry.did)}`"
                        class="text-xs font-medium text-primary hover:underline"
                    >{{ $t('common.viewAll') }}</NuxtLink>
                </div>

                <!-- Loading -->
                <div v-if="methodologiesPending" class="divide-y">
                    <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-5 py-3.5">
                        <Skeleton class="h-6 w-6 rounded-full shrink-0" />
                        <Skeleton class="h-4 flex-1" />
                        <Skeleton class="h-4 w-16" />
                        <Skeleton class="h-4 w-16" />
                    </div>
                </div>

                <!-- Data -->
                <div v-else-if="topMethodologies.length > 0" class="divide-y">
                    <NuxtLink
                        v-for="(m, i) in topMethodologies"
                        :key="m.id"
                        :to="`/methodologies/${encodeURIComponent(m.sourceTimestamp ?? m.id)}`"
                        class="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                    >
                        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                            {{ i + 1 }}
                        </span>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{{ m.name }}</p>
                            <p v-if="m.version" class="text-[11px] text-muted-foreground font-mono">v{{ m.version }}</p>
                        </div>
                        <div class="flex items-center gap-6 shrink-0">
                            <div class="text-right">
                                <div class="text-xs font-medium text-foreground tabular-nums">{{ m.stats.instanceProjectCount.toLocaleString() }}</div>
                                <div class="text-[10px] text-muted-foreground">{{ $t('registries.detail.topMethodologies.projects') }}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-xs font-medium text-foreground tabular-nums">{{ formatCredits(m.stats.instanceIssuanceCount) }}</div>
                                <div class="text-[10px] text-muted-foreground">{{ $t('registries.detail.topMethodologies.issuances') }}</div>
                            </div>
                        </div>
                    </NuxtLink>
                </div>

                <!-- Empty -->
                <div v-else class="py-10 text-center text-sm text-muted-foreground">
                    {{ $t('registries.detail.topMethodologies.noData') }}
                </div>
            </div>

            <!-- ── Charts Row ─────────────────────────────────────────── -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <!-- Methodologies by Projects -->
                <div class="rounded-xl border bg-card p-5">
                    <h3 class="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                        <BarChart3 class="h-4 w-4 text-primary" />
                        {{ $t('registries.detail.charts.methodologiesTitle') }}
                    </h3>
                    <div v-if="methodologySegments.length > 0" class="flex items-start gap-5">
                        <DonutChart :segments="methodologySegments" :size="150" />
                        <div class="space-y-2 flex-1 min-w-0 pt-1">
                            <div
                                v-for="s in methodologySegments"
                                :key="s.label"
                                class="flex items-center gap-2"
                            >
                                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />
                                <span class="text-xs text-muted-foreground truncate flex-1">{{ s.label }}</span>
                                <span class="text-xs font-medium text-foreground tabular-nums shrink-0">
                                    {{ s.value }} {{ $t('registries.detail.charts.projectsLabel') }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div v-else class="py-8 text-center text-sm text-muted-foreground">
                        {{ $t('registries.detail.charts.noMethodologies') }}
                    </div>
                </div>

                <!-- Projects by Sector -->
                <div class="rounded-xl border bg-card p-5">
                    <h3 class="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                        <BarChart3 class="h-4 w-4 text-primary" />
                        {{ $t('registries.detail.charts.sectorsTitle') }}
                    </h3>
                    <div v-if="sectorSegments.length > 0" class="flex items-start gap-5">
                        <DonutChart :segments="sectorSegments" :size="150" />
                        <div class="space-y-2 flex-1 min-w-0 pt-1">
                            <div
                                v-for="s in sectorSegments"
                                :key="s.label"
                                class="flex items-center gap-2"
                            >
                                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />
                                <span class="text-xs text-muted-foreground truncate flex-1">{{ s.label }}</span>
                                <span class="text-xs font-medium text-foreground tabular-nums shrink-0">
                                    {{ s.value }} {{ $t('registries.detail.charts.projectsLabel') }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div v-else class="py-8 text-center text-sm text-muted-foreground">
                        {{ $t('registries.detail.charts.noSectors') }}
                    </div>
                </div>
            </div>

        </template>

        <!-- Raw data viewer -->
        <VcJsonViewer
            :open="vcViewerOpen"
            :title="registry?.name ?? ''"
            :data="registry as unknown as Record<string, any>"
            @close="vcViewerOpen = false"
        />
    </div>
</template>
