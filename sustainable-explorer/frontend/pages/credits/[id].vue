<script setup lang="ts">
import {
    ExternalLink,
    FileJson,
    Coins,
    AlertTriangle,
    FolderKanban,
    Link,
} from 'lucide-vue-next';
import { formatCredits, formatDate } from '~/lib/format';
import type { CreditDto, CreditsResponse } from '~/composables/api/useCreditsApi';

interface MintEvent {
    consensusTimestamp: string;
    topicId: string;
    amount: string | null;
    date: string | null;
    document: Record<string, any> | null;
}

interface CreditRaw {
    tokenId: string | null;
    name: string | null;
    symbol: string | null;
    type: 'Fungible' | 'Non-Fungible' | null;
    supply: number;
    projectId: string | null;
    project: string | null;
    methodologyId: string | null;
    methodology: string | null;
    registry: string | null;
    registryDid: string | null;
    mintDate: string | null;
}

interface CreditRawDetail {
    credit: CreditRaw | null;
    tokenMessage: Record<string, any> | null;
    mintEvents: MintEvent[];
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { network } = useNetwork();
const tokenId = computed(() => route.params.id as string);

const config = useRuntimeConfig();
const baseURL = import.meta.server
    ? (config.apiBaseUrl as string)
    : (config.public.apiBaseUrl as string);

const { data, pending } = useAsyncData<CreditRawDetail | null>(
    () => `credit-detail:${network.value}:${tokenId.value}`,
    () =>
        $fetch<CreditRawDetail>(
            `/api/v1/${network.value}/credits/${encodeURIComponent(tokenId.value)}/raw`,
            { baseURL },
        ).catch(() => null),
    { watch: [network, tokenId], default: () => null },
);

const credit = computed(() => data.value?.credit ?? null);
const mintEvents = computed(() => data.value?.mintEvents ?? []);

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = 'details' | 'provenance';
const VALID_TABS = new Set<TabKey>(['details', 'provenance']);

const activeTab = ref<TabKey>('details');
const tabReady = ref(false);

onMounted(() => {
    const h = (route.hash?.replace('#', '') ?? '') as TabKey;
    if (VALID_TABS.has(h)) activeTab.value = h;
    tabReady.value = true;
});

function setTab(key: TabKey) {
    activeTab.value = key;
    router.replace({ hash: key === 'details' ? '' : `#${key}` });
}

const tabs = computed(() => [
    { key: 'details'    as TabKey, label: t('credits.detail.tabs.details'),  icon: Coins },
    { key: 'provenance' as TabKey, label: t('credits.detail.tabs.linkage'),  icon: Link },
]);

// ─── Computed ─────────────────────────────────────────────────────────────────

const tokenSupply = computed(() => credit.value?.supply ?? 0);
const totalMinted = computed(() =>
    mintEvents.value.reduce((s, e) => s + (e.amount ? parseFloat(e.amount) : 0), 0),
);
const hasDifference = computed(
    () => tokenSupply.value > 0 && totalMinted.value > 0 && tokenSupply.value !== totalMinted.value,
);

const firstMintDate = computed(
    () =>
        credit.value?.mintDate ??
        mintEvents.value
            .map(e => e.date)
            .filter(Boolean)
            .sort()[0] ??
        null,
);

const hashscanTokenUrl = computed(
    () => `https://hashscan.io/${network.value}/token/${tokenId.value}`,
);

const typeColor: Record<string, string> = {
    Fungible: 'bg-stat-blue/10 text-stat-blue',
    'Non-Fungible': 'bg-stat-amber/10 text-stat-amber',
};


// ─── Related Issuances: all credit entries sharing this token ID ───────────────

const relatedRaw = ref<CreditDto[]>([]);
const relatedPending = ref(false);

// Filter reactively so when credit.value loads after the fetch completes,
// the current issuance is excluded without needing a re-fetch.
const related = computed(() => {
    const currentProjectId = credit.value?.projectId ?? null;
    return relatedRaw.value.filter(r => r.projectId !== currentProjectId);
});

if (import.meta.client) {
    watch(
        tokenId,
        async (id) => {
            relatedRaw.value = [];
            if (!id) return;
            relatedPending.value = true;
            try {
                const res = await $fetch<CreditsResponse>(
                    `/api/v1/${network.value}/credits`,
                    {
                        baseURL: config.public.apiBaseUrl as string,
                        query: { tokenId: id, limit: 50 },
                    },
                );
                relatedRaw.value = res.data ?? [];
            } catch {
                relatedRaw.value = [];
            } finally {
                relatedPending.value = false;
            }
        },
        { immediate: true },
    );
}

// ─── Supply/minted difference warning tooltip ─────────────────────────────────

const warnTooltipVisible = ref(false);
const warnTriggerRef = ref<HTMLElement | null>(null);
const warnTooltipStyle = ref<Record<string, string>>({});

function onWarnEnter() {
    if (!warnTriggerRef.value) return;
    const rect = warnTriggerRef.value.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const tooltipMaxWidth = 240;
    let left = rect.left + rect.width / 2;
    if (left - tooltipMaxWidth / 2 < 8) left = tooltipMaxWidth / 2 + 8;
    if (left + tooltipMaxWidth / 2 > viewportWidth - 8) left = viewportWidth - tooltipMaxWidth / 2 - 8;
    warnTooltipStyle.value = {
        position: 'fixed',
        left: `${left}px`,
        top: `${rect.top - 8}px`,
        transform: 'translateX(-50%) translateY(-100%)',
        zIndex: '9999',
    };
    warnTooltipVisible.value = true;
}

function onWarnLeave() {
    warnTooltipVisible.value = false;
}

// ─── VcJsonViewer ─────────────────────────────────────────────────────────────

const vcViewerOpen = ref(false);
const vcViewerTitle = ref('');
const vcViewerData = ref<Record<string, any> | null>(null);

function viewRawVc(title: string, doc: Record<string, any> | null) {
    vcViewerTitle.value = title;
    vcViewerData.value = doc;
    vcViewerOpen.value = true;
}
</script>

<template>
    <!-- Page-wide skeleton — shown while fetching or resolving URL hash tab -->
    <div v-if="pending || !tabReady" class="space-y-6 p-6">
        <div class="space-y-3">
            <Skeleton class="h-4 w-36" />
            <Skeleton class="h-8 w-2/3" />
            <Skeleton class="h-4 w-1/3" />
        </div>
        <div class="rounded-xl border bg-card p-6 space-y-4">
            <Skeleton class="h-4 w-1/4" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-32 w-full" />
        </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!credit" class="p-6">
        <h1 class="text-xl font-bold text-foreground">{{ $t('credits.detail.notFound') }}</h1>
        <p class="text-sm text-muted-foreground mt-1">
            {{ $t('credits.detail.notFoundDesc', { tokenId, network }) }}
        </p>
    </div>

