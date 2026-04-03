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
const unit = props.unit || 'M';

const chartHeight = 160;
const chartWidth = 500;
const padX = 10;
const padTop = 10;
const padBottom = 0;

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

                <!-- Data points + hover zones -->
                <g v-for="(pt, i) in points" :key="`pt-${i}`">
                    <!-- Invisible wider hit area -->
                    <rect
                        :x="pt.x - (chartWidth / points.length) / 2"
                        :y="0"
                        :width="chartWidth / points.length"
                        :height="chartHeight"
                        fill="transparent"
                        @mouseenter="hoveredIndex = i"
                    />

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

                    <!-- Value tooltip on hover -->
                    <g v-if="hoveredIndex === i">
                        <rect
                            :x="pt.x - 24"
                            :y="pt.y - 24"
                            width="48"
                            height="18"
                            rx="4"
                            fill="hsl(var(--foreground))"
                            opacity="0.9"
                        />
                        <text
                            :x="pt.x"
                            :y="pt.y - 13"
                            text-anchor="middle"
                            fill="hsl(var(--background))"
                            font-size="10"
                            font-weight="600"
                        >
                            {{ pt.value }}{{ unit }}
                        </text>
                    </g>

                    <!-- X-axis labels -->
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
                </g>
            </svg>
        </div>
        <div v-else class="flex items-center justify-center h-48 text-sm text-muted-foreground">
            {{ emptyText || 'No data available' }}
        </div>
    </div>
</template>
