<script setup lang="ts">
import {
    FileText, BookOpen, ShieldCheck, Activity, BadgeCheck,
    ExternalLink, Info, CheckCircle2, Circle, ChevronDown,
} from 'lucide-vue-next';
import type { Project, LinkedSchema } from '~/types/models';

const props = defineProps<{ project: Project }>();

const { network } = useNetwork();

// Collapsed by default — this list can be long, and it sits above other Advanced
// sections, so keep the page compact until the user expands it.
const open = ref(false);

// ── Types ──────────────────────────────────────────────────────────────────────

interface StepCard {
    docType: string;
    schemaUuid: string;
    schemaName: string;
    isProjectSchema: boolean;
    vcCount: number;
    latestVc: { consensusTimestamp: string; topicId: string } | null;
}

// ── Doc-type metadata (label / icon / color) ──────────────────────────────────

interface DocTypeMeta { label: string; icon: unknown; color: string }

const DOC_TYPE_META: Record<string, DocTypeMeta> = {
    registration:       { label: 'Registration',  icon: FileText,    color: 'text-primary bg-primary/10' },
    pdd:                { label: 'Project Design', icon: BookOpen,    color: 'text-primary bg-primary/10' },
    validationReport:   { label: 'Validation',     icon: ShieldCheck, color: 'text-amber-600 bg-amber-50' },
    monitoringReport:   { label: 'Monitoring',     icon: Activity,    color: 'text-sky-600 bg-sky-50' },
    verificationReport: { label: 'Verification',   icon: BadgeCheck,  color: 'text-emerald-600 bg-emerald-50' },
    unknown:            { label: 'Document',        icon: FileText,    color: 'text-muted-foreground bg-muted' },
};

function metaFor(docType: string): DocTypeMeta {
    return DOC_TYPE_META[docType] ?? DOC_TYPE_META.unknown;
}

// ── Step rank (lifecycle order) ───────────────────────────────────────────────

const DOC_TYPE_RANK: Record<string, number> = {
    registration: 0,
    pdd: 1,
    validationReport: 2,
    monitoringReport: 3,
    verificationReport: 4,
};

// ── Build one card per schema (not one per VC) ────────────────────────────────

const steps = computed<StepCard[]>(() => {
    const schemas: LinkedSchema[] = props.project.linkedSchemas ?? [];

    return schemas
        .map((s): StepCard => {
            // Pick the VC with the highest (latest) consensusTimestamp
            const sorted = [...s.linkedVcs].sort((a, b) =>
                b.consensusTimestamp.localeCompare(a.consensusTimestamp),
            );
            const latestVc = sorted.length > 0
                ? { consensusTimestamp: sorted[0].consensusTimestamp, topicId: sorted[0].topicId }
                : null;

            return {
                docType: s.docType,
                schemaUuid: s.schemaUuid,
                schemaName: s.schemaName ?? s.schemaUuid,
                isProjectSchema: s.isProjectSchema,
                vcCount: s.vcCount,
                latestVc,
            };
        })
        .sort((a, b) => {
            const ra = DOC_TYPE_RANK[a.docType] ?? 99;
            const rb = DOC_TYPE_RANK[b.docType] ?? 99;
            if (ra !== rb) return ra - rb;
            return a.schemaName.localeCompare(b.schemaName);
        });
});

// ── Timestamp formatting ──────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
    if (!ts) return '—';
    const secs = parseFloat(ts);
    return isNaN(secs) ? ts : new Date(secs * 1000).toLocaleString();
}

// ── Hashscan link ─────────────────────────────────────────────────────────────

function hashscanTopic(topicId: string): string {
    return topicId ? `https://hashscan.io/${network.value}/topic/${topicId}` : '';
}

// ── Drawer state ──────────────────────────────────────────────────────────────

const projectId = computed(() => props.project.sourceTimestamp ?? props.project.id);

const drawerOpen = ref(false);
const activeStep = ref<StepCard | null>(null);

