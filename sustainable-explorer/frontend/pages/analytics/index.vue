<script setup lang="ts">
import { BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-vue-next';
import { MOCK_PROJECTS, MOCK_CREDITS } from '~/data';
import { formatCredits } from '~/lib/format';

const { t } = useI18n();

const totalIssuance = computed(() => MOCK_CREDITS.reduce((sum, c) => sum + c.supply, 0));
const activeProjects = computed(() => MOCK_PROJECTS.length);
const totalRetirements = computed(() => Math.round(totalIssuance.value * 0.37));
const avgProjectSize = computed(() => Math.round(totalIssuance.value / activeProjects.value));

const metrics = computed(() => [
    { label: t('analytics.metrics.totalIssuance'), value: `${formatCredits(totalIssuance.value)}`, change: '+12.3%', trend: 'up' },
    { label: t('analytics.metrics.activeProjects'), value: activeProjects.value.toLocaleString(), change: `+${activeProjects.value}`, trend: 'up' },
    { label: t('analytics.metrics.retirements'), value: `${formatCredits(totalRetirements.value)}`, change: '+8.7%', trend: 'up' },
    { label: t('analytics.metrics.avgProjectSize'), value: `${formatCredits(avgProjectSize.value)}`, change: '-2.1%', trend: 'down' },
]);

// Credits by category derived from projects
const byMethodology = computed(() => {
    const catCredits: Record<string, number> = {};
    let total = 0;
    for (const p of MOCK_PROJECTS) {
        // Map categories to broader groups
        const group = p.category === 'Forestry' ? 'REDD+' : p.category;
        catCredits[group] = (catCredits[group] || 0) + p.credits;
        total += p.credits;
    }

    const colors = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
    return Object.entries(catCredits)
        .map(([name, credits]) => ({
            name,
            value: total > 0 ? Math.round((credits / total) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((item, idx) => ({
            ...item,
            color: colors[idx] || 'bg-chart-5',
        }));
});
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-5">
            <h1 class="text-2xl font-bold text-foreground flex items-center gap-2">
                {{ $t('analytics.title') }}
                <MockDataBadge compact />
            </h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('analytics.subtitle') }}</p>
        </div>
        <div class="px-6 pb-4">
            <MockDataBadge />
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 pb-6">
            <div v-for="m in metrics" :key="m.label" class="rounded-xl border bg-card p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{{ m.label }}</span>
                <div class="flex items-baseline gap-2 mt-2">
                    <span class="text-xl font-bold text-foreground">{{ m.value }}</span>
                    <span :class="m.trend === 'up' ? 'text-stat-green' : 'text-stat-rose'" class="flex items-center gap-0.5 text-xs font-medium">
                        <ArrowUpRight v-if="m.trend === 'up'" class="h-3 w-3" />
                        <ArrowDownRight v-else class="h-3 w-3" />
                        {{ m.change }}
                    </span>
                </div>
            </div>
        </div>

        <div class="border-t">
            <div class="px-6 py-4">
                <h2 class="text-base font-semibold text-foreground">{{ $t('analytics.issuancesByMethodology') }}</h2>
                <p class="text-xs text-muted-foreground mt-0.5">{{ $t('analytics.issuancesByMethodologySub') }}</p>
            </div>
            <div class="px-6 pb-6">
                <div class="rounded-xl border bg-card p-5">
                    <div class="space-y-3">
                        <div v-for="m in byMethodology" :key="m.name" class="flex items-center gap-3">
                            <span class="text-xs text-muted-foreground w-32 shrink-0 text-right">{{ m.name }}</span>
                            <div class="flex-1 h-7 bg-muted/50 rounded-md overflow-hidden">
                                <div
                                    :class="m.color"
                                    class="h-full rounded-md transition-all duration-500"
                                    :style="{ width: `${m.value}%` }"
                                />
                            </div>
                            <span class="text-xs font-medium text-foreground w-10 text-right tabular-nums">{{ m.value }}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
