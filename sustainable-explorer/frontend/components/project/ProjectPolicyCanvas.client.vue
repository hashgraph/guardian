<script setup lang="ts">
import { VueFlow, Handle, Position, MarkerType, type Node, type Edge } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import { FileText, Coins, Info, CheckCircle2, Circle, Loader2, Braces, X } from 'lucide-vue-next';
import type { Project, LinkedSchema } from '~/types/models';

const props = defineProps<{ project: Project }>();
const { network } = useNetwork();
const config = useRuntimeConfig();

// ── Policy workflow graph (fetched from /policy-graph) ────────────────────────

interface GraphNode {
    tag: string;
    role: string;
    blockType: string;
    category: 'document' | 'action';
    label: string;
    schemaUuid: string | null;
    order: number;
}
interface GraphEdge { source: string; target: string; kind: 'flow' | 'sequence' }
interface Graph { roles: string[]; nodes: GraphNode[]; edges: GraphEdge[] }

const graph = ref<Graph | null>(null);
const loading = ref(false);

const projectId = computed(() => props.project.sourceTimestamp ?? props.project.id);

async function loadGraph() {
    if (!import.meta.client || !projectId.value) return;
    loading.value = true;
    try {
        const baseURL = config.public.apiBaseUrl as string;
        graph.value = await $fetch<Graph>(
            `/api/v1/${network.value}/projects/${projectId.value}/policy-graph`,
            { baseURL },
        );
    } catch {
        graph.value = { roles: [], nodes: [], edges: [] };
    } finally {
        loading.value = false;
    }
}
onMounted(loadGraph);
watch(projectId, loadGraph);

// ── VC-data overlay (match graph node schemaUuid → linkedSchemas) ─────────────

function formatTimestamp(ts: string): string {
    if (!ts) return '—';
    const secs = parseFloat(ts);
    return isNaN(secs) ? ts : new Date(secs * 1000).toLocaleString();
}

interface VcInfo { vcCount: number; latestVc: { consensusTimestamp: string; topicId: string } | null }

const vcByUuid = computed<Record<string, VcInfo>>(() => {
    const out: Record<string, VcInfo> = {};
    for (const s of (props.project.linkedSchemas ?? []) as LinkedSchema[]) {
        const sorted = [...s.linkedVcs].sort((a, b) => b.consensusTimestamp.localeCompare(a.consensusTimestamp));
        out[s.schemaUuid] = {
            vcCount: s.vcCount,
            latestVc: sorted.length ? { consensusTimestamp: sorted[0].consensusTimestamp, topicId: sorted[0].topicId } : null,
        };
    }
    return out;
});

// ── Swimlane layout (lane per role, x by authored order within lane) ──────────

const LANE_H = 150;
const COL_W = 240;
const LABEL_W = 150;
const TOP_PAD = 34;

interface NodeData {
    label: string;
    role: string;
    category: 'document' | 'action';
    vcCount: number;
    latestVc: { consensusTimestamp: string; topicId: string } | null;
    schemaName: string;
}

// Lanes = roles that actually contain at least one node, in graph.roles order.
const lanes = computed<string[]>(() => {
    const g = graph.value;
    if (!g) return [];
    const used = new Set(g.nodes.map(n => n.role));
    const ordered = g.roles.filter(r => used.has(r));
    for (const r of used) if (!ordered.includes(r)) ordered.push(r);
    return ordered;
});

const nodes = computed<Node[]>(() => {
    const g = graph.value;
    if (!g || g.nodes.length === 0) return [];
    const laneList = lanes.value;
    const laneIndex = Object.fromEntries(laneList.map((r, i) => [r, i]));
    const vc = vcByUuid.value;

    const out: Node[] = [];

    // Lane label nodes (left gutter).
    laneList.forEach((role, i) => {
        out.push({
            id: `lane-${i}`,
            type: 'lane',
            position: { x: 0, y: i * LANE_H + TOP_PAD },
            data: { role },
            draggable: false,
            selectable: false,
        });
    });

    // Step nodes: x = rank within lane (by authored order), y = lane.
    const rankInLane = new Map<string, number>();
    const counters = new Map<string, number>();
    [...g.nodes].sort((a, b) => a.order - b.order).forEach(n => {
        const c = counters.get(n.role) ?? 0;
        rankInLane.set(n.tag, c);
        counters.set(n.role, c + 1);
    });

    for (const n of g.nodes) {
        const info = n.schemaUuid ? vc[n.schemaUuid] : undefined;
        out.push({
            id: n.tag,
            type: 'step',
            position: {
                x: LABEL_W + (rankInLane.get(n.tag) ?? 0) * COL_W,
                y: (laneIndex[n.role] ?? 0) * LANE_H + TOP_PAD,
            },
            data: {
                label: n.label,
                role: n.role,
                category: n.category,
                vcCount: info?.vcCount ?? 0,
                latestVc: info?.latestVc ?? null,
                schemaName: n.label,
            } satisfies NodeData,
        });
    }
    return out;
});

