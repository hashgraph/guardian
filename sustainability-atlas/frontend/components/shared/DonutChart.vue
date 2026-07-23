<script setup lang="ts">
export interface DonutSegment {
    label: string;
    value: number;
    color: string;
}

const props = defineProps<{
    segments: DonutSegment[];
    size?: number;
    // false renders a filled pie (true wedge slices) instead of a ring.
    hollow?: boolean;
}>();

const size = props.size ?? 120;
const isHollow = computed(() => props.hollow !== false);
const strokeWidth = 24;
const center = size / 2;
const outerRadius = center;
// Ring mode strokes a thin circle at this radius. Pie mode draws full-radius
// wedge paths instead of reusing the stroke trick — a stroke thick enough to
// reach the center makes every wedge converge on the same point, and browsers
// visibly anti-alias/blend that convergence into a smudge at the centre.
const ringRadius = (size - strokeWidth) / 2;
const circumference = 2 * Math.PI * ringRadius;

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0));

const arcs = computed(() => {
    let angle = -Math.PI / 2; // 0 = top, clockwise
    let offset = 0;
    return props.segments.map(s => {
        const pct = total.value > 0 ? s.value / total.value : 0;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const sweep = pct * 2 * Math.PI;
        const startAngle = angle;
        const endAngle = startAngle + sweep;
        const midAngle = startAngle + sweep / 2;

        let path = '';
        if (pct > 0) {
            if (pct >= 0.999999) {
                // A full circle can't be expressed as a single SVG arc (the
                // start and end points coincide), so split it into two halves.
                path = `M ${center} ${center - outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 ${center - 0.01} ${center - outerRadius} Z`;
            } else {
                const x1 = center + outerRadius * Math.cos(startAngle);
                const y1 = center + outerRadius * Math.sin(startAngle);
                const x2 = center + outerRadius * Math.cos(endAngle);
                const y2 = center + outerRadius * Math.sin(endAngle);
                const largeArc = sweep > Math.PI ? 1 : 0;
                path = `M ${center} ${center} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            }
        }

        const arc = {
            ...s,
            pct,
            dashArray: `${dash} ${gap}`,
            dashOffset: -offset,
            midAngle,
            path,
        };
        offset += dash;
        angle = endAngle;
        return arc;
    });
});

const hoveredIndex = ref<number | null>(null);
const hoveredArc = computed(() => hoveredIndex.value !== null ? arcs.value[hoveredIndex.value] : null);
const hoveredPos = computed(() => {
    if (!hoveredArc.value) return null;
    const r = isHollow.value ? ringRadius : outerRadius * 0.62;
    return {
        x: center + r * Math.cos(hoveredArc.value.midAngle),
        y: center + r * Math.sin(hoveredArc.value.midAngle),
    };
});
</script>

<template>
    <div class="relative inline-flex items-center justify-center">
        <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" @mouseleave="hoveredIndex = null">
            <template v-if="isHollow">
                <!-- Background circle -->
                <circle
                    :cx="center" :cy="center" :r="ringRadius"
                    fill="none" stroke="hsl(220 13% 91%)" :stroke-width="strokeWidth"
                />
                <!-- Segments -->
                <circle
                    v-for="(arc, idx) in arcs"
                    :key="idx"
                    :cx="center" :cy="center" :r="ringRadius"
                    fill="none"
                    :stroke="arc.color"
                    :stroke-width="strokeWidth"
                    :stroke-dasharray="arc.dashArray"
                    :stroke-dashoffset="arc.dashOffset"
                    stroke-linecap="butt"
                    :transform="`rotate(-90 ${center} ${center})`"
                    class="transition-all duration-500 cursor-default"
                    @mouseenter="hoveredIndex = idx"
                />
            </template>
            <template v-else>
                <path
                    v-for="(arc, idx) in arcs"
                    :key="idx"
                    :d="arc.path"
                    :fill="arc.color"
                    class="transition-all duration-500 cursor-default"
                    @mouseenter="hoveredIndex = idx"
                />
            </template>
        </svg>

        <!-- HTML tooltip — same floating-tooltip technique used by
             TrendLineChart/RadarChart (SVG can't contain the shared
             InfoTooltip component, which renders an HTML <span>). -->
        <div
            v-if="hoveredArc && hoveredPos"
            class="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-full"
            :style="{
                left: `${(hoveredPos.x / size) * 100}%`,
                top: `calc(${(hoveredPos.y / size) * 100}% - 8px)`,
            }"
        >
            <div class="bg-foreground/90 text-background text-[11px] font-semibold px-2 py-1 rounded whitespace-nowrap shadow-sm">
                {{ hoveredArc.label }}: {{ (hoveredArc.pct * 100).toFixed(1) }}%
            </div>
        </div>
    </div>
</template>
