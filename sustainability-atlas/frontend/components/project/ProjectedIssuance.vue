<script setup lang="ts">
import { TrendingUp } from 'lucide-vue-next';
import type { ProjectedIssuance } from '~/types/models';
import { formatNumber } from '~/lib/format';

const props = defineProps<{
    data: ProjectedIssuance | null | undefined;
}>();

const { t } = useI18n();

const periodLabel = computed(() => {
    if (!props.data) return '';
    const { periodStart, periodEnd } = props.data;
    if (periodStart == null && periodEnd == null) return t('projects.tbd');
    if (periodStart == null || periodEnd == null || periodStart === periodEnd) {
        return String(periodStart ?? periodEnd);
    }
    return `${periodStart} – ${periodEnd}`;
});

const totalLabel = computed(() => props.data?.totalTco2e != null
    ? `${formatNumber(props.data.totalTco2e)} tCO2e`
    : t('projects.notEstimated'));
</script>

<template>
    <div class="rounded-xl border bg-card overflow-hidden">
        <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp class="h-4 w-4 text-primary" />
                {{ $t('projects.projectedIssuance.title') }}
            </h2>
            <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('projects.projectedIssuance.subtitle') }}</p>
        </div>

        <template v-if="data">
            <div class="grid grid-cols-2 gap-px bg-border">
                <div class="bg-card px-5 py-4 text-center">
                    <div class="text-2xl font-bold text-stat-green tabular-nums">
                        {{ totalLabel }}
                    </div>
                    <div class="text-[11px] text-muted-foreground mt-1">
                        {{ $t('projects.projectedIssuance.totalReductionLabel') }}
                    </div>
                </div>

                <div class="bg-card px-5 py-4 text-center">
                    <div class="text-lg font-semibold text-foreground tabular-nums">{{ periodLabel }}</div>
                    <div class="text-[11px] text-muted-foreground">{{ $t('projects.projectedIssuance.periodLabel') }}</div>
                </div>
            </div>
        </template>

        <div v-else class="px-5 py-8 text-center text-sm text-muted-foreground">
            {{ $t('projects.projectedIssuance.emptyTitle') }}
        </div>
    </div>
</template>
