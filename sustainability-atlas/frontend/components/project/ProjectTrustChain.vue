<script setup lang="ts">
import { FileText, BookOpen, ShieldCheck, Activity, BadgeCheck, ExternalLink, Info } from 'lucide-vue-next';
import type { Project } from '~/types/models';

const props = defineProps<{ project: Project }>();

const { network } = useNetwork();

interface PipelineStep {
    docType: string;
    schemaName: string;
    schemaUuid: string;
    consensusTimestamp: string;
    topicId: string;
    isProjectSchema: boolean;
}

// Lifecycle order. Anything not listed (e.g. 'unknown', MintToken) sorts last.
const DOC_TYPE_RANK: Record<string, number> = {
    registration: 0,
    pdd: 1,
    validationReport: 2,
    monitoringReport: 3,
    verificationReport: 4,
};

interface DocTypeMeta { label: string; icon: unknown; color: string }
const DOC_TYPE_META: Record<string, DocTypeMeta> = {
    registration:       { label: 'Registration',  icon: FileText,   color: 'text-primary bg-primary/10' },
    pdd:                { label: 'Project Design', icon: BookOpen,   color: 'text-primary bg-primary/10' },
    validationReport:   { label: 'Validation',    icon: ShieldCheck, color: 'text-amber-600 bg-amber-50' },
    monitoringReport:   { label: 'Monitoring',    icon: Activity,    color: 'text-sky-600 bg-sky-50' },
    verificationReport: { label: 'Verification',  icon: BadgeCheck,  color: 'text-emerald-600 bg-emerald-50' },
    unknown:            { label: 'Document',       icon: FileText,    color: 'text-muted-foreground bg-muted' },
};

function metaFor(docType: string): DocTypeMeta {
    return DOC_TYPE_META[docType] ?? DOC_TYPE_META.unknown;
}

const steps = computed<PipelineStep[]>(() => {
    const schemas = props.project.linkedSchemas ?? [];
    const all: PipelineStep[] = [];
    for (const s of schemas) {
        for (const vc of s.linkedVcs) {
            all.push({
                docType: s.docType,
                schemaName: s.schemaName ?? s.schemaUuid,
                schemaUuid: s.schemaUuid,
                consensusTimestamp: vc.consensusTimestamp,
                topicId: vc.topicId,
                isProjectSchema: s.isProjectSchema,
            });
        }
    }
    return all.sort((a, b) => {
        const ra = DOC_TYPE_RANK[a.docType] ?? 99;
        const rb = DOC_TYPE_RANK[b.docType] ?? 99;
        if (ra !== rb) return ra - rb;
        return a.consensusTimestamp.localeCompare(b.consensusTimestamp);
    });
});

const projectId = computed(() => props.project.sourceTimestamp ?? props.project.id);

function formatTimestamp(ts: string): string {
    if (!ts) return '—';
    const secs = parseFloat(ts);
    return isNaN(secs) ? ts : new Date(secs * 1000).toLocaleString();
}

function hashscanTopic(topicId: string): string {
    return topicId ? `https://hashscan.io/${network.value}/topic/${topicId}` : '';
}

const drawerOpen = ref(false);
const activeStep = ref<PipelineStep | null>(null);
function openDrawer(step: PipelineStep) {
    activeStep.value = step;
    drawerOpen.value = true;
}
</script>

<template>
    <div class="overflow-hidden rounded-xl border bg-card">
        <div class="border-b bg-muted/30 px-5 py-3.5">
            <h2 class="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity class="h-4 w-4 text-primary" />
                Project Pipeline & Trust Chain
            </h2>
            <p class="mt-0.5 text-[11px] text-muted-foreground">Every credential in this project's lifecycle, in order.</p>
        </div>

        <div v-if="steps.length === 0" class="px-5 py-10 text-center text-sm text-muted-foreground">
            No linked credentials found for this project yet.
        </div>

        <div v-else class="px-5 py-5">
            <div class="relative">
                <div class="absolute bottom-3 left-[19px] top-3 w-px bg-border" />
                <div
                    v-for="(step, idx) in steps"
                    :key="step.consensusTimestamp + '-' + idx"
                    class="relative flex items-start gap-4 pb-5 last:pb-0"
                >
                    <div :class="[metaFor(step.docType).color, 'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full']">
                        <component :is="metaFor(step.docType).icon" class="h-4 w-4" />
                    </div>
                    <div class="min-w-0 flex-1 rounded-lg border bg-card px-4 py-3">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{{ metaFor(step.docType).label }}</span>
                                    <span v-if="step.isProjectSchema" class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Project Schema</span>
                                </div>
                                <h3 class="mt-0.5 truncate text-sm font-semibold text-foreground">{{ step.schemaName }}</h3>
                                <p class="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{{ formatTimestamp(step.consensusTimestamp) }}</p>
                            </div>
                            <button
                                class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                title="View raw VC"
                                @click="openDrawer(step)"
                            >
                                <Info class="h-4 w-4" />
                            </button>
                        </div>
                        <a
                            v-if="hashscanTopic(step.topicId)"
                            :href="hashscanTopic(step.topicId)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                            <ExternalLink class="h-3 w-3" />
                            Topic {{ step.topicId }}
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <RawVcDrawer
            :open="drawerOpen"
            :project-id="projectId"
            :network="network"
            :consensus-timestamp="activeStep?.consensusTimestamp ?? ''"
            :schema-name="activeStep?.schemaName ?? null"
            :topic-id="activeStep?.topicId ?? null"
            @close="drawerOpen = false"
        />
    </div>
</template>
