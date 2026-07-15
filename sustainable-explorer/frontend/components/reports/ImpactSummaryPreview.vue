<script setup lang="ts">
/** Impact Summary live preview: metric tiles, SDG pills and geo bars from the aggregate endpoint. */
import { formatDate, formatNumber } from '~/lib/format';

const { fetchSummary } = useImpactSummaryApi();
const { data: summary, pending } = fetchSummary();

const topGeo = computed(() => (summary.value?.geographicDistribution ?? []).slice(0, 6));
const sdgIds = computed(() => (summary.value?.sdgContributions ?? []).map(s => s.sdgId));
</script>

<template>
    <div class="rounded-xl border bg-card overflow-hidden">
        <!-- Header band -->
        <div class="bg-primary/5 border-b px-5 py-4">
            <p class="text-xs font-medium uppercase tracking-wider text-primary">
                {{ $t('reports.impactSummary.preview.badge') }}
            </p>
            <h3 class="text-base font-semibold text-foreground mt-0.5">
                {{ $t('reports.impactSummary.preview.title') }}
            </h3>
            <p v-if="summary" class="text-xs text-muted-foreground mt-0.5">
                {{ $t('reports.impactSummary.preview.network', { network: summary.network }) }}
            </p>
        </div>

        <div v-if="pending && !summary" class="p-5 space-y-4">
            <Skeleton class="h-20 w-full" />
            <Skeleton class="h-24 w-full" />
        </div>

        <div v-else-if="!summary" class="p-8 text-center text-sm text-muted-foreground">
            {{ $t('reports.impactSummary.preview.empty') }}
        </div>

        <div v-else class="p-5 space-y-6">
            <!-- 4 key metric tiles -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div class="rounded-lg border bg-muted/20 px-4 py-3">
                    <p class="text-xs text-muted-foreground">{{ $t('reports.impactSummary.metrics.creditsIssued') }}</p>
                    <p class="text-lg font-bold text-foreground tabular-nums">{{ formatNumber(summary.totalCreditsIssued) }}</p>
                </div>
                <div class="rounded-lg border bg-muted/20 px-4 py-3">
                    <p class="text-xs text-muted-foreground">
                        {{ $t('reports.impactSummary.metrics.retired') }}
                        <span class="text-[10px] italic">({{ $t('reports.impactSummary.metrics.inferred') }})</span>
                    </p>
                    <p class="text-lg font-bold text-foreground tabular-nums">{{ formatNumber(summary.totalRetiredInferred) }}</p>
                </div>
                <div class="rounded-lg border bg-muted/20 px-4 py-3">
                    <p class="text-xs text-muted-foreground">{{ $t('reports.impactSummary.metrics.activeProjects') }}</p>
                    <p class="text-lg font-bold text-foreground tabular-nums">{{ formatNumber(summary.activeProjects) }}</p>
                </div>
                <div class="rounded-lg border bg-muted/20 px-4 py-3">
                    <p class="text-xs text-muted-foreground">{{ $t('reports.impactSummary.metrics.activeCountries') }}</p>
                    <p class="text-lg font-bold text-foreground tabular-nums">{{ formatNumber(summary.activeCountries) }}</p>
                </div>
            </div>

            <!-- SDG contributions -->
            <div v-if="sdgIds.length">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {{ $t('reports.impactSummary.preview.sdgTitle') }}
                </p>
                <SdgBadges :ids="sdgIds" :max="17" />
            </div>

            <!-- Geographic distribution -->
            <div v-if="topGeo.length">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {{ $t('reports.impactSummary.preview.geoTitle') }}
                </p>
                <div class="space-y-2">
                    <div v-for="g in topGeo" :key="g.country" class="flex items-center gap-3">
                        <span class="text-xs text-foreground w-28 shrink-0 truncate" :title="g.country">{{ g.country }}</span>
                        <div class="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div class="h-full bg-primary rounded-full" :style="{ width: `${Math.min(g.percentage, 100)}%` }" />
                        </div>
                        <span class="text-xs text-muted-foreground tabular-nums w-24 text-right">{{ formatNumber(g.creditsIssued) }}</span>
                    </div>
                </div>
            </div>

            <!-- Verified footer -->
            <div class="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs">
                <span class="inline-flex items-center gap-1.5 font-medium text-stat-green">
                    <span class="h-1.5 w-1.5 rounded-full bg-stat-green" />
                    {{ $t('reports.impactSummary.preview.verified', { network: summary.network }) }}
                </span>
                <span class="text-muted-foreground">
                    {{ $t('reports.impactSummary.preview.generatedAt', { date: formatDate(summary.generatedAt) }) }}
                </span>
            </div>
        </div>
    </div>
</template>
