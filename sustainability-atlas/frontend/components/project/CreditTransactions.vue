<script setup lang="ts">
import { Flame, ArrowRight, Receipt, RefreshCw } from 'lucide-vue-next';
import type { MintTransaction } from '~/types/models';
import { formatNumber, formatDate } from '~/lib/format';
import { useMintTransactions } from '~/composables/api/useProjectsApi';

/**
 * Retirement and transfer transactions for a project's credits.
 *
 * Shared by the per-issuance drill-down and the project-level Credit Lifecycle
 * view — the only difference is whether `mintTimestamp` scopes it to a single
 * issuance. Paginated because one distribution run can produce hundreds of
 * transactions for a single issuance.
 */
const props = withDefaults(defineProps<{
    /** Null addresses the issuance directly — for mints never attributed to a project. */
    projectId?: string | null;
    /** Null scopes to every issuance of the project. */
    mintTimestamp?: string | null;
    pageSize?: number;
    /** Fixes the page size where the surrounding layout dictates it — e.g. the
     *  table nested inside an expanded issuance row. */
    hidePageSize?: boolean;
}>(), {
    projectId: null,
    mintTimestamp: null,
    pageSize: 10,
    hidePageSize: false,
});

const { t } = useI18n();
const { network } = useNetwork();
const load = useMintTransactions();

const rows = ref<MintTransaction[]>([]);
const total = ref(0);
// Decides which empty state is truthful. Assumed synced until the API says
// otherwise, so a failed request reads as "nothing recorded" rather than
// promising data that may never arrive.
const transferHistorySynced = ref(true);
const page = ref(1);
const pending = ref(false);
const loaded = ref(false);

// Local, because the shared Pagination lets the reader change it; seeded from
// the prop so a caller can still fix the initial size.
const size = ref(props.pageSize);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)));

function onPageSize(next: number) {
    size.value = next;
    page.value = 1;
    fetchPage();
}

// Sorting is server-side: the list is paginated, so ordering only the visible
// page would reorder ten rows out of hundreds and read as a bug.
const sortKey = ref<'date' | 'event' | 'credits' | 'serials'>('date');
const sortDir = ref<'asc' | 'desc'>('desc');

function toggleSort(key: string) {
    const next = key as typeof sortKey.value;
    if (sortKey.value === next) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = next;
        sortDir.value = 'desc';
    }
    page.value = 1;
    fetchPage();
}

async function fetchPage(): Promise<void> {
    pending.value = true;
    try {
        const res = await load(network.value, props.projectId, props.mintTimestamp, page.value, size.value, sortKey.value, sortDir.value);
        rows.value = res?.data ?? [];
        // Optional-chain `meta` too: a shape mismatch must degrade to an empty
        // state, not throw and leave the section blank with nothing rendered.
        total.value = res?.meta?.total ?? 0;
        transferHistorySynced.value = res?.transferHistorySynced ?? true;
    } finally {
        pending.value = false;
        loaded.value = true;
    }
}

watch(page, fetchPage);
watch(() => [props.projectId, props.mintTimestamp], () => { page.value = 1; fetchPage(); });
onMounted(fetchPage);

/** Consensus timestamps are `seconds.nanos`; only the seconds part is a date. */
function txDate(consensusTimestamp: string): string {
    const seconds = Number(consensusTimestamp.split('.')[0]);
    return Number.isFinite(seconds) ? formatDate(new Date(seconds * 1000).toISOString()) : '—';
}

/**
 * How well documented the retirement claim is: recorded by the registry's
 * retirement contract, or evidenced only by the credits' destruction on the
 * ledger. The distinction matters to anyone relying on the retirement as proof
 * of an offset, so it accompanies every Retirement badge.
 */
function retirementTooltip(tx: MintTransaction): string {
    return tx.retirementSource === 'guardian'
        ? t('projects.detail.lifecycle.viaGuardianTooltip')
        : t('projects.detail.lifecycle.outsideGuardianTooltip');
}

/** Collapses consecutive serials into ranges — a 10-serial transfer reads far
 *  better as "372–381" than as ten separate numbers. */
function serialRanges(serials: number[]): string {
    const sorted = [...serials].sort((a, b) => a - b);
    const out: string[] = [];
    let start: number | null = null;
    let prev: number | null = null;
    for (const s of sorted) {
        if (start === null) { start = prev = s; continue; }
        if (s === (prev as number) + 1) { prev = s; continue; }
        out.push(start === prev ? `${start}` : `${start}–${prev}`);
        start = prev = s;
    }
    if (start !== null) out.push(start === prev ? `${start}` : `${start}–${prev}`);
    return out.join(', ');
}
</script>

