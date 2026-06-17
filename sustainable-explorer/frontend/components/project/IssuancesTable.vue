<script setup lang="ts">
import { Coins, FileJson } from 'lucide-vue-next';
import type { Project, Credit } from '~/types/models';
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

// Header badge count: prefer events length, fall back to per-token count
const badgeCount = computed(() =>
    events.value.length > 0 ? events.value.length : linkedCredits.value.length,
);

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

// Per-token totals from events (group by tokenId). Only worth showing when at
// least one token was minted more than once — otherwise the strip just repeats
// each row's amount.
const tokenTotals = computed<{ symbol: string; total: number }[]>(() => {
    if (!events.value.length) return [];
    const map = new Map<string, { symbol: string; total: number; count: number }>();
    for (const e of events.value) {
        const key = e.tokenId ?? 'unknown';
        const sym = e.symbol ?? e.tokenId ?? '—';
        const existing = map.get(key);
        if (existing) {
            existing.total += e.amount ?? 0;
            existing.count += 1;
        } else {
            map.set(key, { symbol: sym, total: e.amount ?? 0, count: 1 });
        }
    }
    if (![...map.values()].some(t => t.count > 1)) return [];
    return Array.from(map.values()).map(({ symbol, total }) => ({ symbol, total }));
});
</script>

<template>
    <div class="rounded-xl border bg-card overflow-hidden">
        <div class="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <Coins class="h-4 w-4 text-primary" />
                Linked Issuances
            </h2>
            <span class="text-xs text-muted-foreground">{{ badgeCount }} issuance(s)</span>
        </div>

        <!-- PRIMARY: per-mint-event issuance history -->
        <template v-if="events.length > 0">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b bg-muted/20">
                        <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Mint Date</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Token</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Token ID</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                        <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span class="inline-flex items-start justify-end gap-1">Mint Amount <span class="mt-0.5 shrink-0"><InfoTooltip :text="$t('credits.tooltips.mintAmount')" /></span></span>
                        </th>
                        <th class="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span class="inline-flex items-start gap-1">Raw Data <span class="mt-0.5 shrink-0"><InfoTooltip text="Raw VC document on the blockchain" /></span></span>
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    <tr v-for="e in events" :key="e.mintConsensusTimestamp" class="hover:bg-muted/30 transition-colors">
                        <td class="py-3 px-5 text-muted-foreground tabular-nums">
                            {{ e.mintDate ? formatDate(e.mintDate) : '—' }}
                        </td>
                        <td class="py-3 px-4">
                            <div class="font-medium text-foreground">{{ e.name ?? e.tokenId ?? '—' }}</div>
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
                                {{ eventTypeLabel(e.type) }}
                            </span>
                            <span v-else class="text-muted-foreground">—</span>
                        </td>
                        <td class="py-3 px-4 text-right tabular-nums font-medium">
                            {{ e.amount !== null ? `+${formatNumber(e.amount)}` : '—' }}
                        </td>
                        <td class="py-3 px-4 text-center">
                            <button
                                class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="View Raw Data"
                                @click="emit('view-vc', makeEventCredit(e))"
                            >
                                <FileJson class="h-3.5 w-3.5" />
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Per-token totals strip -->
            <div v-if="tokenTotals.length > 0" class="border-t px-5 py-2.5 flex flex-wrap gap-x-5 gap-y-1">
                <span
                    v-for="t in tokenTotals"
                    :key="t.symbol"
                    class="text-xs text-muted-foreground"
                >
                    {{ t.symbol }} &middot; total {{ formatNumber(t.total) }}
                </span>
            </div>
        </template>

        <!-- FALLBACK: per-token table (older CREDIT-row data) -->
        <template v-else-if="linkedCredits.length > 0">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b bg-muted/20">
                        <th class="text-left py-2.5 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Token</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Token ID</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                        <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('credits.columns.supply') }}</th>
                        <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Mint Date</th>
                        <th class="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span class="inline-flex items-start gap-1">Raw Data <span class="mt-0.5 shrink-0"><InfoTooltip text="Raw VC document on the blockchain" /></span></span>
                        </th>
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
                        <td class="py-3 px-4 text-muted-foreground">{{ formatDate(c.mintDate) }}</td>
                        <td class="py-3 px-4 text-center">
                            <button
                                class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="View Raw Data"
                                @click="emit('view-vc', c)"
                            >
                                <FileJson class="h-3.5 w-3.5" />
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </template>

        <!-- Empty state -->
        <div v-else class="px-5 py-8 text-center text-sm text-muted-foreground">
            No issuances have been made for this project yet.
        </div>
    </div>
</template>
