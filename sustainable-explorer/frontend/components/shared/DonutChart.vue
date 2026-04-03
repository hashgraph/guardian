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
        const arc = {
            ...s,
            pct,
            dashArray: `${dash} ${gap}`,
            dashOffset: -offset,
        };
        offset += dash;
        return arc;
    });
});
</script>

<template>
    <div class="inline-flex items-center justify-center">
        <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
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
                class="transition-all duration-500"
            />
        </svg>
    </div>
</template>
