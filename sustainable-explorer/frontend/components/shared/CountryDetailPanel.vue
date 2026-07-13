<script setup lang="ts">
// Click-through side panel for a Project Distribution map — shown next to
// ProjectMap when a country is selected. Shared by the main dashboard and
// the Portfolio page so both stay in sync instead of drifting copies.
export interface CountryDetail {
    name: string;
    projects: number;
    credits: string;
    sectors: { label: string; value: number; color: string }[];
    registries: { name: string; pct: number }[];
}

defineProps<{
    detail: CountryDetail | null;
    countryCode: string | null;
}>();

const emit = defineEmits<{
    close: [];
}>();
</script>

<template>
    <!-- Spring-flavored cubic-bezier on enter (overshoots subtly without
         going past w-80 due to our clip) and a faster, sharper exit so
         dismiss feels responsive. Exit duration is intentionally ~65% of
         enter, per Material motion guidance. -->
    <Transition
        enter-active-class="transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.16,0.64,1)]"
        enter-from-class="w-0 opacity-0"
        enter-to-class="w-80 opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="w-80 opacity-100"
        leave-to-class="w-0 opacity-0"
    >
        <!-- Panel: hard-locked to 320px (w-80). overflow-hidden clips any
             long registry / country names so the box can never grow beyond
             the declared width; inner truncate+min-w-0 keep text from
             forcing the column to flex outward.
             No scrollbar-gutter reservation: reserving space on either edge
             shows up as visible dead padding whenever a country's content
             is short enough not to scroll (which is most countries), so
             left/right padding stays equal. The only cost is the native
             scrollbar itself nudging content ~15px narrower for the rare
             country whose list actually scrolls. -->
        <div
            v-if="detail"
            class="w-80 shrink-0 border-l overflow-y-auto overflow-x-hidden bg-card"
        >
            <div class="p-4 space-y-5">
                <!-- Country header -->
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <CountryFlag :code="countryCode!" size="lg" />
                        <h3 class="text-sm font-semibold text-foreground truncate">{{ detail.name }}</h3>
                    </div>
                    <button
                        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        @click="emit('close')"
                    >
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                <!-- Key stats — entire block links to the
                     projects page filtered by this country. -->
                <AppLink
                    :to="{ path: '/projects', query: { country: detail.name } }"
                    class="block text-center group rounded-lg hover:bg-muted/30 transition-colors py-1"
                >
                    <div class="text-3xl font-bold text-primary group-hover:underline tabular-nums">{{ detail.projects.toLocaleString() }}</div>
                    <div class="text-[11px] text-muted-foreground mt-0.5">{{ $t('dashboard.activeProjects') }} →</div>
                </AppLink>

                <!-- Sector donut. The chart column has a hard 90px width
                     regardless of the inner SVG dimensions, so the legend
                     column to its right (flex-1 min-w-0) always starts at
                     the same horizontal offset across countries. Without
                     `w-[90px] shrink-0` the inline-flex inside DonutChart
                     could drift by a pixel or two depending on font/icon
                     metrics. -->
                <div>
                    <h4 class="text-xs font-semibold text-foreground mb-3">{{ $t('dashboard.sector') }}</h4>
                    <div class="flex items-start gap-3 w-[250px]">
                        <div class="w-[90px] h-[90px] shrink-0 flex items-center justify-center">
                            <DonutChart :segments="detail.sectors" :size="90" :hollow="true" />
                        </div>
                        <div class="space-y-1.5 flex-1 min-w-0">
                            <div v-for="s in detail.sectors" :key="s.label" class="flex items-center gap-2 min-w-0">
                                <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />
                                <span class="text-[11px] text-muted-foreground truncate min-w-0">
                                    <strong class="text-foreground">{{ s.value }}%</strong> {{ s.label }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Registry breakdown — vertical list so long registry
                     names don't squeeze a horizontal row and don't push
                     the panel wider. -->
                <div>
                    <h4 class="text-xs font-semibold text-foreground mb-3">{{ $t('dashboard.registry') }}</h4>
                    <div class="space-y-1.5">
                        <div v-for="r in detail.registries" :key="r.name" class="flex items-center gap-2 min-w-0">
                            <span class="text-xs font-semibold text-primary tabular-nums shrink-0 w-10">{{ r.pct }}%</span>
                            <span class="text-[11px] text-muted-foreground truncate min-w-0">{{ r.name }}</span>
                        </div>
                    </div>
                </div>

                <!-- Issuances -->
                <div class="pt-2 border-t">
                    <div class="flex items-center justify-between gap-2 min-w-0">
                        <span class="text-xs text-muted-foreground shrink-0">{{ $t('dashboard.totalIssuancesLabel') }}</span>
                        <span class="text-sm font-bold text-foreground truncate text-right">{{ detail.credits }}</span>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>
