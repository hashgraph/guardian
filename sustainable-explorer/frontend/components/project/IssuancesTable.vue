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
</script>

<template>
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
                        <th class="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span class="inline-flex items-center gap-1">Raw Data <InfoTooltip text="Raw VC document on the blockchain" /></span>
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
        </div>
        <div v-else class="px-5 py-8 text-center text-sm text-muted-foreground">
            No issuances have been made for this project yet.
        </div>
    </div>
</template>
