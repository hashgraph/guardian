<script setup lang="ts">
import {
    Coins, Receipt, Link as LinkIcon, Shield, Hash, Layers,
    AlertTriangle, CheckCircle2, ExternalLink, Copy, Check,
} from 'lucide-vue-next';
import type { IssuanceSummary, IssuanceTokenInfo, SerialRange, RelatedIssuance } from '~/types/models';
import { formatCredits, formatNumber, formatDate } from '~/lib/format';
import { useIssuanceApi } from '~/composables/api/useIssuanceApi';

/**
 * One issuance — a single Guardian mint credential.
 *
 * Keyed on the mint's consensus timestamp rather than a token id: a token
 * routinely carries several mint events, so a token-keyed URL cannot name an
 * issuance. Each tab fetches its own data, so the page paints from the small
 * summary instead of waiting on the heaviest query.
 *
 * Layout follows the registry/methodology detail pages: stat cards, a bare tab
 * bar, then one top-level card per section — never a card nested inside a card.
 */
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { network } = useNetwork();
const api = useIssuanceApi();

const mintTimestamp = computed(() => route.params.mintTimestamp as string);

const { data: summary, pending } = useAsyncData<IssuanceSummary | null>(
    () => `issuance:${network.value}:${mintTimestamp.value}`,
    () => api.fetchSummary(network.value, mintTimestamp.value),
    { watch: [network, mintTimestamp], default: () => null },
);

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = 'summary' | 'transactions' | 'token' | 'advanced';
const VALID_TABS = new Set<TabKey>(['summary', 'transactions', 'token', 'advanced']);

const activeTab = ref<TabKey>('summary');

onMounted(() => {
    const h = (route.hash?.replace('#', '') ?? '') as TabKey;
    if (VALID_TABS.has(h)) activeTab.value = h;
});

function setTab(key: TabKey) {
    activeTab.value = key;
    router.replace({ query: route.query, hash: key === 'summary' ? '' : `#${key}` });
}

const tabs = computed(() => [
    { key: 'summary'      as TabKey, label: t('issuances.tabs.summary'),      icon: Coins },
    { key: 'transactions' as TabKey, label: t('issuances.tabs.transactions'), icon: Receipt },
    { key: 'token'        as TabKey, label: t('issuances.tabs.token'),        icon: LinkIcon },
    { key: 'advanced'     as TabKey, label: t('issuances.tabs.advanced'),     icon: Shield },
]);

// ─── Copy-to-clipboard, matching the registry Advanced tab ────────────────────

const copiedValue = ref<string | null>(null);
async function copyValue(val: string) {
    try {
        await navigator.clipboard.writeText(val);
        copiedValue.value = val;
        setTimeout(() => { if (copiedValue.value === val) copiedValue.value = null; }, 2000);
    } catch { /* clipboard unavailable — the value is still selectable */ }
}

// ─── Computed ─────────────────────────────────────────────────────────────────

const typeColor: Record<string, string> = {
    Fungible: 'bg-stat-blue/10 text-stat-blue',
    'Non-Fungible': 'bg-stat-amber/10 text-stat-amber',
};

const isNonFungible = computed(() => summary.value?.tokenType === 'NON_FUNGIBLE_UNIQUE');
const typeLabel = computed(() => (isNonFungible.value ? 'Non-Fungible' : 'Fungible'));
const isVerified = computed(() => summary.value?.mintMatchStatus === 'verified');

/** Reads the mismatch out loud rather than leaving the reader to subtract. */
const mismatchMessage = computed(() => {
    const s = summary.value;
    if (!s) return null;
    switch (s.mintMatchStatus) {
        case 'mismatch':
            return t('issuances.status.mismatch', {
                declared: s.declaredAmount !== null ? formatNumber(s.declaredAmount) : '—',
                minted: s.mintedAmount !== null ? formatNumber(s.mintedAmount) : '—',
                direction: (s.mintedAmount ?? 0) > (s.declaredAmount ?? 0)
                    ? t('issuances.status.more')
                    : t('issuances.status.fewer'),
            });
        case 'unmatched': return t('issuances.status.unmatched');
        case 'ambiguous': return t('issuances.status.ambiguous');
        case 'verified': return null;
        default: return t('issuances.status.pending');
    }
});

