<script setup lang="ts">
const props = defineProps<{
  data: { label: string; value: number }[];
  color?: string;
  fillColor?: string;
  unit?: string;
  emptyText?: string;
}>();

const color = props.color || "hsl(var(--primary))";
const fillColor = props.fillColor || "hsl(var(--primary) / 0.1)";
const unit = computed(() => props.unit ?? "M");

const chartHeight = 160;
const chartWidth = 500;
const padX = 10;
const padTop = 10;
const padBottom = 0;

const maxVal = computed(() => {
  const vals = props.data.map((d) => d.value);
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
  if (points.value.length === 0) return "";
  return points.value
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
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
  if (pts.length < 2) return "";
  const bottom = chartHeight;
  return `${smoothPath.value} L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`;
});

const hoveredIndex = ref<number | null>(null);

const hoveredPoint = computed(() =>
  hoveredIndex.value !== null
    ? (points.value[hoveredIndex.value] ?? null)
    : null,
);

// ── X-axis label thinning ─────────────────────────────────────────────────────
// Labels are rendered as HTML (outside SVG) so font-size is always true CSS px.
// Step calculation is in SVG user-unit space; 12px CSS ≈ 7 SVG units/char at
// 1:1 scale — conservative (over-thins at wide containers, never overlaps).
const labelStep = computed(() => {
  const n = points.value.length;
  if (n <= 1) return 1;
  const pointSpacing = (chartWidth - padX * 2) / (n - 1);
  const maxLen = Math.max(...props.data.map((d) => d.label.length), 1);
  const labelPx = maxLen * 7 + 4;
  return Math.max(1, Math.ceil(labelPx / pointSpacing));
});

const showLabel = (i: number) =>
  hoveredIndex.value !== null
    ? hoveredIndex.value === i
    : i % labelStep.value === 0;

// ── Tooltip ───────────────────────────────────────────────────────────────────
// Tooltip is rendered as HTML (outside SVG) for the same reason as labels —
// SVG font-size and rect dimensions scale with the viewBox, making the tooltip
// appear disproportionately large on wide containers (portfolio 2/3 col vs
// main dashboard 1/2 col).
const tooltipText = computed(() => {
  const pt = hoveredPoint.value;
  if (!pt) return "";
  let display = "0";
  if (pt.value !== 0) {
    // Find the smallest precision that yields a non-zero rounded value so
    // tiny amounts never display as "0M".
    const decimals =
      ([1, 2, 3, 4] as const).find(
        (d) => Math.round(pt.value * 10 ** d) / 10 ** d !== 0,
      ) ?? 4;
    display = `${Math.round(pt.value * 10 ** decimals) / 10 ** decimals}${unit.value}`;
  }
  return `${pt.label}: ${display}`;
});

// Percentage position of the hovered dot inside the SVG container (0–100).
// Used to place the HTML tooltip at the correct spot over the chart.
const tooltipStyle = computed(() => {
  const pt = hoveredPoint.value;
  if (!pt) return null;
  const svgH = chartHeight + 4;
  const xPct = (pt.x / chartWidth) * 100;
  const yPct = (pt.y / svgH) * 100;
  return { xPct, yPct };
});
</script>

<template>
  <div class="w-full">
    <div v-if="data.length > 0" class="relative">
      <svg
        :viewBox="`0 0 ${chartWidth} ${chartHeight + 4}`"
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
        <path v-if="areaPath" :d="areaPath" :fill="fillColor" />

        <!-- Line -->
        <path
          :d="smoothPath"
          fill="none"
          :stroke="color"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Dots + hit areas -->
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

          <!-- Invisible wider hit area -->
          <rect
            :x="pt.x - chartWidth / points.length / 2"
            :y="0"
            :width="chartWidth / points.length"
            :height="chartHeight"
            fill="transparent"
            @mouseenter="hoveredIndex = i"
          />
        </g>
      </svg>

      <!-- HTML tooltip — positioned via percentage coords so it never scales
           with the SVG viewBox. translate(-50%, -100%) centers it above the dot. -->
      <div
        v-if="hoveredPoint && tooltipStyle"
        class="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-full"
        :style="{
          left: `${tooltipStyle.xPct}%`,
          top: `calc(${tooltipStyle.yPct}% - 8px)`,
        }"
      >
        <div class="bg-foreground/90 text-background text-[11px] font-semibold px-2 py-1 rounded whitespace-nowrap shadow-sm">
          {{ tooltipText }}
        </div>
      </div>

      <!-- X-axis labels — HTML so font-size is always true CSS px. -->
      <div class="relative w-full h-5 overflow-hidden">
        <template v-for="(pt, i) in points" :key="`label-${i}`">
          <span
            v-if="showLabel(i)"
            class="absolute top-0 -translate-x-1/2 text-[12px] text-muted-foreground whitespace-nowrap select-none"
            :class="hoveredIndex === i ? 'font-semibold' : ''"
            :style="{ left: `${(pt.x / chartWidth) * 100}%` }"
            >{{ pt.label }}</span
          >
        </template>
      </div>
    </div>
    <div
      v-else
      class="flex items-center justify-center h-48 text-sm text-muted-foreground"
    >
      {{ emptyText || "No data available" }}
    </div>
  </div>
</template>
