<script setup lang="ts">
import { GitBranch, Repeat, Flame, ArrowRight } from 'lucide-vue-next';
import type { Project } from '~/types/models';
import { formatCredits, formatNumber } from '~/lib/format';

const props = defineProps<{
    project: Project;
}>();

// Lifecycle summary sourced from backend-computed totals.
const lifecycleSummary = computed(() => {
    const totalIssued = props.project.totalIssued ?? 0;
    const totalRetired = props.project.totalRetired ?? 0;
    const active = props.project.totalActive ?? 0;
    return { totalIssued, totalTransferred: 0, totalRetired, active };
});

// Currently transfers/retirements use empty arrays — kept for future data
const linkedTransfers = computed(() => [] as any[]);
const linkedRetirements = computed(() => [] as any[]);
</script>

<template>
    <div class="rounded-xl border bg-card overflow-hidden">
        <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <GitBranch class="h-4 w-4 text-primary" />
                {{ $t('methodologies.detail.analytics.creditLifecycle') }}
            </h2>
            <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('methodologies.detail.analytics.creditLifecycleSub') }}</p>
        </div>

        <!-- Lifecycle Summary Bar -->
        <div class="grid grid-cols-4 gap-px bg-border">
            <div class="bg-card px-5 py-4 text-center">
                <div class="text-lg font-semibold text-foreground tabular-nums">{{ formatNumber(lifecycleSummary.totalIssued) }}</div>
                <div class="text-[11px] text-muted-foreground">{{ $t('methodologies.detail.analytics.totalMintedCredits') }}</div>
            </div>
            <div class="bg-card px-5 py-4 text-center">
                <div class="text-lg font-semibold text-foreground tabular-nums">{{ formatNumber(lifecycleSummary.totalTransferred) }}</div>
                <div class="text-[11px] text-muted-foreground">{{ $t('projects.detail.lifecycle.transferred') }}</div>
            </div>
            <div class="bg-card px-5 py-4 text-center">
                <div class="text-lg font-semibold text-stat-rose tabular-nums">{{ formatNumber(lifecycleSummary.totalRetired) }}</div>
                <div class="text-[11px] text-muted-foreground">{{ $t('methodologies.detail.analytics.retired') }}</div>
            </div>
            <div class="bg-card px-5 py-4 text-center">
                <div class="text-lg font-semibold text-stat-green tabular-nums">{{ formatNumber(lifecycleSummary.active) }}</div>
                <div class="text-[11px] text-muted-foreground">{{ $t('methodologies.detail.analytics.active') }}</div>
            </div>
        </div>

        <!-- Lifecycle progress bar -->
        <div class="px-5 py-3 border-t">
            <div class="flex h-2.5 rounded-full overflow-hidden bg-muted">
                <div
                    v-if="lifecycleSummary.totalIssued > 0"
                    class="bg-stat-rose transition-all"
                    :style="{ width: `${(lifecycleSummary.totalRetired / lifecycleSummary.totalIssued) * 100}%` }"
                    :title="$t('methodologies.detail.analytics.retired')"
                />
                <div
                    v-if="lifecycleSummary.totalIssued > 0"
                    class="bg-stat-green transition-all"
                    :style="{ width: `${(lifecycleSummary.active / lifecycleSummary.totalIssued) * 100}%` }"
                    :title="$t('methodologies.detail.analytics.active')"
                />
            </div>
            <div class="flex items-center justify-between mt-1.5">
                <div class="flex items-center gap-3">
                    <span class="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span class="h-2 w-2 rounded-full bg-stat-rose" /> {{ $t('methodologies.detail.analytics.retired') }}
                    </span>
                    <span class="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span class="h-2 w-2 rounded-full bg-stat-green" /> {{ $t('methodologies.detail.analytics.active') }}
                    </span>
                </div>
                <span v-if="lifecycleSummary.totalIssued > 0" class="text-[10px] text-muted-foreground">
                    {{ $t('methodologies.detail.analytics.pctRetired', { pct: ((lifecycleSummary.totalRetired / lifecycleSummary.totalIssued) * 100).toFixed(1) }) }}
                </span>
            </div>
        </div>

        <!-- Transfers -->
        <div v-if="linkedTransfers.length > 0" class="border-t">
            <div class="px-5 py-2.5 bg-muted/20 flex items-center gap-2">
                <Repeat class="h-3.5 w-3.5 text-stat-blue" />
                <span class="text-xs font-semibold text-foreground">{{ $t('projects.detail.lifecycle.transfers') }}</span>
                <span class="text-[11px] text-muted-foreground">({{ linkedTransfers.length }})</span>
            </div>
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b bg-muted/10">
                        <th class="text-left py-2 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.lifecycle.from') }}</th>
                        <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.lifecycle.to') }}</th>
                        <th class="text-right py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.lifecycle.quantity') }}</th>
                        <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.lifecycle.date') }}</th>
                        <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.details.status') }}</th>
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
                <span class="text-xs font-semibold text-foreground">{{ $t('projects.detail.lifecycle.retirements') }}</span>
                <span class="text-[11px] text-muted-foreground">({{ linkedRetirements.length }})</span>
            </div>
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b bg-muted/10">
                        <th class="text-left py-2 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.lifecycle.beneficiary') }}</th>
                        <th class="text-right py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.lifecycle.quantity') }}</th>
                        <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.lifecycle.reason') }}</th>
                        <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.lifecycle.date') }}</th>
                        <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.details.status') }}</th>
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
            {{ $t('projects.detail.lifecycle.empty') }}
        </div>
    </div>
</template>
