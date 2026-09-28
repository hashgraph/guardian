<script setup lang="ts">
import { Coins, FileJson, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-vue-next';
import type { SingleSelectOption } from '~/components/shared/SingleSelect.vue';
import type { Project, Credit, IssuanceEvent, MintSerials } from '~/types/models';
import { useMintSerials } from '~/composables/api/useProjectsApi';
import { formatNumber } from '~/lib/format';
import { formatDate } from '~/lib/format';

const props = defineProps<{
    project: Project;
}>();

const emit = defineEmits<{
    (e: 'view-vc', payload: Credit): void;
}>();

// Per-mint-event issuance history (new path)
const events = computed(() => props.project.issuanceEvents ?? []);

// Client-side mint-year filter over the event rows
const yearFilter = ref('all');
const availableYears = computed<number[]>(() => {
    const years = new Set<number>();
    for (const e of events.value) {
        if (!e.mintDate) continue;
        const y = new Date(e.mintDate).getFullYear();
        if (!isNaN(y)) years.add(y);
    }
    return [...years].sort((a, b) => b - a);
});
const filteredEvents = computed(() =>
    yearFilter.value === 'all'
        ? events.value
        : events.value.filter(e => e.mintDate && new Date(e.mintDate).getFullYear() === Number(yearFilter.value)),
);

// Per-token aggregate totals (derived from issuances — existing logic)
const linkedCredits = computed<Credit[]>(() => {
    if (!props.project.issuances?.length) return [];
    return props.project.issuances.map(i => ({
        id: i.tokenId,
        tokenId: i.tokenId,
        name: i.name ?? '',
        symbol: i.symbol ?? '',
        type: (i.type === 'FUNGIBLE_COMMON' ? 'Fungible' : 'Non-Fungible') as 'Fungible' | 'Non-Fungible',
        supply: i.supply,
        projectId: props.project.id,
        registry: props.project.registry,
        mintDate: i.mintDate ?? '',
        rawVc: i.rawVc ?? undefined,
    }));
});

// Header badge count: prefer (filtered) events length, fall back to per-token count
const badgeCount = computed(() =>
    events.value.length > 0 ? filteredEvents.value.length : linkedCredits.value.length,
);

const currentPage = ref(1);
const pageSize = ref(10);
const totalPages = computed(() => Math.max(1, Math.ceil(badgeCount.value / pageSize.value)));
const paginatedEvents = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredEvents.value.slice(start, start + pageSize.value);
});
const paginatedCredits = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return linkedCredits.value.slice(start, start + pageSize.value);
});
watch([() => props.project.id, filteredEvents, linkedCredits], () => { currentPage.value = 1; });

function eventTypeLabel(type: string | null): 'Fungible' | 'Non-Fungible' {
    return type === 'NON_FUNGIBLE_UNIQUE' ? 'Non-Fungible' : 'Fungible';
}

function makeEventCredit(e: {
    mintConsensusTimestamp: string;
    tokenId: string | null;
    name: string | null;
    symbol: string | null;
    type: string | null;
    amount: number | null;
    mintDate: string | null;
    rawVc: Record<string, any> | null;
}): Credit {
    return {
        id: e.mintConsensusTimestamp,
        tokenId: e.tokenId ?? '',
        name: e.name ?? '',
        symbol: e.symbol ?? '',
        type: eventTypeLabel(e.type),
        supply: e.amount ?? 0,
        projectId: props.project.id,
        registry: props.project.registry,
        mintDate: e.mintDate ?? '',
        rawVc: e.rawVc ?? undefined,
    };
}

const { t } = useI18n();
const yearOptions = computed<SingleSelectOption[]>(() => [
    { value: 'all', label: t('common.allYears') },
    ...availableYears.value.map(y => ({ value: String(y), label: String(y) })),
]);

// ── Declared vs actually minted ────────────────────────────────────────────
// The MintToken credential states an intent; the ledger records what happened.
// They diverge when a mint partially fails, so both are shown rather than
// silently preferring one.
function isReconciled(e: IssuanceEvent): boolean {
    return e.mintMatchStatus === 'verified';
}