    <!-- Main content -->
    <div v-else class="space-y-6 p-6">
        <!-- Header -->
        <div class="space-y-3">
            <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                    <div class="flex items-center gap-3 flex-wrap">
                        <h1 class="text-2xl font-bold text-foreground">
                            {{ credit.name ?? credit.tokenId }}
                        </h1>
                        <span
                            v-if="credit.type"
                            :class="[
                                typeColor[credit.type] ?? 'bg-muted text-muted-foreground',
                                'text-xs font-medium rounded-full px-2.5 py-0.5',
                            ]"
                        >
                            {{ credit.type }}
                        </span>
                    </div>
                    <p v-if="credit.symbol" class="text-sm text-muted-foreground mt-1 font-mono">
                        {{ credit.symbol }}
                    </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <a
                        :href="hashscanTokenUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        <ExternalLink class="h-4 w-4 text-primary" />
                        {{ $t('common.viewOnExplorer') }}
                    </a>
                    <button
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        @click="viewRawVc(credit.name ?? credit.tokenId ?? tokenId, data)"
                    >
                        <FileJson class="h-4 w-4 text-primary" />
                        {{ $t('common.viewRawData') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Overview — always visible, outside tabs -->
        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="px-5 py-3.5 border-b bg-muted/30">
                <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Coins class="h-4 w-4 text-primary" />
                    {{ $t('credits.detail.overview') }}
                </h2>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {{ $t('credits.detail.tokenId') }}
                    </div>
                    <div class="text-sm font-medium text-foreground font-mono break-all">
                        {{ credit.tokenId ?? '—' }}
                    </div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {{ $t('credits.columns.symbol') }}
                    </div>
                    <div class="text-sm font-medium text-foreground font-mono">
                        {{ credit.symbol ?? '—' }}
                    </div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {{ $t('credits.columns.type') }}
                    </div>
                    <div class="text-sm font-medium text-foreground">
                        {{ credit.type ?? '—' }}
                    </div>
                </div>
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {{ $t('credits.detail.firstMintDate') }}
                    </div>
                    <div class="text-sm font-medium text-foreground">
                        {{ firstMintDate ? formatDate(firstMintDate) : '—' }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabbed card -->
        <div class="rounded-xl border bg-card overflow-hidden">
            <!-- Tab bar -->
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

            <!-- Details tab: Token Information + Related Issuances -->
            <div v-if="activeTab === 'details'" class="p-6 space-y-6">
                <!-- Token Information -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Coins class="h-4 w-4 text-primary" />
                            {{ $t('credits.detail.tokenInformation') }}
                            <span
                                v-if="hasDifference"
                                ref="warnTriggerRef"
                                class="inline-flex cursor-help"
                                @mouseenter="onWarnEnter"
                                @mouseleave="onWarnLeave"
                            >
                                <AlertTriangle class="h-3.5 w-3.5 text-amber-500" />
                                <Teleport to="body">
                                    <Transition
                                        enter-active-class="transition ease-out duration-100"
                                        enter-from-class="opacity-0 scale-95"
                                        enter-to-class="opacity-100 scale-100"
                                        leave-active-class="transition ease-in duration-75"
                                        leave-from-class="opacity-100"
                                        leave-to-class="opacity-0"
                                    >
                                        <div v-if="warnTooltipVisible" :style="warnTooltipStyle" class="pointer-events-none">
                                            <div class="max-w-[240px] rounded-md bg-foreground px-3 py-2 text-[11px] leading-relaxed text-background shadow-lg">
                                                {{ $t('credits.detail.supplyDifferenceTooltip') }}
                                            </div>
                                            <div class="mx-auto h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground" />
                                        </div>
                                    </Transition>
                                </Teleport>
                            </span>
                        </h2>
                    </div>
                    <div class="p-5">
                        <div class="grid grid-cols-2 gap-px bg-border rounded-lg overflow-hidden">
                            <div class="bg-card px-4 py-3">
                                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                    {{ $t('credits.detail.tokenSupply') }}
                                </div>
                                <div class="text-lg font-semibold text-foreground tabular-nums">
                                    {{ formatCredits(tokenSupply) }}
                                </div>
                            </div>
                            <div class="bg-card px-4 py-3">
                                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                    {{ $t('credits.detail.totalMinted') }}
                                </div>
                                <div class="text-lg font-semibold text-foreground tabular-nums">
                                    {{ formatCredits(totalMinted) }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Related Issuances -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Coins class="h-4 w-4 text-primary" />
                            {{ $t('credits.detail.relatedIssuances') }}
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">
                            {{ $t('credits.detail.relatedIssuancesSubtitle') }}
                        </p>
                    </div>
                    <div v-if="relatedPending" class="px-5 py-6 text-sm text-muted-foreground">
                        {{ $t('credits.detail.loading') }}
                    </div>
                    <div
                        v-else-if="related.length === 0"
                        class="px-5 py-6 text-sm text-muted-foreground"
                    >
                        {{ $t('credits.detail.noRelatedIssuances') }}
                    </div>
                    <div v-else class="divide-y">
                        <div
                            v-for="r in related"
                            :key="`${r.tokenId}-${r.projectId}`"
                            class="flex items-center justify-between px-5 py-3.5 gap-4"
                        >
                            <div class="min-w-0">
                                <div class="text-sm font-medium text-foreground truncate">
                                    {{ r.name ?? '—' }}
                                </div>
                                <div class="text-[11px] text-muted-foreground font-mono mt-0.5">
                                    {{ r.tokenId }}
                                </div>
                            </div>
                            <div class="text-right shrink-0">
                                <div class="text-sm font-semibold text-foreground tabular-nums">
                                    {{ formatCredits(r.supply) }}
                                </div>
                                <span
                                    v-if="r.type"
                                    :class="[
                                        typeColor[r.type] ?? '',
                                        'text-[10px] font-medium rounded-full px-1.5 py-0.5 mt-0.5 inline-block',
                                    ]"
                                >{{ r.type }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Provenance tab: Project + Methodology + Registry Links -->
            <div v-else-if="activeTab === 'provenance'" class="p-6 space-y-6">
                <!-- Project Links -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FolderKanban class="h-4 w-4 text-primary" />
                            {{ $t('credits.detail.project') }}
                        </h2>
                    </div>
                    <div class="px-5 py-4">
                        <NuxtLink
                            v-if="credit.projectId && credit.project"
                            :to="`/projects/${encodeURIComponent(credit.projectId)}`"
                            class="text-sm text-primary hover:underline transition-colors"
                        >
                            {{ credit.project }}
                        </NuxtLink>
                        <span v-else class="text-sm text-muted-foreground">{{ $t('credits.detail.noProject') }}</span>
                    </div>
                </div>

                <!-- Methodology Links -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FolderKanban class="h-4 w-4 text-primary" />
                            {{ $t('credits.detail.methodology') }}
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">
                            {{ $t('credits.detail.methodologySubtitle') }}
                        </p>
                    </div>
                    <div class="px-5 py-4">
                        <NuxtLink
                            v-if="credit.methodologyId && credit.methodology"
                            :to="`/methodologies/${encodeURIComponent(credit.methodologyId)}`"
                            class="text-sm text-primary hover:underline transition-colors"
                        >
                            {{ credit.methodology }}
                        </NuxtLink>
                        <span v-else class="text-sm text-muted-foreground">{{ $t('credits.detail.noMethodology') }}</span>
                    </div>
                </div>

                <!-- Registry Links -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FolderKanban class="h-4 w-4 text-primary" />
                            {{ $t('credits.detail.registry') }}
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">
                            {{ $t('credits.detail.registrySubtitle') }}
                        </p>
                    </div>
                    <div class="px-5 py-4">
                        <NuxtLink
                            v-if="credit.registryDid && credit.registry"
                            :to="`/registries/${encodeURIComponent(credit.registryDid)}`"
                            class="text-sm text-primary hover:underline transition-colors"
                        >
                            {{ credit.registry }}
                        </NuxtLink>
                        <span v-else class="text-sm text-muted-foreground">{{ $t('credits.detail.noRegistry') }}</span>
                    </div>
                </div>
            </div>

        </div>

        <VcJsonViewer
            :open="vcViewerOpen"
            :title="vcViewerTitle"
            :data="vcViewerData"
            @close="vcViewerOpen = false"
        />
    </div>
</template>
