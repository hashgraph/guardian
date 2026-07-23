<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next';
import { formatCredits } from '~/lib/format';
import { useGeocodedCountries } from '~/composables/useGeocodedCountries';
import { isValidCountryName } from '~/lib/utils';
import type { Project } from '~/types/models';

const props = defineProps<{
    project: Project;
}>();

const { t } = useI18n();

// Same resolution + validation used elsewhere for project country display
// (e.g. usePortfolioDashboard.ts's countryRaw/topCountries): raw
// project.country/flag can be garbage (a stray coordinate, an IPFS URI, a
// bare geometry type) leaked in from a geo/file field during mapping —
// resolvedName reverse-geocodes from lat/lng when the country was
// unrecognized, and isValidCountryName filters out whatever's left that
// still isn't a real place name.
const { resolvedCode, resolvedName } = useGeocodedCountries(computed(() => [props.project]));

const displayCountry = computed(() => {
    const name = resolvedName(props.project);
    return name && isValidCountryName(name) ? name : null;
});

// Reused from the Projects table's status vocabulary/colors (projects/index.vue)
// so this card's status badge matches the rest of the app rather than
// inventing a new palette.
const STATUS_CLASS: Record<string, string> = {
    Registered: 'bg-slate-100 text-slate-600',
    'Under Validation': 'bg-stat-amber/10 text-stat-amber',
    Verified: 'bg-stat-blue/10 text-stat-blue',
    Issuing: 'bg-stat-green/10 text-stat-green',
    Completed: 'bg-purple-50 text-purple-600',
};
// Solid-color counterpart for the card's top accent bar — same categories,
// just a single color instead of a bg/text pair.
const STATUS_ACCENT: Record<string, string> = {
    Registered: '#94a3b8',
    'Under Validation': 'var(--color-stat-amber)',
    Verified: 'var(--color-stat-blue)',
    Issuing: 'var(--color-stat-green)',
    Completed: '#a855f7',
};

const statusClass = computed(() => STATUS_CLASS[props.project.status] ?? STATUS_CLASS.Registered);
const accentColor = computed(() => STATUS_ACCENT[props.project.status] ?? STATUS_ACCENT.Registered);

function formatPeriodDate(d?: string | null): string | null {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

const creditingPeriod = computed(() => {
    const start = formatPeriodDate(props.project.creditingPeriodStart);
    const end = formatPeriodDate(props.project.creditingPeriodEnd);
    if (!start && !end) return '—';
    return `${start ?? '—'} → ${end ?? '—'}`;
});
</script>

<template>
    <div class="flex flex-col rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-md hover:border-primary/40">
        <div class="h-[3px]" :style="{ backgroundColor: accentColor }" />

        <div class="p-3.5 pb-2">
            <div class="flex items-start justify-between gap-1.5 mb-1">
                <InfoTooltip :text="project.name" class="min-w-0">
                    <span class="block truncate text-[13px] font-semibold text-foreground leading-tight">{{ project.name }}</span>
                </InfoTooltip>
                <span :class="['inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0', statusClass]">
                    <span class="h-1.5 w-1.5 rounded-full bg-current" />
                    {{ project.status }}
                </span>
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span class="text-primary font-medium truncate">{{ project.registry }}</span>
                <template v-if="displayCountry">
                    <span class="text-border">·</span>
                    <span class="flex items-center gap-1 min-w-0">
                        <CountryFlag :code="resolvedCode(project)" size="sm" class="shrink-0" />
                        <span class="truncate">{{ displayCountry }}</span>
                    </span>
                </template>
            </div>
            <!-- Always reserved at 2 lines' height (present or not) so every
                 card's stats/methodology/SDG rows below line up across a row,
                 regardless of which cards actually have a description. -->
            <p class="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2 min-h-[36px]">
                {{ project.description }}
            </p>
        </div>

        <div class="px-3.5 py-2 border-y grid grid-cols-3 gap-1.5">
            <div class="rounded-md bg-muted/40 border px-2 py-1.5">
                <div class="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{{ t('portfolio.watchedProjects.issued') }}</div>
                <div class="text-[13px] font-bold text-foreground tabular-nums">{{ formatCredits(project.totalIssued ?? 0) }}</div>
            </div>
            <div class="rounded-md bg-muted/40 border px-2 py-1.5">
                <div class="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{{ t('portfolio.watchedProjects.retired') }}</div>
                <div class="text-[13px] font-bold text-foreground tabular-nums">{{ formatCredits(project.totalRetired ?? 0) }}</div>
            </div>
            <div class="rounded-md bg-muted/40 border px-2 py-1.5">
                <div class="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{{ t('portfolio.watchedProjects.transferred') }}</div>
                <div class="text-[13px] font-bold text-foreground tabular-nums">{{ formatCredits(0) }}</div>
            </div>
        </div>

        <div class="px-3.5 py-2 border-b flex flex-col gap-1">
            <div class="flex text-[11px]">
                <span class="text-muted-foreground w-[88px] shrink-0">{{ t('portfolio.watchedProjects.methodology') }}</span>
                <InfoTooltip :text="project.methodology" class="min-w-0">
                    <span class="block truncate text-foreground">{{ project.methodology }}</span>
                </InfoTooltip>
            </div>
            <div class="flex text-[11px]">
                <span class="text-muted-foreground w-[88px] shrink-0">{{ t('portfolio.watchedProjects.creditingPeriod') }}</span>
                <span class="text-foreground">{{ creditingPeriod }}</span>
            </div>
        </div>

        <div class="px-3.5 py-2.5 flex items-center justify-between gap-2 mt-auto">
            <div class="flex items-center gap-1 min-w-0">
                <SdgBadges v-if="project.sdgs?.length" :ids="project.sdgs" :max="3" />
                <span v-if="project.sdgs?.length" class="text-[10px] text-muted-foreground truncate ml-0.5">
                    {{ t('portfolio.watchedProjects.sdgsLabel', { n: project.sdgs.length }) }}
                </span>
            </div>
            <AppLink
                :to="`/projects/${project.id}`"
                class="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary shrink-0 hover:bg-primary/20"
            >
                {{ t('portfolio.watchedProjects.open') }}
                <ArrowRight class="h-2.5 w-2.5" />
            </AppLink>
        </div>
    </div>
</template>
