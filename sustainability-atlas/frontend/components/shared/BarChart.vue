<script setup lang="ts">
import { niceAxis } from '~/lib/chart-scale';

export interface BarChartDatum {
    label: string;
    value: number;
}

const props = defineProps<{
    data: BarChartDatum[];
    orientation?: 'horizontal' | 'vertical';
    color?: string;
    maxBars?: number;
    emptyText?: string;
}>();

const orientation = props.orientation ?? 'vertical';
const color = props.color || 'hsl(162, 63%, 41%)';
const chartHeight = 160; // vertical orientation's plot area, in px

const bars = computed(() => props.data.slice(0, props.maxBars ?? 10));
const axis = computed(() => niceAxis(Math.max(...bars.value.map(d => d.value), 0)));

function barLabel(d: BarChartDatum): string {
    return `${d.label}: ${d.value.toLocaleString()}`;
}

// Non-edge ticks are centered on their gridline; the first/last are anchored
// to the container edge instead so their labels never overflow the chart.
function tickAnchorClass(i: number): string {
    if (i === 0) return orientation === 'vertical' ? 'bottom-0' : 'left-0';
    if (i === axis.value.ticks.length - 1) return orientation === 'vertical' ? 'top-0 -translate-y-1/2' : 'right-0';
    return orientation === 'vertical' ? '-translate-y-1/2' : '-translate-x-1/2';
}
</script>

<template>
    <div v-if="bars.length === 0" class="flex items-center justify-center h-40 text-xs text-muted-foreground">
        {{ emptyText || $t('portfolio.noData') }}
    </div>

    <!-- HORIZONTAL — label column + a chart area with numeric gridlines/axis,
         bars anchored to a shared 0-baseline (mirrors the Top SDGs chart). -->
    <div v-else-if="orientation === 'horizontal'" class="flex gap-3">
        <div class="flex flex-col gap-3 shrink-0">
            <div v-for="d in bars" :key="d.label" class="h-6 flex items-center max-w-[130px]">
                <span class="min-w-0 truncate text-xs text-foreground" :title="d.label">{{ d.label }}</span>
            </div>
        </div>
        <div class="relative flex-1 min-w-0">
            <div
                v-for="(tick, i) in axis.ticks"
                :key="i"
                class="absolute top-0 bottom-5 w-px"
                :class="i === 0 ? 'bg-border' : 'bg-border/50'"
                :style="{ left: `${(tick / axis.max) * 100}%` }"
            />
            <div class="flex flex-col gap-3">
                <div v-for="d in bars" :key="d.label" class="relative h-6">
                    <InfoTooltip
                        :text="barLabel(d)"
                        class="absolute inset-y-0 left-0 items-center transition-all duration-500"
                        :style="{ width: `${Math.max((d.value / axis.max) * 100, 2)}%` }"
                    >
                        <div class="h-full w-full rounded-r-md" :style="{ backgroundColor: color }" />
                        <span class="ml-2 text-xs font-medium text-foreground tabular-nums whitespace-nowrap">{{ d.value.toLocaleString() }}</span>
                    </InfoTooltip>
                </div>
            </div>
            <div class="relative h-5 mt-2 border-t border-border">
                <span
                    v-for="(tick, i) in axis.ticks"
                    :key="i"
                    class="absolute top-1.5 text-[10px] text-muted-foreground tabular-nums"
                    :class="tickAnchorClass(i)"
                    :style="i !== 0 && i !== axis.ticks.length - 1 ? { left: `${(tick / axis.max) * 100}%` } : {}"
                >{{ tick }}</span>
            </div>
        </div>
    </div>

    <!-- VERTICAL/COLUMN — y-axis tick column + horizontal gridlines, bars
         growing up from a shared 0-baseline (mirrors Vintage Distribution,
         plus a real numeric axis so it reads as a chart, not just shapes). -->
    <div v-else class="flex flex-col">
        <div class="flex gap-2">
            <div class="relative w-7 shrink-0" :style="{ height: `${chartHeight}px` }">
                <span
                    v-for="(tick, i) in axis.ticks"
                    :key="i"
                    class="absolute right-1 text-[10px] text-muted-foreground tabular-nums"
                    :class="tickAnchorClass(i)"
                    :style="i !== 0 && i !== axis.ticks.length - 1 ? { bottom: `${(tick / axis.max) * chartHeight}px` } : {}"
                >{{ tick }}</span>
            </div>
            <div class="relative flex-1 min-w-0" :style="{ height: `${chartHeight}px` }">
                <div
                    v-for="(tick, i) in axis.ticks"
                    :key="i"
                    class="absolute left-0 right-0 h-px"
                    :class="i === 0 ? 'bg-border' : 'bg-border/50'"
                    :style="{ bottom: `${(tick / axis.max) * chartHeight}px` }"
                />
                <div class="absolute inset-0 flex items-end gap-2">
                    <div v-for="d in bars" :key="d.label" class="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1">
                        <span class="text-[10px] font-medium text-muted-foreground tabular-nums">{{ d.value.toLocaleString() }}</span>
                        <InfoTooltip
                            :text="barLabel(d)"
                            class="w-full transition-all duration-500"
                            :style="{ height: `${Math.max((d.value / axis.max) * (chartHeight - 18), 2)}px` }"
                        >
                            <div class="h-full w-full rounded-t-md" :style="{ backgroundColor: color }" />
                        </InfoTooltip>
                    </div>
                </div>
            </div>
        </div>
        <div class="flex gap-2 mt-1.5 pl-9">
            <span v-for="d in bars" :key="d.label" class="flex-1 min-w-0 text-center text-[10px] text-muted-foreground truncate" :title="d.label">
                {{ d.label }}
            </span>
        </div>
    </div>
</template>