const hashscanTokenUrl = computed(() =>
    summary.value?.tokenId ? `https://hashscan.io/${network.value}/token/${summary.value.tokenId}` : null,
);
const hashscanPolicyUrl = computed(() =>
    tokenInfo.value?.policyTopicId ? `https://hashscan.io/${network.value}/topic/${tokenInfo.value.policyTopicId}` : null,
);

/**
 * Both the mint credential and its VP are HCS messages, so their consensus
 * timestamps resolve to CONSENSUSSUBMITMESSAGE transactions — HashScan takes a
 * consensus timestamp directly on its transaction route. Verified against
 * Mirror Node for both before linking.
 */
const hashscanTx = (consensusTimestamp: string | null) =>
    consensusTimestamp ? `https://hashscan.io/${network.value}/transaction/${consensusTimestamp}` : null;

// ─── Token information (own request; the heavier half of the page) ────────────

const tokenInfo = ref<IssuanceTokenInfo | null>(null);
watch([network, mintTimestamp], async () => {
    tokenInfo.value = await api.fetchTokenInfo(network.value, mintTimestamp.value);
}, { immediate: true });

// ─── Serial ranges ────────────────────────────────────────────────────────────

const serialPage = ref(1);
const serialPageSize = ref(10);
const serialRanges = ref<SerialRange[]>([]);
const serialTotals = ref({ total: 0, active: 0, retired: 0, ranges: 0 });
const serialsPending = ref(false);

async function loadSerials(): Promise<void> {
    if (!isNonFungible.value) { serialRanges.value = []; return; }
    serialsPending.value = true;
    try {
        const res = await api.fetchSerials(network.value, mintTimestamp.value, serialPage.value, serialPageSize.value);
        serialRanges.value = res?.data ?? [];
        serialTotals.value = {
            total: res?.totalSerials ?? 0,
            active: res?.activeCount ?? 0,
            retired: res?.retiredCount ?? 0,
            ranges: res?.meta?.total ?? 0,
        };
    } finally {
        serialsPending.value = false;
    }
}
const serialTotalPages = computed(() => Math.max(1, Math.ceil(serialTotals.value.ranges / serialPageSize.value)));
watch([serialPage, serialPageSize], loadSerials);
watch([isNonFungible, mintTimestamp], () => { serialPage.value = 1; loadSerials(); }, { immediate: true });