/** Explains, in plain terms, why an issuance is not simply "verified". */
function statusMessage(e: IssuanceEvent): string | null {
    switch (e.mintMatchStatus) {
        case 'mismatch':
            return t('projects.detail.issuances.status.mismatch', {
                declared: e.amount !== null ? formatNumber(e.amount) : '—',
                minted: e.mintedAmount !== null ? formatNumber(e.mintedAmount) : '—',
            });
        case 'unmatched':
            return t('projects.detail.issuances.status.unmatched');
        case 'ambiguous':
            return t('projects.detail.issuances.status.ambiguous');
        case 'verified':
            return null;
        default:
            return t('projects.detail.issuances.status.pending');
    }
}

// ── Serial drill-down ──────────────────────────────────────────────────────
// Loaded per row on demand: a single issuance can carry tens of thousands of
// serials, and only non-fungible mints have them at all.
const { network } = useNetwork();
const loadMintSerials = useMintSerials();
const expanded = ref<string | null>(null);
const serialsByMint = ref<Record<string, MintSerials | null>>({});
const loadingSerials = ref<string | null>(null);

function hasSerials(e: IssuanceEvent): boolean {
    return eventTypeLabel(e.type) === 'Non-Fungible' && (e.serialCount ?? 0) > 0;
}

async function toggleSerials(e: IssuanceEvent): Promise<void> {
    if (expanded.value === e.mintConsensusTimestamp) {
        expanded.value = null;
        return;
    }
    expanded.value = e.mintConsensusTimestamp;
    if (serialsByMint.value[e.mintConsensusTimestamp] !== undefined) return;

    loadingSerials.value = e.mintConsensusTimestamp;
    try {
        serialsByMint.value[e.mintConsensusTimestamp] = await loadMintSerials(
            network.value,
            props.project.id,
            e.mintConsensusTimestamp,
        );
    } finally {
        // Always clear, even if the request throws — otherwise the row is stuck
        // on "Loading…" with no way back.
        loadingSerials.value = null;
    }
}

/** Ranges arrive pre-collapsed from the API — the client no longer receives one
 *  entry per serial, so there is nothing left to compress here. */