const edges = computed<Edge[]>(() => {
    const g = graph.value;
    if (!g) return [];
    return g.edges.map((e, i) => {
        const isFlow = e.kind === 'flow';
        // Concrete colors (not CSS vars) so the lines are clearly visible on the
        // light canvas, plus an arrowhead so direction reads at a glance.
        const color = isFlow ? '#6366f1' : '#94a3b8'; // indigo (flow) / slate (sequence)
        return {
            id: `e-${i}-${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            animated: isFlow,
            markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
            style: isFlow
                ? { stroke: color, strokeWidth: 2 }
                : { stroke: color, strokeWidth: 1.75, strokeDasharray: '6 4' },
        };
    });
});

const canvasHeight = computed(() => Math.max(300, lanes.value.length * LANE_H + 60));

// ── Decode-method badge (unchanged) ──────────────────────────────────────────

interface DecodeMeta { label: string; desc: string; chip: string }
const decodeMeta = computed((): DecodeMeta => {
    switch (props.project.decodeMethod) {
        case 'topic':         return { label: 'Dynamic Topic ID',      desc: 'Project resolved via HCS topic',         chip: 'bg-primary/10 text-primary border-primary/20' };
        case 'csRef':         return { label: 'CS Ref · Trust Chain',  desc: 'Credential subject reference chain',     chip: 'bg-sky-50 text-sky-700 border-sky-200' };
        case 'relationships': return { label: 'Message Relationship',  desc: 'Resolved through message relationships', chip: 'bg-amber-50 text-amber-700 border-amber-200' };
        case 'projectSchema': return { label: 'Single Schema Derived', desc: 'Derived from a single project schema VC', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        default:              return { label: 'Unknown',               desc: 'Resolver method not recorded',           chip: 'bg-muted text-muted-foreground border-border' };
    }
});

// Resolution anchor (M1: dynamic topic; M2/M3/M4: root VC timestamp).
const anchor = computed<{ label: string; value: string } | null>(() => {
    const m = (props.project.metadata ?? {}) as Record<string, unknown>;
    if (typeof m['dynamicTopicId'] === 'string') return { label: 'Dynamic topic', value: m['dynamicTopicId'] };
    if (typeof m['rootVcTimestamp'] === 'string') return { label: 'Root VC', value: m['rootVcTimestamp'] };
    return null;
});

// ── Raw-VC drawer ─────────────────────────────────────────────────────────────

const drawerOpen = ref(false);
const activeData = ref<NodeData | null>(null);
function openDrawer(d: NodeData) {
    activeData.value = d;
    drawerOpen.value = true;
}

// ── Policy JSON inspector ─────────────────────────────────────────────────────

const jsonOpen = ref(false);
const jsonLoading = ref(false);
const policyJson = ref<string>('');

async function openPolicyJson() {
    jsonOpen.value = true;
    if (policyJson.value || !import.meta.client) return;
    jsonLoading.value = true;
    try {
        const baseURL = config.public.apiBaseUrl as string;
        const raw = await $fetch<Record<string, unknown> | null>(
            `/api/v1/${network.value}/projects/${projectId.value}/policy-json`,
            { baseURL },
        );
        policyJson.value = raw ? JSON.stringify(raw, null, 2) : '// No decoded policy available for this project.';
    } catch {
        policyJson.value = '// Failed to load policy JSON.';
    } finally {
        jsonLoading.value = false;
    }
}
</script>

<template>
    <div class="overflow-hidden rounded-xl border bg-card">
        <!-- Header -->
        <div class="border-b bg-muted/30 px-5 py-3.5">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText class="h-4 w-4 text-primary" />
                    Policy Flowchart
                </h2>
                <div class="flex items-center gap-2">
                    <span
                        :class="['inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium', decodeMeta.chip]"
                        :title="decodeMeta.desc"
                    >
                        {{ decodeMeta.label }}
                    </span>
                    <button
                        class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        title="View the raw policy.json"
                        @click="openPolicyJson"
                    >
                        <Braces class="h-3.5 w-3.5" />
                        Policy JSON
                    </button>
                </div>
            </div>
            <p class="mt-0.5 text-[11px] text-muted-foreground">
                Role swimlanes of the methodology's documents, in the policy's authored step order. Pan and zoom to explore.
            </p>
            <div v-if="project.projectKey || anchor" class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span v-if="project.projectKey" class="flex items-center gap-1.5">
                    <span class="font-medium uppercase tracking-wider">Project key</span>
                    <code class="max-w-[320px] truncate rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground" :title="project.projectKey">{{ project.projectKey }}</code>
                </span>
                <span v-if="anchor" class="flex items-center gap-1.5">
                    <span class="font-medium uppercase tracking-wider">{{ anchor.label }}</span>
                    <code class="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground" :title="anchor.value">{{ anchor.value }}</code>
                </span>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
            <Loader2 class="h-4 w-4 animate-spin" /> Loading methodology workflow…
        </div>

        <!-- Empty -->
        <div v-else-if="nodes.length === 0" class="px-5 py-10 text-center text-sm text-muted-foreground">
            No decoded methodology workflow available for this project yet.
        </div>

        <!-- Canvas -->
        <div v-else class="w-full overflow-hidden" :style="{ height: canvasHeight + 'px' }">
            <VueFlow :nodes="nodes" :edges="edges" :fit-view-on-init="true" class="h-full w-full">
                <!-- Lane label -->
                <template #node-lane="{ data }">
                    <div class="flex h-[120px] w-[140px] items-center">
                        <div class="rounded-md bg-muted/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {{ data.role }}
                        </div>
                    </div>
                </template>

                <!-- Document / action step -->
                <template #node-step="{ data }">
                    <div class="relative w-[210px] rounded-lg border bg-card px-3 py-2 shadow-sm">
                        <!-- Handles let VueFlow attach the sequence/flow edges. -->
                        <Handle type="target" :position="Position.Left" class="!h-2 !w-2 !border !border-border !bg-muted" />
                        <Handle type="source" :position="Position.Right" class="!h-2 !w-2 !border !border-border !bg-muted" />
                        <div class="flex items-center gap-1.5">
                            <span :class="['inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full', data.category === 'action' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary']">
                                <component :is="data.category === 'action' ? Coins : FileText" class="h-3.5 w-3.5" />
                            </span>
                            <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                {{ data.category === 'action' ? 'Action' : 'Document' }}
                            </span>
                        </div>

                        <h3 class="mt-1 truncate text-xs font-semibold text-foreground" :title="data.label">{{ data.label }}</h3>

                        <div class="mt-1.5 flex items-center justify-between gap-1">
                            <div class="flex min-w-0 items-center gap-1">
                                <template v-if="data.vcCount > 0">
                                    <CheckCircle2 class="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                    <span class="truncate text-[11px] text-emerald-700">
                                        Data present · {{ formatTimestamp(data.latestVc?.consensusTimestamp ?? '') }}
                                    </span>
                                </template>
                                <template v-else>
                                    <Circle class="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                                    <span class="text-[11px] text-muted-foreground">Awaiting data</span>
                                </template>
                            </div>
                            <button
                                v-if="data.vcCount > 0"
                                class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                title="View raw VC"
                                @mousedown.stop
                                @click.stop="openDrawer(data)"
                            >
                                <Info class="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </template>
            </VueFlow>
        </div>

        <!-- Legend -->
        <div v-if="nodes.length > 0" class="flex flex-wrap items-center gap-4 border-t px-5 py-2 text-[11px] text-muted-foreground">
            <span class="flex items-center gap-1.5"><span class="inline-block h-0 w-5 border-t-2 border-primary" /> Genuine flow event</span>
            <span class="flex items-center gap-1.5"><span class="inline-block h-0 w-5 border-t-2 border-dashed border-border" /> Authored step order</span>
            <span class="flex items-center gap-1.5"><CheckCircle2 class="h-3 w-3 text-emerald-500" /> Data present</span>
        </div>
    </div>

    <!-- RawVcDrawer -->
    <RawVcDrawer
        :open="drawerOpen"
        :project-id="projectId"
        :network="network"
        :consensus-timestamp="activeData?.latestVc?.consensusTimestamp ?? ''"
        :schema-name="activeData?.schemaName ?? null"
        :topic-id="activeData?.latestVc?.topicId ?? null"
        @close="drawerOpen = false"
    />

    <!-- Policy JSON inspector -->
    <Teleport to="body">
        <div v-if="jsonOpen" class="fixed inset-0 z-50 flex justify-end">
            <div class="absolute inset-0 bg-black/40" @click="jsonOpen = false" />
            <div class="relative z-10 flex h-full w-full max-w-2xl flex-col border-l bg-card shadow-xl">
                <div class="flex items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
                    <h3 class="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Braces class="h-4 w-4 text-primary" /> Policy JSON
                    </h3>
                    <button class="text-muted-foreground transition-colors hover:text-foreground" @click="jsonOpen = false">
                        <X class="h-4 w-4" />
                    </button>
                </div>
                <div class="flex-1 overflow-auto p-4">
                    <div v-if="jsonLoading" class="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                        <Loader2 class="h-4 w-4 animate-spin" /> Loading policy.json…
                    </div>
                    <pre v-else class="whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-3 font-mono text-[11px] leading-relaxed text-foreground">{{ policyJson }}</pre>
                </div>
            </div>
        </div>
    </Teleport>
</template>