<template>
    <div>
        <div v-if="pending && !loaded" class="px-5 py-10 text-center text-sm text-muted-foreground">
            {{ $t('common.loading') }}
        </div>

        <!-- Two different empty states, because they mean different things.
             Transfers are read from the treasury account, swept in the
             background; until that has happened there is nothing to report yet,
             which is not the same as nothing having happened. Claiming the
             latter would be a statement the data does not support. -->
        <div v-else-if="total === 0 && !transferHistorySynced" class="px-5 py-10 text-center">
            <RefreshCw class="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p class="mt-2 text-sm font-medium text-foreground">{{ $t('projects.detail.lifecycle.syncingTitle') }}</p>
            <p class="mt-1 text-xs text-muted-foreground max-w-md mx-auto">{{ $t('projects.detail.lifecycle.syncing') }}</p>
        </div>

        <!-- An empty result is a real answer, not a missing section: say so
             plainly rather than leaving a heading with nothing under it. -->
        <div v-else-if="total === 0" class="px-5 py-10 text-center">
            <Receipt class="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p class="mt-2 text-sm font-medium text-foreground">{{ $t('projects.detail.lifecycle.emptyTitle') }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ $t('projects.detail.lifecycle.empty') }}</p>
        </div>

        <template v-else>
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b bg-muted/20">
                        <SortableHeader
                            :label="$t('projects.detail.lifecycle.columns.date')"
                            sort-key="date" :active-sort-key="sortKey" :sort-dir="sortDir" @sort="toggleSort"
                        />
                        <SortableHeader
                            :label="$t('projects.detail.lifecycle.columns.event')"
                            :tooltip="$t('projects.detail.lifecycle.eventTooltip')"
                            sort-key="event" :active-sort-key="sortKey" :sort-dir="sortDir" @sort="toggleSort"
                        />
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.lifecycle.columns.parties') }}</th>
                        <SortableHeader
                            :label="$t('projects.detail.lifecycle.columns.credits')"
                            sort-key="credits" align="right" :active-sort-key="sortKey" :sort-dir="sortDir" @sort="toggleSort"
                        />
                        <SortableHeader
                            :label="$t('projects.detail.lifecycle.columns.serials')"
                            sort-key="serials" :active-sort-key="sortKey" :sort-dir="sortDir" @sort="toggleSort"
                        />
                    </tr>
                </thead>
                <tbody class="divide-y">
                    <tr v-for="tx in rows" :key="`${tx.event}-${tx.consensusTimestamp}-${tx.serials[0]}`" class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-5 text-muted-foreground tabular-nums whitespace-nowrap">{{ txDate(tx.consensusTimestamp) }}</td>
                        <td class="py-3 px-4">
                            <!-- Credits either changed hands or left circulation:
                                 Transfer or Retirement, never both. The API decides
                                 which, so the column sorts on the values shown. -->
                            <span
                                :class="[tx.event === 'retirement' ? 'bg-stat-rose/10 text-stat-rose' : 'bg-primary/10 text-primary',
                                         'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5']"
                            >
                                <component :is="tx.event === 'retirement' ? Flame : ArrowRight" class="h-3 w-3" />
                                {{ $t('projects.detail.lifecycle.types.' + tx.event) }}
                                <InfoTooltip v-if="tx.event === 'retirement'" :text="retirementTooltip(tx)" />
                            </span>
                        </td>
                        <td class="py-3 px-4 text-xs">
                            <!-- Retirement leaves no counterparty: the credits went out
                                 of circulation rather than to another account. The pair
                                 names the last holder and the credits' end state, styled
                                 as a state so it cannot be read as an account. -->
                            <template v-if="tx.event === 'retirement'">
                                <code class="bg-muted rounded px-1.5 py-0.5 font-mono">{{ tx.holderAccountId ?? '—' }}</code>
                                <ArrowRight class="inline h-3 w-3 mx-1 text-muted-foreground" />
                                <span class="inline-flex items-center gap-1 rounded-full bg-stat-rose/10 px-2 py-0.5 font-medium text-stat-rose">
                                    <Flame class="h-3 w-3" />
                                    {{ $t('projects.detail.lifecycle.burned') }}
                                </span>
                            </template>
                            <template v-else>
                                <code class="bg-muted rounded px-1.5 py-0.5 font-mono">{{ tx.senderAccountId ?? '—' }}</code>
                                <ArrowRight class="inline h-3 w-3 mx-1 text-muted-foreground" />
                                <code class="bg-muted rounded px-1.5 py-0.5 font-mono">{{ tx.receiverAccountId ?? '—' }}</code>
                            </template>
                        </td>
                        <td class="py-3 px-4 text-right tabular-nums font-medium">{{ formatNumber(tx.serials.length) }}</td>
                        <td class="py-3 px-4">
                            <div class="font-mono text-[11px] text-muted-foreground">{{ serialRanges(tx.serials) }}</div>
                            <!-- Part of the transferred lot has since been retired while
                                 the rest remains in circulation. That split applies to
                                 individual serials, so it belongs with them rather than
                                 in the Event column, which describes the transaction. -->
                            <span
                                v-if="tx.event === 'transfer' && tx.retiredSince > 0"
                                class="mt-1 inline-flex items-center gap-1 text-[10px] text-stat-amber"
                            >
                                <Flame class="h-2.5 w-2.5" />
                                {{ $t('projects.detail.lifecycle.statusPartial', { count: tx.retiredSince, total: tx.serials.length }) }}
                                <InfoTooltip :text="$t('projects.detail.lifecycle.statusPartialTooltip')" />
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="border-t px-5 pb-3">
                <Pagination
                    v-model:current-page="page"
                    :page-size="size"
                    :total-pages="totalPages"
                    :total-items="total"
                    :hide-page-size="hidePageSize"
                    @update:page-size="onPageSize"
                />
            </div>
        </template>
    </div>
</template>