function rangeLabel(r: { from: number; to: number }): string {
    return r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`;
}
</script>

<template>
    <div class="rounded-xl border bg-card overflow-hidden">
        <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <Coins class="h-4 w-4 text-primary" />
                {{ $t('methodologies.detail.analytics.linkedIssuances') }}
            </h2>
            <div class="flex items-center gap-2">
                <SingleSelect
                    v-if="availableYears.length > 0"
                    v-model="yearFilter"
                    :options="yearOptions"
                    highlight-active
                    class="w-32"
                />
                <span class="text-xs text-muted-foreground">{{ $t('methodologies.detail.analytics.issuanceCount', { count: badgeCount }) }}</span>
            </div>
        </div>

        <!-- PRIMARY: per-mint-event issuance history -->
        <template v-if="events.length > 0">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b bg-muted/20">
                        <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.mintDate') }}</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.token') }}</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.analytics.table.tokenId') }}</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.type') }}</th>
                        <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span class="inline-flex items-start justify-end gap-1">{{ $t('credits.columns.declaredAmount') }} <span class="mt-0.5 shrink-0"><InfoTooltip :text="$t('credits.tooltips.declaredAmount')" /></span></span>
                        </th>
                        <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span class="inline-flex items-start justify-end gap-1">{{ $t('credits.columns.mintedOnChain') }} <span class="mt-0.5 shrink-0"><InfoTooltip :text="$t('credits.tooltips.mintedOnChain')" /></span></span>
                        </th>
                        <th class="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span class="inline-flex items-start gap-1">{{ $t('credits.columns.rawData') }} <span class="mt-0.5 shrink-0"><InfoTooltip :text="$t('projects.detail.vcs.rawVcTooltip')" /></span></span>
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    <template v-for="e in paginatedEvents" :key="e.mintConsensusTimestamp">
                    <tr class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-5 text-muted-foreground tabular-nums">
                            {{ e.mintDate ? formatDate(e.mintDate) : '—' }}
                        </td>
                        <td class="py-3 px-4">
                            <!-- Foreground, not primary: the page already carries a
                                 lot of green, and a link in every row of a long
                                 table is noise rather than emphasis. -->
                            <NuxtLink
                                :to="`/issuances/${encodeURIComponent(e.mintConsensusTimestamp)}`"
                                class="font-medium text-foreground hover:text-primary hover:underline transition-colors"
                            >{{ e.name ?? e.tokenId ?? '—' }}</NuxtLink>
                            <div v-if="e.symbol" class="text-[11px] text-muted-foreground">{{ e.symbol }}</div>
                        </td>
                        <td class="py-3 px-4">
                            <code v-if="e.tokenId" class="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">{{ e.tokenId }}</code>
                            <span v-else class="text-muted-foreground">—</span>
                        </td>
                        <td class="py-3 px-4">
                            <span
                                v-if="e.type"
                                :class="[eventTypeLabel(e.type) === 'Fungible' ? 'bg-primary/10 text-primary' : 'bg-chart-4/10 text-chart-4', 'text-xs font-medium rounded-full px-2 py-0.5']"
                            >
                                {{ $t('credits.tokenTypes.' + eventTypeLabel(e.type)) }}
                            </span>
                            <span v-else class="text-muted-foreground">—</span>
                        </td>
                        <td class="py-3 px-4 text-right tabular-nums text-muted-foreground">
                            {{ e.amount !== null ? formatNumber(e.amount) : '—' }}
                        </td>
                        <td class="py-3 px-4 text-right tabular-nums font-medium">
                            <span v-if="e.mintedAmount !== null" class="inline-flex items-center justify-end gap-1.5">
                                <span :class="isReconciled(e) ? 'text-foreground' : 'text-amber-600 dark:text-amber-500'">
                                    {{ formatNumber(e.mintedAmount) }}
                                </span>
                                <InfoTooltip v-if="statusMessage(e)" :text="statusMessage(e)!">
                                    <AlertTriangle class="h-3.5 w-3.5 text-amber-500" />
                                </InfoTooltip>
                            </span>
                            <span v-else class="inline-flex items-center justify-end gap-1.5 text-muted-foreground">
                                {{ $t('projects.detail.issuances.notReconciled') }}
                                <InfoTooltip v-if="statusMessage(e)" :text="statusMessage(e)!">
                                    <AlertTriangle class="h-3.5 w-3.5 text-amber-500" />
                                </InfoTooltip>
                            </span>
                            <div v-if="e.serialRetiredCount" class="text-[11px] text-muted-foreground">
                                {{ $t('projects.detail.issuances.retiredOfMinted', { retired: formatNumber(e.serialRetiredCount), total: formatNumber(e.serialCount ?? 0) }) }}
                            </div>
                        </td>
                        <td class="py-3 px-4 text-center">
                            <div class="inline-flex items-center gap-1">
                                <button
                                    v-if="hasSerials(e)"
                                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    :title="$t('projects.detail.issuances.viewSerials')"
                                    @click="toggleSerials(e)"
                                >
                                    <component :is="expanded === e.mintConsensusTimestamp ? ChevronDown : ChevronRight" class="h-3.5 w-3.5" />
                                </button>
                                <button
                                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    :title="$t('common.viewRawData')"
                                    @click="emit('view-vc', makeEventCredit(e))"
                                >
                                    <FileJson class="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="expanded === e.mintConsensusTimestamp" class="bg-muted/20">
                        <td colspan="7" class="px-5 py-3">
                            <div v-if="loadingSerials === e.mintConsensusTimestamp" class="text-xs text-muted-foreground">
                                {{ $t('common.loading') }}
                            </div>
                            <div v-else-if="serialsByMint[e.mintConsensusTimestamp]?.data?.length" class="space-y-2">
                                <div class="text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <span class="inline-flex items-start gap-1">
                                        {{ $t('projects.detail.issuances.serialsHeading') }}
                                        <span class="mt-0.5 shrink-0"><InfoTooltip :text="$t('issuances.serials.holderTooltip')" /></span>
                                    </span>
                                </div>
                                <!-- Each chip states its own status and size, so
                                     no legend is needed to decode a strike-through. -->
                                <div class="flex flex-wrap gap-1.5">
                                    <span
                                        v-for="r in serialsByMint[e.mintConsensusTimestamp]!.data"
                                        :key="`${r.from}-${r.to}-${r.accountId ?? ''}`"
                                        class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]"
                                        :class="r.deleted
                                            ? 'bg-stat-rose/10 text-stat-rose'
                                            : 'bg-stat-green/10 text-stat-green'"
                                    >
                                        <span class="font-mono">{{ rangeLabel(r) }}</span>
                                        <span class="opacity-75">
                                            {{ $t(r.deleted ? 'projects.detail.issuances.serialsRetired'
                                                            : 'projects.detail.issuances.serialsActive',
                                                  { count: r.count }) }}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <div v-else class="text-xs text-muted-foreground">
                                {{ $t('projects.detail.issuances.serialsUnavailable') }}
                            </div>

                            <!--
                                Outside the serials branch on purpose: a fungible
                                issuance has no serials but can still have
                                transactions, and nesting this inside the
                                "serials exist" case hid them entirely.
                            -->
                            <div v-if="loadingSerials !== e.mintConsensusTimestamp" class="pt-3 mt-3 border-t">
                                <div class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                                    <span class="inline-flex items-start gap-1">
                                        {{ $t('projects.detail.issuances.transactionsHeading') }}
                                        <span class="mt-0.5 shrink-0"><InfoTooltip :text="$t('projects.detail.lifecycle.batchTooltip')" /></span>
                                    </span>
                                </div>
                                <div class="rounded-lg border bg-card overflow-hidden">
                                    <CreditTransactions
                                        :project-id="project.id"
                                        :mint-timestamp="e.mintConsensusTimestamp"
                                        :page-size="5"
                                        hide-page-size
                                        />
                                </div>
                            </div>
                        </td>
                    </tr>
                    </template>
                </tbody>
            </table>

            <div class="border-t px-5 pb-3">
                <Pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :total-pages="totalPages"
                    :total-items="filteredEvents.length"
                />
            </div>
        </template>

        <!-- FALLBACK: per-token table (older CREDIT-row data) -->
        <template v-else-if="linkedCredits.length > 0">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b bg-muted/20">
                        <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.token') }}</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('methodologies.detail.analytics.table.tokenId') }}</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.type') }}</th>
                        <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.supply') }}</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.mintDate') }}</th>
                        <th class="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span class="inline-flex items-start gap-1">{{ $t('credits.columns.rawData') }} <span class="mt-0.5 shrink-0"><InfoTooltip :text="$t('projects.detail.vcs.rawVcTooltip')" /></span></span>
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    <tr v-for="c in paginatedCredits" :key="c.id" class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-5">
                            <div class="font-medium text-foreground">{{ c.name }}</div>
                            <div class="text-[11px] text-muted-foreground">{{ c.symbol }}</div>
                        </td>
                        <td class="py-3 px-4">
                            <code class="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">{{ c.tokenId }}</code>
                        </td>
                        <td class="py-3 px-4">
                            <span :class="[c.type === 'Fungible' ? 'bg-primary/10 text-primary' : 'bg-chart-4/10 text-chart-4', 'text-xs font-medium rounded-full px-2 py-0.5']">
                                {{ $t('credits.tokenTypes.' + c.type) }}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-right tabular-nums font-medium">{{ formatNumber(c.supply) }}</td>
                        <td class="py-3 px-4 text-muted-foreground">{{ formatDate(c.mintDate) }}</td>
                        <td class="py-3 px-4 text-center">
                            <button
                                class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                :title="$t('common.viewRawData')"
                                @click="emit('view-vc', c)"
                            >
                                <FileJson class="h-3.5 w-3.5" />
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="border-t px-5 pb-3">
                <Pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :total-pages="totalPages"
                    :total-items="linkedCredits.length"
                />
            </div>
        </template>

        <!-- Empty state -->
        <div v-else class="px-5 py-8 text-center text-sm text-muted-foreground">
            {{ $t('projects.detail.issuances.empty') }}
        </div>
    </div>
</template>
