<script setup lang="ts">
const props = defineProps<{
    data: { label: string; value: number }[];
    color?: string;
    fillColor?: string;
    unit?: string;
    emptyText?: string;
}>();

const color = props.color || 'hsl(var(--primary))';
const fillColor = props.fillColor || 'hsl(var(--primary) / 0.1)';
const unit = computed(() => props.unit ?? 'M');

const chartHeight = 160;
const chartWidth = 500;
const padX = 10;
const padTop = 10;
const padBottom = 0;

const TOOLTIP_W = 80;
const TOOLTIP_H = 20;
const TOOLTIP_PAD = 4; // min distance from viewBox top

const maxVal = computed(() => {
    const vals = props.data.map(d => d.value);
    return vals.length > 0 ? Math.max(...vals) * 1.15 : 1;
});

const points = computed(() => {
    const n = props.data.length;
    if (n === 0) return [];
    const usableW = chartWidth - padX * 2;
    const usableH = chartHeight - padTop - padBottom;
    return props.data.map((d, i) => ({
        x: padX + (n === 1 ? usableW / 2 : (i / (n - 1)) * usableW),
        y: padTop + usableH - (d.value / maxVal.value) * usableH,
        ...d,
    }));
});

const linePath = computed(() => {
    if (points.value.length === 0) return '';
    return points.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
});

const smoothPath = computed(() => {
    const pts = points.value;
    if (pts.length < 2) return linePath.value;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const curr = pts[i];
        const next = pts[i + 1];
        const cpx = (curr.x + next.x) / 2;
        d += ` C ${cpx} ${curr.y}, ${cpx} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
});

const areaPath = computed(() => {
    const pts = points.value;
    if (pts.length < 2) return '';
    const bottom = chartHeight;
    return `${smoothPath.value} L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`;
});

const hoveredIndex = ref<number | null>(null);

const hoveredPoint = computed(() =>
    hoveredIndex.value !== null ? points.value[hoveredIndex.value] ?? null : null,
);

// Tooltip box — x clamped so it never overflows left/right,
// y clamped so it never overflows the top of the viewBox.
const tooltipBox = computed(() => {
    const pt = hoveredPoint.value;
    if (!pt) return null;
    const x = Math.min(Math.max(pt.x - TOOLTIP_W / 2, padX), chartWidth - padX - TOOLTIP_W);
    const y = Math.max(pt.y - TOOLTIP_H - 12, TOOLTIP_PAD);
    return { x, y, textX: x + TOOLTIP_W / 2, textY: y + TOOLTIP_H - 6 };
});
</script>

<template>
    <div class="w-full">
        <div v-if="data.length > 0" class="relative">
            <svg
                :viewBox="`0 0 ${chartWidth} ${chartHeight + 24}`"
                class="w-full"
                preserveAspectRatio="xMidYMid meet"
                @mouseleave="hoveredIndex = null"
            >
                <!-- Grid lines -->
                <line
                    v-for="i in 4"
                    :key="`grid-${i}`"
                    :x1="padX"
                    :y1="padTop + ((chartHeight - padTop - padBottom) / 4) * (i - 1)"
                    :x2="chartWidth - padX"
                    :y2="padTop + ((chartHeight - padTop - padBottom) / 4) * (i - 1)"
                    stroke="currentColor"
                    class="text-border"
                    stroke-width="0.5"
                    stroke-dasharray="3 3"
                />

                <!-- Area fill -->
                <path
                    v-if="areaPath"
                    :d="areaPath"
                    :fill="fillColor"
                />

                <!-- Line -->
                <path
                    :d="smoothPath"
                    fill="none"
                    :stroke="color"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />

                <!-- Dots + x-axis labels + hit areas -->
                <g v-for="(pt, i) in points" :key="`pt-${i}`">
                    <!-- Vertical guide on hover -->
                    <line
                        v-if="hoveredIndex === i"
                        :x1="pt.x"
                        :y1="padTop"
                        :x2="pt.x"
                        :y2="chartHeight"
                        stroke="currentColor"
                        class="text-border"
                        stroke-width="1"
                        stroke-dasharray="2 2"
                    />

                    <!-- Dot -->
                    <circle
                        :cx="pt.x"
                        :cy="pt.y"
                        :r="hoveredIndex === i ? 5 : 3"
                        :fill="color"
                        stroke="white"
                        :stroke-width="hoveredIndex === i ? 2.5 : 1.5"
                        class="transition-all duration-150"
                    />

                    <!-- X-axis label -->
                    <text
                        :x="pt.x"
                        :y="chartHeight + 14"
                        text-anchor="middle"
                        fill="currentColor"
                        class="text-muted-foreground"
                        font-size="9"
                        :font-weight="hoveredIndex === i ? 600 : 400"
                    >
                        {{ pt.label }}
                    </text>

                    <!-- Invisible wider hit area (rendered last so it captures events over the dot) -->
                    <rect
                        :x="pt.x - (chartWidth / points.length) / 2"
                        :y="0"
                        :width="chartWidth / points.length"
                        :height="chartHeight"
                        fill="transparent"
                        @mouseenter="hoveredIndex = i"
                    />
                </g>

                <!-- Tooltip overlay — rendered last so it always paints on top -->
                <g v-if="hoveredPoint && tooltipBox">
                    <rect
                        :x="tooltipBox.x"
                        :y="tooltipBox.y"
                        :width="TOOLTIP_W"
                        :height="TOOLTIP_H"
                        rx="4"
                        :style="{ fill: 'var(--color-foreground)', opacity: '0.9' }"
                    />
                    <text
                        :x="tooltipBox.textX"
                        :y="tooltipBox.textY"
                        text-anchor="middle"
                        :style="{ fill: 'var(--color-background)' }"
                        font-size="10"
                        font-weight="600"
                    >
                        {{ hoveredPoint.label }}: {{ hoveredPoint.value !== 0 ? `${hoveredPoint.value}${unit}` : '0' }}
                    </text>
                </g>
            </svg>
        </div>
        <div v-else class="flex items-center justify-center h-48 text-sm text-muted-foreground">
            {{ emptyText || 'No data available' }}
        </div>
    </div>
</template>