function openDrawer(step: StepCard) {
    activeStep.value = step;
    drawerOpen.value = true;
}

</script>

<template>
    <div class="overflow-hidden rounded-xl border bg-card">
        <!-- Header (click to collapse/expand) -->
        <div
            class="cursor-pointer border-b bg-muted/30 px-5 py-3.5 transition-colors hover:bg-muted/50"
            @click="open = !open"
        >
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Activity class="h-4 w-4 text-primary" />
                    Methodology Pipeline
                    <span class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{{ steps.length }} steps</span>
                </h2>
                <ChevronDown :class="['h-4 w-4 text-muted-foreground transition-transform', open ? 'rotate-180' : '']" />
            </div>
            <p class="mt-0.5 text-[11px] text-muted-foreground">One step per schema in this project's methodology lifecycle.</p>
        </div>

        <!-- Empty state -->
        <div v-if="open && steps.length === 0" class="px-5 py-10 text-center text-sm text-muted-foreground">
            No linked schemas found for this project yet.
        </div>

        <!-- Step list -->
        <div v-else-if="open" class="px-5 py-5">
            <div class="relative">
                <div class="absolute bottom-3 left-[19px] top-3 w-px bg-border" />
                <div
                    v-for="(step, idx) in steps"
                    :key="step.schemaUuid + '-' + idx"
                    class="relative flex items-start gap-4 pb-5 last:pb-0"
                >
                    <!-- Step icon -->
                    <div :class="[metaFor(step.docType).color, 'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full']">
                        <component :is="metaFor(step.docType).icon" class="h-4 w-4" />
                    </div>

                    <!-- Step card -->
                    <div class="min-w-0 flex-1 rounded-lg border bg-card px-4 py-3">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0 flex-1">
                                <!-- Doc-type label + project-schema badge -->
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{{ metaFor(step.docType).label }}</span>
                                    <span
                                        v-if="step.isProjectSchema"
                                        class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                                    >
                                        Project Schema
                                    </span>
                                </div>

                                <!-- Schema name -->
                                <h3 class="mt-0.5 truncate text-sm font-semibold text-foreground">{{ step.schemaName }}</h3>

                                <!-- Data-present indicator -->
                                <div class="mt-1 flex items-center gap-1.5">
                                    <template v-if="step.vcCount > 0">
                                        <CheckCircle2 class="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                        <span class="text-[11px] text-emerald-700">
                                            Data present &middot; {{ formatTimestamp(step.latestVc?.consensusTimestamp ?? '') }}
                                        </span>
                                    </template>
                                    <template v-else>
                                        <Circle class="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                                        <span class="text-[11px] text-muted-foreground">Awaiting data</span>
                                    </template>
                                </div>

                                <!-- Document count -->
                                <p v-if="step.vcCount > 0" class="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                                    {{ step.vcCount }} document{{ step.vcCount === 1 ? '' : 's' }}
                                </p>
                            </div>

                            <!-- ⓘ button — only when data is present -->
                            <button
                                v-if="step.vcCount > 0"
                                class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                title="View raw VC"
                                @click="openDrawer(step)"
                            >
                                <Info class="h-4 w-4" />
                            </button>
                        </div>

                        <!-- Hashscan topic link (latest VC's topicId) -->
                        <a
                            v-if="step.latestVc?.topicId && hashscanTopic(step.latestVc.topicId)"
                            :href="hashscanTopic(step.latestVc.topicId)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                            <ExternalLink class="h-3 w-3" />
                            Topic {{ step.latestVc.topicId }}
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- RawVcDrawer (latest VC for the active step) -->
        <RawVcDrawer
            :open="drawerOpen"
            :project-id="projectId"
            :network="network"
            :consensus-timestamp="activeStep?.latestVc?.consensusTimestamp ?? ''"
            :schema-name="activeStep?.schemaName ?? null"
            :topic-id="activeStep?.latestVc?.topicId ?? null"
            @close="drawerOpen = false"
        />
    </div>
</template>
