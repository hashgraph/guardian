<script setup lang="ts">
import { Hash } from 'lucide-vue-next';
import type { Project } from '~/types/models';
import { formatCredits } from '~/lib/format';
import { formatDate } from '~/lib/format';
import { getMethodologyName } from '~/lib/methodologies';
import { IWA_TO_CADTRUST, IWA_TO_CDOP } from '~/lib/standard-field-mappings.generated';

const props = defineProps<{
    project: Project;
    displayCountry: string;
    displayCountryCode: string;
}>();

const fullMethodologyName = computed(() => {
    return getMethodologyName(props.project.methodologyId) || props.project.methodology;
});

const creditingPeriodStart = computed(() => {
    if (props.project.creditingPeriodStart) return formatDate(props.project.creditingPeriodStart);
    if (props.project.createdAt) return formatDate(props.project.createdAt.slice(0, 10));
    if (!props.project.vintage) return '—';
    const yr = parseInt(props.project.vintage);
    return isNaN(yr) ? '—' : formatDate(`${yr - 1}-01-01`);
});

const creditingPeriodEnd = computed(() => {
    if (props.project.creditingPeriodEnd) return formatDate(props.project.creditingPeriodEnd);
    if (!props.project.vintage) return '—';
    const yr = parseInt(props.project.vintage);
    return isNaN(yr) ? '—' : formatDate(`${yr + 9}-12-31`);
});

function tip(iwaPaths: string): string {
    const paths = iwaPaths.split(',');
    const iwaLine = `IWA: ${paths.join(', ')}`;
    const ctSet = new Set(paths.map(p => IWA_TO_CADTRUST[p]).filter(Boolean));
    const cdSet = new Set(paths.map(p => IWA_TO_CDOP[p]).filter(Boolean));
    const lines = [iwaLine];
    if (ctSet.size) lines.push(`CADTrust: ${[...ctSet].join(', ')}`);
    if (cdSet.size) lines.push(`CDOP: ${[...cdSet].join(', ')}`);
    return lines.join('\n');
}
</script>

<template>
    <div class="rounded-xl border bg-card overflow-hidden">
        <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <Hash class="h-4 w-4 text-primary" />
                Key Facts
            </h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
            <!-- Methodology -->
            <div class="bg-card px-5 py-4">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Methodology
                    <InfoTooltip :text="tip('QualityStandard.name')" />
                </div>
                <NuxtLink
                    v-if="project.instanceTopicId"
                    :to="`/methodologies/${project.instanceTopicId}`"
                    class="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors"
                >
                    {{ fullMethodologyName }}
                </NuxtLink>
                <div v-else class="text-sm font-medium text-foreground">{{ fullMethodologyName || '—' }}</div>
            </div>

            <!-- Registry -->
            <div class="bg-card px-5 py-4">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Registry
                    <InfoTooltip :text="tip('OriginationProcessAgreement.name')" />
                </div>
                <NuxtLink
                    v-if="project.registry && project.registryDid"
                    :to="`/registries?did=${encodeURIComponent(project.registryDid)}`"
                    class="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors break-all"
                >
                    {{ project.registry }}
                </NuxtLink>
                <div v-else class="text-sm font-medium text-foreground break-all">{{ project.registry || '—' }}</div>
            </div>

            <!-- Developer -->
            <div class="bg-card px-5 py-4">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Developer
                    <InfoTooltip :text="tip('ActivityImpactModule.developers')" />
                </div>
                <div class="text-sm font-medium text-foreground">{{ project.developer || '—' }}</div>
            </div>

            <!-- Country -->
            <div class="bg-card px-5 py-4">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Country
                    <InfoTooltip :text="tip('ActivityImpactModule.country')" />
                </div>
                <div class="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <template v-if="displayCountry">
                        <CountryFlag :code="displayCountryCode" size="sm" />
                        {{ displayCountry }}
                    </template>
                    <span v-else class="text-muted-foreground">—</span>
                </div>
            </div>

            <!-- Status -->
            <div class="bg-card px-5 py-4">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Status
                    <InfoTooltip :text="tip('ActivityImpactModule.validations')" />
                </div>
                <div class="text-sm font-medium text-foreground">{{ project.status || '—' }}</div>
            </div>

            <!-- Sector -->
            <div class="bg-card px-5 py-4">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Sector
                    <InfoTooltip :text="tip('ActivityImpactModule.projectScope')" />
                </div>
                <div class="text-sm font-medium text-foreground">{{ project.sector || '—' }}</div>
            </div>

            <!-- Sectoral Scope -->
            <div class="bg-card px-5 py-4">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Sectoral Scope
                    <InfoTooltip :text="tip('ActivityImpactModule.projectType')" />
                </div>
                <div class="text-sm font-medium text-foreground">{{ project.sectoralScope || '—' }}</div>
            </div>

            <!-- Category -->
            <div class="bg-card px-5 py-4">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Category
                    <InfoTooltip :text="tip('ActivityImpactModule.classificationCategory')" />
                </div>
                <div class="text-sm font-medium text-foreground">{{ project.category || '—' }}</div>
            </div>

            <!-- Crediting Period -->
            <div class="bg-card px-5 py-4">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Crediting Period
                    <InfoTooltip :text="tip('ImpactClaim.startDate,ImpactClaim.endDate')" />
                </div>
                <div class="text-sm font-medium text-foreground">
                    {{ creditingPeriodStart }}
                    <span class="text-muted-foreground mx-1">→</span>
                    {{ creditingPeriodEnd }}
                </div>
            </div>

            <!-- Vintage -->
            <div class="bg-card px-5 py-4">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Vintage
                    <InfoTooltip :text="tip('ActivityImpactModule.firstYearIssuance')" />
                </div>
                <div class="text-sm font-medium text-foreground">{{ project.vintage || '—' }}</div>
            </div>

            <!-- Total Credits -->
            <div class="bg-card px-5 py-4 sm:col-span-2">
                <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    Total Credits
                    <InfoTooltip :text="tip('ImpactClaim.quantity')" />
                </div>
                <div class="text-sm font-semibold text-foreground tabular-nums">{{ formatCredits(project.credits) }}</div>
            </div>
        </div>
    </div>
</template>
