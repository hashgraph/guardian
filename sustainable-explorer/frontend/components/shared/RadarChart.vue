<script setup lang="ts">
export interface RadarPoint {
    id: string | number;
    label: string;
    fullLabel: string;
    value: number;
}

const props = defineProps<{
    points: RadarPoint[];
    color?: string;
}>();

// Matches --color-primary (main.css) — the same green used by e.g. the
// Issuance Trend chart's `color="hsl(142, 76%, 36%)"`. There is no bare
// `--primary` custom property in this app (only the full `--color-primary`
// value), so a caller-less default must be a literal, not `hsl(var(--primary))`.
const color = props.color || 'hsl(162, 63%, 41%)';

const size = 260;
const center = size / 2;
const outerRadius = 78;
const ringCount = 4;
const labelOffset = 16;

const n = computed(() => props.points.length);

// The outer ring represents the actual max value in the data — not a
// padded/rounded-up scale — so the chart never implies a "goal" beyond what
// the data actually reaches.
const maxValue = computed(() => Math.max(...props.points.map(p => p.value), 1));

// Start at the top (-90°), going clockwise.
function angleFor(i: number): number {
    return (Math.PI * 2 * i) / n.value - Math.PI / 2;
}

function pointAt(i: number, radius: number): { x: number; y: number } {
    const angle = angleFor(i);
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
}

// Concentric grid rings, innermost to outermost.
const gridRings = computed(() => {
    if (n.value < 3) return [];
    return Array.from({ length: ringCount }, (_, ring) => {
        const r = (outerRadius * (ring + 1)) / ringCount;
        return Array.from({ length: n.value }, (_, i) => pointAt(i, r))
            .map(p => `${p.x},${p.y}`)
            .join(' ');
    });
});

// Spokes from center to each axis's outer point.
const spokes = computed(() =>
    n.value < 3 ? [] : Array.from({ length: n.value }, (_, i) => pointAt(i, outerRadius)),
);

const dataPoints = computed(() =>
    props.points.map((p, i) => ({
        ...p,
        ...pointAt(i, Math.max((p.value / maxValue.value) * outerRadius, 0)),
    })),
);

const dataPolygon = computed(() => dataPoints.value.map(p => `${p.x},${p.y}`).join(' '));

// Labels are drawn at a fixed distance from a fixed-size SVG, so anything
// past this length runs off the edge instead of wrapping — truncate with
// an ellipsis and rely on the tooltip (fullLabel) for the complete text.
const maxLabelLength = 20;
function truncateLabel(label: string): string {
    return label.length > maxLabelLength ? `${label.slice(0, maxLabelLength - 1)}…` : label;
}

// Perimeter labels — anchor left/right/middle based on which side of the
// circle the point falls on, so labels don't collide with the shape.
const axisLabels = computed(() => {
    if (n.value < 3) return [];
    return props.points.map((p, i) => {
        const pt = pointAt(i, outerRadius + labelOffset);
        const cos = Math.cos(angleFor(i));
        const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
        return { ...p, label: truncateLabel(p.label), x: pt.x, y: pt.y, anchor };
    });
});

// Ring tick values, shown climbing the top (vertical) spoke.
const ringTicks = computed(() => Array.from({ length: ringCount }, (_, ring) => ({
    value: Math.round((maxValue.value * (ring + 1)) / ringCount),
    y: center - (outerRadius * (ring + 1)) / ringCount,
})));

const hoveredIndex = ref<number | null>(null);
const hoveredPoint = computed(() => hoveredIndex.value !== null ? dataPoints.value[hoveredIndex.value] : null);
</script>

<template>
    <div class="relative inline-block">
        <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size" @mouseleave="hoveredIndex = null">
            <!-- Grid rings -->
            <polygon
                v-for="(ring, i) in gridRings"
                :key="`ring-${i}`"
                :points="ring"
                fill="none"
                stroke="currentColor"
                class="text-border"
                stroke-width="1"
            />
            <!-- Spokes -->
            <line
                v-for="(pt, i) in spokes"
                :key="`spoke-${i}`"
                :x1="center" :y1="center" :x2="pt.x" :y2="pt.y"
                stroke="currentColor"
                class="text-border"
                stroke-width="1"
            />
            <!-- Ring tick labels (top axis) -->
            <text
                v-for="(tick, i) in ringTicks"
                :key="`tick-${i}`"
                :x="center + 4" :y="tick.y + 3"
                class="fill-muted-foreground"
                font-size="9"
            >{{ tick.value }}</text>

            <!-- Data area -->
            <polygon :points="dataPolygon" :fill="color" fill-opacity="0.15" :stroke="color" stroke-width="2" stroke-linejoin="round" />

            <!-- Data points -->
            <g v-for="(pt, i) in dataPoints" :key="`pt-${i}`">
                <circle
                    :cx="pt.x" :cy="pt.y"
                    :r="hoveredIndex === i ? 5 : 3.5"
                    :fill="color"
                    stroke="white"
                    :stroke-width="hoveredIndex === i ? 2 : 1.5"
                    class="transition-all duration-150"
                />
                <!-- Wider invisible hit area, easier to hover than the visible dot -->
                <circle :cx="pt.x" :cy="pt.y" r="10" fill="transparent" @mouseenter="hoveredIndex = i" />
            </g>

            <!-- Axis labels -->
            <text
                v-for="(label, i) in axisLabels"
                :key="`label-${i}`"
                :x="label.x" :y="label.y"
                :text-anchor="label.anchor"
                dominant-baseline="middle"
                class="fill-muted-foreground"
                font-size="10"
            >{{ label.label }}</text>
        </svg>

        <!-- HTML tooltip — same style/technique as TrendLineChart's hover
             tooltip, positioned via percentage coords so it never scales with
             the SVG viewBox. SVG can't contain the shared InfoTooltip
             component (it renders an HTML <span>, invalid inside <svg>). -->
        <div
            v-if="hoveredPoint"
            class="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-full"
            :style="{
                left: `${(hoveredPoint.x / size) * 100}%`,
                top: `calc(${(hoveredPoint.y / size) * 100}% - 8px)`,
            }"
        >
            <div class="bg-foreground/90 text-background text-[11px] font-semibold px-2 py-1 rounded whitespace-nowrap shadow-sm">
                {{ hoveredPoint.fullLabel }}: {{ hoveredPoint.value }}
            </div>
        </div>
    </div>
</template>
