<script setup lang="ts">
import { ArrowLeft, Columns2, X } from 'lucide-vue-next';
import { formatCredits } from '~/lib/format';
import { mapApiProject } from '~/composables/useProjects';
import type { Project } from '~/types/models';

const route = useRoute();
const { network } = useNetwork();
const { t } = useI18n();
const config = useRuntimeConfig();
const { clearAll } = useProjectComparison();

const baseURL = import.meta.server
    ? (config.apiBaseUrl as string)
    : (config.public.apiBaseUrl as string);

const ids = computed(() => {
    const raw = (route.query.ids as string) ?? '';
    return raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
});

const { data: rawProjects, pending } = useAsyncData(
    `compare:${network.value}:${ids.value.join(',')}`,
    () => Promise.all(
        ids.value.map(id =>
            $fetch<Record<string, any>>(`/api/v1/${network.value}/projects/${id}`, { baseURL })
                .catch(() => null),
        ),
    ),
    { watch: [network] },
);

const projects = computed<(Project | null)[]>(() =>
    (rawProjects.value ?? []).map(r => (r ? mapApiProject(r) : null)),
);

const loadedProjects = computed(() => projects.value.filter((p): p is Project => p !== null));

const statusColor: Record<string, string> = {
    Registered: 'bg-slate-100 text-slate-600',
    'Under Validation': 'bg-stat-amber/10 text-stat-amber',
    Verified: 'bg-stat-blue/10 text-stat-blue',
    Issuing: 'bg-stat-green/10 text-stat-green',
    Completed: 'bg-purple-50 text-purple-600',
};

interface CompareRow {
    key: string;
    label: string;
    render: 'text' | 'status' | 'country' | 'credits' | 'sdgs';
    getValue?: (p: Project) => string | number;
}

const COMPARE_ROWS = computed<CompareRow[]>(() => [
    { key: 'status',            label: t('projects.details.status'),          render: 'status' },
    { key: 'country',           label: t('projects.details.country'),          render: 'country' },
    { key: 'registry',          label: t('projects.details.registry'),         render: 'text' },
    { key: 'methodology',       label: t('projects.details.methodology'),      render: 'text' },
    { key: 'sector',            label: t('dashboard.sector'),                  render: 'text' },
    { key: 'vintage',           label: t('projects.filters.vintage'),          render: 'text' },
    { key: 'developer',         label: t('projects.details.developer'),        render: 'text' },
    { key: 'credits',           label: t('projects.compare.credits'),          render: 'credits',  getValue: (p) => p.credits },
    { key: 'totalIssued',       label: t('projects.compare.totalIssued'),      render: 'credits',  getValue: (p) => p.totalIssued ?? 0 },
    { key: 'totalRetired',      label: t('projects.compare.totalRetired'),     render: 'credits',  getValue: (p) => p.totalRetired ?? 0 },
    { key: 'totalActive',       label: t('projects.compare.totalActive'),      render: 'credits',  getValue: (p) => p.totalActive ?? 0 },
    { key: 'issuanceCount',     label: t('projects.columns.issuances'),        render: 'text',     getValue: (p) => p.issuanceCount ?? 0 },
    { key: 'creditingPeriodEnd', label: t('projects.compare.creditingPeriodEnd'), render: 'text', getValue: (p) => p.creditingPeriodEnd ?? '—' },
    { key: 'sdgs',              label: t('projects.columns.sdgs'),             render: 'sdgs' },
]);

function getCellValue(project: Project, row: CompareRow): string | number {
    if (row.getValue) return row.getValue(project);
    const val = (project as any)[row.key];
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
}

function isDifferent(row: CompareRow): boolean {
    if (loadedProjects.value.length < 2) return false;
    if (row.render === 'sdgs') {
        const vals = loadedProjects.value.map(p => [...(p.sdgs ?? [])].sort().join(','));
        return new Set(vals).size > 1;
    }
    const vals = loadedProjects.value.map(p => String(getCellValue(p, row)));
    return new Set(vals).size > 1;
}

const hasEnoughIds = computed(() => ids.value.length >= 2);
</script>

