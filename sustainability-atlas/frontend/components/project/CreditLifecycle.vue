<script setup lang="ts">
import { GitBranch } from 'lucide-vue-next';
import type { Project } from '~/types/models';
import { formatCredits, formatNumber } from '~/lib/format';

const props = defineProps<{
    project: Project;
}>();

// Lifecycle summary sourced from backend-computed totals.
//
// totalTransferred is null — not zero — when transfers can't be determined:
// fungible balances can't be traced back to the mint that created them, and
// list responses don't carry per-serial ownership. A literal 0 would read as
// "nothing was transferred", which is a different claim from "we don't know".
const lifecycleSummary = computed(() => ({
    totalIssued: props.project.totalIssued ?? 0,
    totalTransferred: props.project.totalTransferred ?? null,
    totalRetired: props.project.totalRetired ?? 0,
    active: props.project.totalActive ?? 0,
}));
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
                <div class="text-lg font-semibold text-foreground tabular-nums">
                    {{ lifecycleSummary.totalTransferred !== null ? formatNumber(lifecycleSummary.totalTransferred) : '—' }}
                </div>
                <div class="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    {{ $t('projects.detail.lifecycle.transferred') }}
                    <InfoTooltip :text="$t('projects.detail.lifecycle.transferredTooltip')" />
                </div>
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

        <!-- Retirement and transfer transactions, newest first -->
        <div class="border-t">
            <CreditTransactions :project-id="project.id" :page-size="10" />
        </div>
    </div>
</template>
