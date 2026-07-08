<script setup lang="ts">
export interface DonutSegment {
    label: string;
    value: number;
    color: string;
}

const props = defineProps<{
    segments: DonutSegment[];
    size?: number;
}>();

const size = props.size ?? 120;
const strokeWidth = 24;
const radius = (size - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;
const center = size / 2;

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0));

const arcs = computed(() => {
    let offset = 0;
    return props.segments.map(s => {
        const pct = total.value > 0 ? s.value / total.value : 0;
        const dash = pct * circumference;
        const gap = circumference - dash;
        // Angle at the arc's midpoint, in the same visual space as the
        // rotate(-90 …) transform below (0 = top, clockwise) — used to place
        // the hover tooltip at the middle of the segment.
        const midAngle = ((offset + dash / 2) / circumference) * 2 * Math.PI - Math.PI / 2;
        const arc = {
            ...s,
            pct,
            dashArray: `${dash} ${gap}`,
            dashOffset: -offset,
            midAngle,
        };
        offset += dash;
        return arc;
    });
});

const hoveredIndex = ref<number | null>(null);
const hoveredArc = computed(() => hoveredIndex.value !== null ? arcs.value[hoveredIndex.value] : null);
const hoveredPos = computed(() => {
    if (!hoveredArc.value) return null;
    return {
        x: center + radius * Math.cos(hoveredArc.value.midAngle),
        y: center + radius * Math.sin(hoveredArc.value.midAngle),
    };
});
</script>

<template>
    <div class="relative inline-flex items-center justify-center">
        <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" @mouseleave="hoveredIndex = null">
            <!-- Background circle -->
            <circle
                :cx="center" :cy="center" :r="radius"
                fill="none" stroke="hsl(220 13% 91%)" :stroke-width="strokeWidth"
            />
            <!-- Segments -->
            <circle
                v-for="(arc, idx) in arcs"
                :key="idx"
                :cx="center" :cy="center" :r="radius"
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