<template>
    <div class="space-y-0">
        <!-- Header -->
        <div class="px-6 pt-6 pb-4">
            <div class="flex items-center gap-3 mb-2">
                <AppLink
                    to="/projects"
                    class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    @click="clearAll"
                >
                    <ArrowLeft class="h-4 w-4" />
                    {{ $t('projects.title') }}
                </AppLink>
            </div>
            <h1 class="text-2xl font-bold text-foreground flex items-center gap-2">
                <Columns2 class="h-6 w-6 text-primary" />
                {{ $t('projects.compare.title') }}
            </h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('projects.compare.subtitle') }}</p>
        </div>

        <!-- Not enough IDs -->
        <div v-if="!hasEnoughIds" class="px-6 pb-6">
            <div class="rounded-xl border bg-card px-6 py-10 text-center">
                <p class="text-sm text-muted-foreground">{{ $t('projects.compare.needTwo') }}</p>
                <AppLink to="/projects" class="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <ArrowLeft class="h-4 w-4" />
                    {{ $t('projects.title') }}
                </AppLink>
            </div>
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="pending" class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="h-14 bg-muted/30 animate-pulse border-b" />
                <div v-for="i in 8" :key="i" class="h-12 border-b animate-pulse" :class="i % 2 === 0 ? 'bg-muted/10' : 'bg-card'" />
            </div>
        </div>

        <!-- Comparison table -->
        <div v-else class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <th class="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[160px] sticky left-0 bg-muted/30 z-10">
                                {{ $t('projects.compare.attribute') }}
                            </th>
                            <th
                                v-for="(project, idx) in projects"
                                :key="idx"
                                class="text-left py-3 px-4 min-w-[220px] align-top"
                            >
                                <template v-if="project">
                                    <AppLink
                                        :to="`/projects/${project.id}`"
                                        class="font-semibold text-foreground hover:text-primary transition-colors normal-case text-sm leading-snug block line-clamp-2"
                                    >
                                        {{ project.name }}
                                    </AppLink>
                                    <div class="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                        <CountryFlag :code="project.countryCode || 'UNK'" size="sm" />
                                        <span>{{ project.country || '—' }}</span>
                                    </div>
                                </template>
                                <template v-else>
                                    <span class="text-muted-foreground normal-case text-sm">{{ $t('projects.compare.notFound') }}</span>
                                </template>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr
                            v-for="row in COMPARE_ROWS"
                            :key="row.key"
                            :class="isDifferent(row) ? 'bg-amber-50/60' : ''"
                        >
                            <td class="py-3 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-0 z-10" :class="isDifferent(row) ? 'bg-amber-50/60' : 'bg-card'">
                                {{ row.label }}
                                <span v-if="isDifferent(row)" class="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                    {{ $t('projects.compare.diff') }}
                                </span>
                            </td>
                            <td
                                v-for="(project, idx) in projects"
                                :key="idx"
                                class="py-3 px-4"
                            >
                                <template v-if="!project">
                                    <span class="text-muted-foreground">—</span>
                                </template>
                                <template v-else-if="row.render === 'status'">
                                    <span :class="[statusColor[project.status] || 'bg-muted text-muted-foreground', 'text-xs font-medium rounded-full px-2 py-0.5']">
                                        {{ project.status }}
                                    </span>
                                </template>
                                <template v-else-if="row.render === 'country'">
                                    <span class="inline-flex items-center gap-1.5">
                                        <CountryFlag :code="project.countryCode || 'UNK'" size="sm" />
                                        <span>{{ project.country || '—' }}</span>
                                    </span>
                                </template>
                                <template v-else-if="row.render === 'sdgs'">
                                    <SdgBadges v-if="project.sdgs && project.sdgs.length > 0" :ids="project.sdgs" :max="6" />
                                    <span v-else class="text-muted-foreground">—</span>
                                </template>
                                <template v-else-if="row.render === 'credits'">
                                    <span class="tabular-nums font-medium">{{ formatCredits(Number(getCellValue(project, row)) || 0) }}</span>
                                </template>
                                <template v-else>
                                    <span class="text-foreground">{{ getCellValue(project, row) || '—' }}</span>
                                </template>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Legend -->
            <div class="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span class="inline-flex items-center gap-1">
                    <span class="h-3 w-3 rounded-sm bg-amber-100 border border-amber-200" />
                    {{ $t('projects.compare.diffLegend') }}
                </span>
            </div>
        </div>
    </div>
</template>