const rangeLabel = (r: SerialRange) => (r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`);

// ─── Related issuances of the same token ──────────────────────────────────────

const relatedPage = ref(1);
const relatedPageSize = ref(10);
const related = ref<RelatedIssuance[]>([]);
const relatedTotal = ref(0);

async function loadRelated(): Promise<void> {
    const res = await api.fetchRelatedIssuances(network.value, mintTimestamp.value, relatedPage.value, relatedPageSize.value);
    related.value = res?.data ?? [];
    relatedTotal.value = res?.meta?.total ?? 0;
}
const relatedTotalPages = computed(() => Math.max(1, Math.ceil(relatedTotal.value / relatedPageSize.value)));
watch([relatedPage, relatedPageSize], loadRelated);
watch([network, mintTimestamp], () => { relatedPage.value = 1; loadRelated(); }, { immediate: true });

useHead(() => ({
    title: summary.value
        ? `${summary.value.tokenName ?? summary.value.tokenId ?? t('issuances.title')} — ${t('issuances.title')}`
        : t('issuances.title'),
}));
</script>

<template>
    <!-- Page-wide skeleton -->
    <div v-if="pending" class="space-y-6 p-6">
        <div class="space-y-3">
            <Skeleton class="h-4 w-36" />
            <Skeleton class="h-8 w-2/3" />
            <Skeleton class="h-4 w-1/3" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton class="h-28 w-full" />
            <Skeleton class="h-28 w-full" />
            <Skeleton class="h-28 w-full" />
        </div>
        <div class="rounded-xl border bg-card p-6 space-y-4">
            <Skeleton class="h-4 w-1/4" />
            <Skeleton class="h-32 w-full" />
        </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!summary" class="p-6">
        <h1 class="text-xl font-bold text-foreground">{{ $t('issuances.notFound') }}</h1>
        <p class="text-sm text-muted-foreground mt-1">{{ $t('issuances.notFoundDesc', { id: mintTimestamp }) }}</p>
        <AppLink to="/credits" class="mt-4 inline-block text-sm text-primary hover:underline">
            {{ $t('issuances.backToList') }}
        </AppLink>
    </div>

    <!-- Main content -->
    <div v-else class="space-y-6 p-6">
        <!-- Header -->
        <div class="space-y-3">
            <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                    <div class="flex items-center gap-3 flex-wrap">
                        <h1 class="text-2xl font-bold text-foreground">
                            {{ summary.tokenName ?? summary.tokenId ?? '—' }}
                        </h1>
                        <span
                            :class="[typeColor[typeLabel] ?? 'bg-muted text-muted-foreground',
                                     'text-xs font-medium rounded-full px-2.5 py-0.5']"
                        >{{ $t('credits.tokenTypes.' + typeLabel) }}</span>
                        <span
                            :class="[isVerified ? 'bg-stat-green/10 text-stat-green' : 'bg-stat-amber/10 text-stat-amber',
                                     'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5']"
                        >
                            <component :is="isVerified ? CheckCircle2 : AlertTriangle" class="h-3 w-3" />
                            {{ $t('issuances.statusLabels.' + (summary.mintMatchStatus ?? 'pending')) }}
                        </span>
                    </div>
                    <p class="text-sm text-muted-foreground mt-1">
                        <span v-if="summary.tokenSymbol" class="font-mono">{{ summary.tokenSymbol }}</span>
                        <span v-if="summary.tokenSymbol && summary.mintDate" class="mx-2">·</span>
                        <span v-if="summary.mintDate">{{ $t('issuances.mintedOn', { date: formatDate(summary.mintDate) }) }}</span>
                    </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <a
                        v-if="hashscanTokenUrl"
                        :href="hashscanTokenUrl" target="_blank" rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        <ExternalLink class="h-4 w-4 text-primary" />
                        {{ $t('common.viewOnExplorer') }}
                    </a>
                </div>
            </div>
        </div>

        <!-- Headline stat cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="group rounded-xl border bg-card px-5 py-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-border/80">
                <div class="flex items-center justify-between mb-3">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {{ $t('issuances.declared') }}
                    </div>
                    <div class="rounded-lg bg-primary/10 p-1.5 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-3">
                        <Receipt class="h-3.5 w-3.5 text-primary" />
                    </div>
                </div>
                <div class="text-2xl font-bold text-foreground tabular-nums">
                    {{ summary.declaredAmount !== null ? formatCredits(summary.declaredAmount) : '—' }}
                </div>
                <p class="text-xs text-muted-foreground mt-1">{{ $t('issuances.declaredSub') }}</p>
            </div>

            <div class="group rounded-xl border bg-card px-5 py-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-border/80">
                <div class="flex items-center justify-between mb-3">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {{ $t('issuances.mintedOnChain') }}
                    </div>
                    <div class="rounded-lg bg-primary/10 p-1.5 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-3">
                        <Coins class="h-3.5 w-3.5 text-primary" />
                    </div>
                </div>
                <div
                    class="text-2xl font-bold tabular-nums"
                    :class="isVerified ? 'text-foreground' : 'text-stat-amber'"
                >
                    {{ summary.mintedAmount !== null ? formatCredits(summary.mintedAmount) : $t('issuances.notReconciled') }}
                </div>
                <p class="text-xs text-muted-foreground mt-1">{{ $t('issuances.mintedOnChainSub') }}</p>
            </div>

            <div class="group rounded-xl border bg-card px-5 py-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-border/80">
                <div class="flex items-center justify-between mb-3">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {{ $t('issuances.status.label') }}
                    </div>
                    <div class="rounded-lg bg-primary/10 p-1.5 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-3">
                        <component :is="isVerified ? CheckCircle2 : AlertTriangle" class="h-3.5 w-3.5 text-primary" />
                    </div>
                </div>
                <div class="text-2xl font-bold text-foreground">
                    {{ $t('issuances.statusLabels.' + (summary.mintMatchStatus ?? 'pending')) }}
                </div>
                <p class="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {{ mismatchMessage ?? $t('issuances.status.verifiedSub') }}
                </p>
            </div>
        </div>

        <!-- Tab navigation -->
        <div class="border-b bg-muted/30">
            <nav class="flex gap-0 -mb-px overflow-x-auto">
                <button
                    v-for="tab in tabs"
                    :key="tab.key"
                    :class="[
                        activeTab === tab.key
                            ? 'border-primary text-primary bg-card'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                        'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                    ]"
                    @click="setTab(tab.key)"
                >
                    <component :is="tab.icon" class="h-4 w-4" />
                    {{ tab.label }}
                </button>
            </nav>
        </div>

        <!-- ── Tab: Summary ─────────────────────────────────────────────── -->
        <div v-if="activeTab === 'summary'" class="space-y-6">
            <!-- Issuance linkage -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <LinkIcon class="h-4 w-4 text-primary" />
                        {{ $t('issuances.linkageTitle') }}
                    </h2>
                </div>
                <!--
                    A mint credential that no project claims is common, not an
                    error: the credential is real and its amount is real, but
                    nothing tied it to a project, so it contributes to no
                    project's totals. Say that instead of showing three dashes.
                -->
                <div
                    v-if="!summary.projectId"
                    class="mx-5 mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
                >
                    <LinkIcon class="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p class="text-xs leading-relaxed text-muted-foreground">
                        {{ $t('issuances.unlinked') }}
                    </p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border">
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{{ $t('issuances.project') }}</div>
                        <AppLink
                            v-if="summary.projectId"
                            :to="`/projects/${encodeURIComponent(summary.projectId)}`"
                            class="text-sm text-primary hover:underline break-all"
                        >{{ summary.projectName ?? summary.projectId }}</AppLink>
                        <span v-else class="text-sm text-muted-foreground">—</span>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{{ $t('issuances.methodology') }}</div>
                        <AppLink
                            v-if="summary.methodologyId"
                            :to="`/methodologies/${encodeURIComponent(summary.methodologyId)}`"
                            class="text-sm text-primary hover:underline break-all"
                        >{{ summary.methodologyName ?? summary.methodologyId }}</AppLink>
                        <span v-else class="text-sm text-muted-foreground">—</span>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{{ $t('issuances.registry') }}</div>
                        <AppLink
                            v-if="summary.registryDid"
                            :to="`/registries/${encodeURIComponent(summary.registryDid)}`"
                            class="text-sm text-primary hover:underline break-all"
                        >{{ summary.registryName ?? summary.registryDid }}</AppLink>
                        <span v-else class="text-sm text-muted-foreground">—</span>
                    </div>
                </div>
            </div>

            <!-- Serials -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between gap-3">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Hash class="h-4 w-4 text-primary" />
                        {{ $t('issuances.serials.title') }}
                        <InfoTooltip :text="$t('issuances.serials.rangeTooltip')" />
                    </h2>
                    <span v-if="isNonFungible" class="text-xs text-muted-foreground">
                        {{ $t('issuances.serials.summary', {
                            total: formatNumber(serialTotals.total),
                            active: formatNumber(serialTotals.active),
                            retired: formatNumber(serialTotals.retired),
                        }) }}
                    </span>
                </div>

                <div v-if="!isNonFungible" class="px-5 py-10 text-center">
                    <Hash class="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p class="mt-2 text-sm font-medium text-foreground">{{ $t('issuances.serials.fungibleTitle') }}</p>
                    <p class="mt-1 text-xs text-muted-foreground max-w-md mx-auto">{{ $t('issuances.serials.fungible') }}</p>
                </div>
                <div v-else-if="serialsPending" class="px-5 py-10 text-center text-sm text-muted-foreground">
                    {{ $t('common.loading') }}
                </div>
                <div v-else-if="serialRanges.length === 0" class="px-5 py-10 text-center">
                    <Hash class="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p class="mt-2 text-sm font-medium text-foreground">{{ $t('issuances.serials.emptyTitle') }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{{ $t('issuances.serials.empty') }}</p>
                </div>
                <template v-else>
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b bg-muted/20">
                                <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('issuances.serials.range') }}</th>
                                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('issuances.serials.count') }}</th>
                                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('issuances.serials.state') }}</th>
                                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    <span class="inline-flex items-start gap-1">
                                        {{ $t('issuances.serials.holder') }}
                                        <span class="mt-0.5 shrink-0"><InfoTooltip :text="$t('issuances.serials.holderTooltip')" /></span>
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <tr v-for="r in serialRanges" :key="`${r.from}-${r.to}-${r.accountId ?? ''}`" class="hover:bg-muted/30 transition-colors">
                                <td class="py-3 px-5 font-mono text-xs text-foreground">{{ rangeLabel(r) }}</td>
                                <td class="py-3 px-4 text-right tabular-nums font-medium">{{ formatNumber(r.count) }}</td>
                                <td class="py-3 px-4">
                                    <span
                                        :class="[r.deleted ? 'bg-stat-rose/10 text-stat-rose' : 'bg-stat-green/10 text-stat-green',
                                                 'text-xs font-medium rounded-full px-2 py-0.5']"
                                    >{{ $t(r.deleted ? 'issuances.serials.retired' : 'issuances.serials.active') }}</span>
                                </td>
                                <td class="py-3 px-4">
                                    <div v-if="r.accountId" class="flex items-center gap-2">
                                        <code class="text-xs font-mono text-foreground">{{ r.accountId }}</code>
                                        <button :title="$t('common.copy')" @click="copyValue(r.accountId!)">
                                            <Check v-if="copiedValue === r.accountId" class="h-3.5 w-3.5 text-emerald-500" />
                                            <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                        </button>
                                    </div>
                                    <span v-else class="text-xs text-muted-foreground">
                                        {{ $t(r.deleted ? 'issuances.serials.holderRetired' : 'issuances.serials.holderUnknown') }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="border-t px-5 pb-3">
                        <Pagination
                            v-model:current-page="serialPage"
                            v-model:page-size="serialPageSize"
                            :total-pages="serialTotalPages"
                            :total-items="serialTotals.ranges"
                        />
                    </div>
                </template>
            </div>
        </div>

        <!-- ── Tab: Transactions ────────────────────────────────────────── -->
        <div v-else-if="activeTab === 'transactions'" class="space-y-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Receipt class="h-4 w-4 text-primary" />
                        {{ $t('issuances.transactions.title') }}
                        <InfoTooltip :text="$t('projects.detail.lifecycle.batchTooltip')" />
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('issuances.transactions.subtitle') }}</p>
                </div>
                <!--
                    No blanket retirement notice here. Credits destroyed without
                    the registry's retirement contract used to have no row at
                    all, which needed explaining; they are now listed as
                    Retirements dated by the credits' last movement, each marked
                    inside or outside Guardian in its own tooltip. A banner
                    saying retirements do not appear would contradict the table
                    directly beneath it.
                -->
                <!-- projectId stays null: the issuance-scoped route serves mints
                     that were never attributed to a project, which most are. -->
                <CreditTransactions
                    :project-id="null"
                    :mint-timestamp="mintTimestamp"
                    :page-size="10"
                />
            </div>
        </div>

        <!-- ── Tab: Token Information ───────────────────────────────────── -->
        <div v-else-if="activeTab === 'token'" class="space-y-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Coins class="h-4 w-4 text-primary" />
                        {{ $t('credits.detail.tokenInformation') }}
                    </h2>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                            {{ $t('credits.detail.tokenSupply') }}
                            <InfoTooltip :text="$t('issuances.token.supplyTooltip')" />
                        </div>
                        <div class="text-lg font-semibold text-foreground tabular-nums">
                            {{ tokenInfo && tokenInfo.tokenSupply !== null ? formatCredits(tokenInfo.tokenSupply) : '—' }}
                        </div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('credits.detail.totalMintedAll') }}
                        </div>
                        <div class="text-lg font-semibold text-foreground tabular-nums">
                            {{ tokenInfo ? formatCredits(tokenInfo.totalMintedAllProjects) : '—' }}
                        </div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('credits.detail.totalMintedProject') }}
                        </div>
                        <div class="text-lg font-semibold text-foreground tabular-nums">
                            {{ tokenInfo ? formatCredits(tokenInfo.totalMintedThisProject) : '—' }}
                        </div>
                    </div>
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('issuances.token.issuanceCount') }}
                        </div>
                        <div class="text-lg font-semibold text-foreground tabular-nums">
                            {{ tokenInfo ? formatNumber(tokenInfo.issuanceCount) : '—' }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Related token issuances -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Receipt class="h-4 w-4 text-primary" />
                        {{ $t('issuances.token.relatedIssuances') }}
                    </h2>
                    <span class="text-xs text-muted-foreground">{{ formatNumber(relatedTotal) }}</span>
                </div>
                <div v-if="related.length === 0" class="px-5 py-10 text-center">
                    <Receipt class="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p class="mt-2 text-sm font-medium text-foreground">{{ $t('issuances.token.relatedIssuancesEmptyTitle') }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{{ $t('issuances.token.relatedIssuancesEmpty') }}</p>
                </div>
                <template v-else>
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b bg-muted/20">
                                <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.mintDate') }}</th>
                                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.declaredAmount') }}</th>
                                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.mintedOnChain') }}</th>
                                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('issuances.project') }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <tr
                                v-for="r in related" :key="r.mintConsensusTimestamp"
                                class="hover:bg-muted/30 transition-colors cursor-pointer"
                                @click="navigateTo(`/issuances/${encodeURIComponent(r.mintConsensusTimestamp)}`)"
                            >
                                <td class="py-3 px-5 text-muted-foreground">{{ r.mintDate ? formatDate(r.mintDate) : '—' }}</td>
                                <td class="py-3 px-4 text-right tabular-nums text-muted-foreground">{{ r.declaredAmount !== null ? formatCredits(r.declaredAmount) : '—' }}</td>
                                <td class="py-3 px-4 text-right tabular-nums font-medium">{{ r.mintedAmount !== null ? formatCredits(r.mintedAmount) : '—' }}</td>
                                <td class="py-3 px-4 text-xs break-all">{{ r.projectName ?? r.projectId ?? '—' }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="border-t px-5 pb-3">
                        <Pagination
                            v-model:current-page="relatedPage"
                            v-model:page-size="relatedPageSize"
                            :total-pages="relatedTotalPages"
                            :total-items="relatedTotal"
                        />
                    </div>
                </template>
            </div>

            <!-- Projects sharing this token -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Layers class="h-4 w-4 text-primary" />
                        {{ $t('issuances.token.relatedProjects') }}
                    </h2>
                    <InfoTooltip :text="$t('issuances.token.relatedProjectsTooltip')" />
                </div>
                <div v-if="!tokenInfo?.relatedProjects?.length" class="px-5 py-10 text-center">
                    <Layers class="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p class="mt-2 text-sm font-medium text-foreground">{{ $t('issuances.token.relatedProjectsEmptyTitle') }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{{ $t('issuances.token.relatedProjectsEmpty') }}</p>
                </div>
                <ul v-else class="divide-y">
                    <li v-for="p in tokenInfo.relatedProjects" :key="p.projectId" class="px-5 py-3 hover:bg-muted/30 transition-colors">
                        <AppLink :to="`/projects/${encodeURIComponent(p.projectId)}`" class="text-sm text-primary hover:underline break-all">
                            {{ p.projectName ?? p.projectId }}
                        </AppLink>
                    </li>
                </ul>
            </div>
        </div>

        <!-- ── Tab: Advanced ────────────────────────────────────────────── -->
        <div v-else-if="activeTab === 'advanced'" class="space-y-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="px-5 py-3.5 border-b bg-muted/30">
                    <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Shield class="h-4 w-4 text-primary" />
                        {{ $t('issuances.advanced.title') }}
                    </h2>
                    <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('issuances.advanced.subtitle') }}</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                    <!-- Token ID -->
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('credits.detail.advanced.mintTokenId') }}
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <code class="text-sm font-mono text-foreground">{{ summary.tokenId ?? '—' }}</code>
                            <button v-if="summary.tokenId" :title="$t('common.copy')" @click="copyValue(summary.tokenId)">
                                <Check v-if="copiedValue === summary.tokenId" class="h-3.5 w-3.5 text-emerald-500" />
                                <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </button>
                            <a
                                v-if="hashscanTokenUrl"
                                :href="hashscanTokenUrl" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                <ExternalLink class="h-3 w-3" />
                                {{ $t('common.viewOnHashScan') }}
                            </a>
                        </div>
                    </div>

                    <!-- Token policy topic -->
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('credits.detail.advanced.tokenPolicy') }}
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <code class="text-sm font-mono text-foreground">{{ tokenInfo?.policyTopicId ?? '—' }}</code>
                            <button v-if="tokenInfo?.policyTopicId" :title="$t('common.copy')" @click="copyValue(tokenInfo.policyTopicId)">
                                <Check v-if="copiedValue === tokenInfo.policyTopicId" class="h-3.5 w-3.5 text-emerald-500" />
                                <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </button>
                            <a
                                v-if="hashscanPolicyUrl"
                                :href="hashscanPolicyUrl" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                <ExternalLink class="h-3 w-3" />
                                {{ $t('common.viewOnHashScan') }}
                            </a>
                        </div>
                    </div>

                    <!-- Token created date -->
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('credits.detail.advanced.tokenCreatedDate') }}
                        </div>
                        <div class="text-sm text-foreground">
                            {{ tokenInfo?.tokenCreatedDate ? formatDate(tokenInfo.tokenCreatedDate) : '—' }}
                        </div>
                    </div>

                    <!-- Mint VP timestamp -->
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                            {{ $t('issuances.vpTimestamp') }}
                            <InfoTooltip :text="$t('issuances.vpTimestampTooltip')" />
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <code class="text-sm font-mono text-foreground">{{ summary.vpConsensusTimestamp ?? '—' }}</code>
                            <button v-if="summary.vpConsensusTimestamp" :title="$t('common.copy')" @click="copyValue(summary.vpConsensusTimestamp)">
                                <Check v-if="copiedValue === summary.vpConsensusTimestamp" class="h-3.5 w-3.5 text-emerald-500" />
                                <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </button>
                            <a
                                v-if="hashscanTx(summary.vpConsensusTimestamp)"
                                :href="hashscanTx(summary.vpConsensusTimestamp)!" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                <ExternalLink class="h-3 w-3" />
                                {{ $t('common.viewOnHashScan') }}
                            </a>
                        </div>
                    </div>

                    <!-- Mint credential timestamp -->
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                            {{ $t('issuances.mintTimestamp') }}
                            <InfoTooltip :text="$t('issuances.mintTimestampTooltip')" />
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <code class="text-sm font-mono text-foreground">{{ summary.mintConsensusTimestamp }}</code>
                            <button :title="$t('common.copy')" @click="copyValue(summary.mintConsensusTimestamp)">
                                <Check v-if="copiedValue === summary.mintConsensusTimestamp" class="h-3.5 w-3.5 text-emerald-500" />
                                <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </button>
                            <a
                                :href="hashscanTx(summary.mintConsensusTimestamp)!" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                <ExternalLink class="h-3 w-3" />
                                {{ $t('common.viewOnHashScan') }}
                            </a>
                        </div>
                    </div>

                    <!-- Issuer DID -->
                    <div class="bg-card px-5 py-4">
                        <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {{ $t('credits.detail.advanced.issueDid') }}
                        </div>
                        <div class="flex items-start gap-2 flex-wrap">
                            <code class="text-sm font-mono text-foreground break-all">{{ tokenInfo?.issuerDid ?? '—' }}</code>
                            <button v-if="tokenInfo?.issuerDid" :title="$t('common.copy')" class="mt-0.5" @click="copyValue(tokenInfo.issuerDid)">
                                <Check v-if="copiedValue === tokenInfo.issuerDid" class="h-3.5 w-3.5 text-emerald-500" />
                                <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
