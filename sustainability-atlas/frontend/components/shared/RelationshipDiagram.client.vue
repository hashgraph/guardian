<script setup lang="ts">
import type { Project, ProjectIssuance, LinkedSchema } from '~/types/models';

interface RelNode {
    id: string;
    label: string;
    fullLabel: string;
    type: 'registry' | 'policy' | 'schema' | 'vc' | 'token';
    x: number;
    y: number;
    /** When set, click → fetch this VC's full document via /linked-vcs/:ts. */
    consensusTimestamp?: string;
    /** When set, render an explorer link in the popover. */
    explorerUrl?: string;
    /** Pre-built metadata to show as the "raw data" for non-VC nodes. */
    inlineDoc?: Record<string, any>;
}

interface RelEdge {
    from: string;
    to: string;
}

const props = defineProps<{
    project: Project;
    network: string;
}>();

const emit = defineEmits<{
    'view-vc': [data: { title: string; vc: Record<string, any> }];
}>();

const { t } = useI18n();
const config = useRuntimeConfig();
const baseURL = config.public.apiBaseUrl as string;

const typeColors = computed<Record<string, { fill: string; stroke: string; label: string }>>(() => ({
    registry: { fill: '#4361ee', stroke: '#3a56d4', label: t('relationshipDiagram.registry') },
    policy:   { fill: '#66bb6a', stroke: '#4caf50', label: t('relationshipDiagram.policy') },
    schema:   { fill: '#ffa726', stroke: '#fb8c00', label: t('relationshipDiagram.schema') },
    vc:       { fill: '#81d4fa', stroke: '#4fc3f7', label: t('relationshipDiagram.rawData') },
    token:    { fill: '#ff8a65', stroke: '#ff7043', label: t('relationshipDiagram.token') },
}));

const hoveredNode = ref<string | null>(null);
const selectedNode = ref<string | null>(null);
const popoverPos = ref({ x: 0, y: 0 });
const svgRef = ref<SVGSVGElement | null>(null);

function truncate(str: string, max: number): string {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '…' : str;
}

// ---------------------------------------------------------------------------
// Layout — 5 columns (Registry · Policy · Schemas · VCs · Tokens). Vertical
// spacing scales with the largest column.
// ---------------------------------------------------------------------------

const COL_X = { registry: 90, policy: 280, schema: 480, vc: 700, token: 900 };
const ROW_HEIGHT = 90;
const PAD_TOP = 60;

interface Layout {
    nodes: RelNode[];
    edges: RelEdge[];
    height: number;
}

const layout = computed<Layout>(() => {
    const p = props.project;
    const nodes: RelNode[] = [];
    const edges: RelEdge[] = [];

    const linkedSchemas = (p.linkedSchemas ?? []) as LinkedSchema[];
    const issuances = (p.issuances ?? []) as ProjectIssuance[];

    // For schemas, keep only those with at least one linked VC. MintToken
    // contributions are represented as token nodes instead, so we collapse
    // those into the token column rather than rendering a duplicate schema.
    const visibleSchemas = linkedSchemas.filter(
        s => s.vcCount > 0 && s.schemaUuid !== 'MintToken',
    );

    // ── Row planning ───────────────────────────────────────────────────────
    // Each schema occupies max(1, vcCount) rows so its VCs can sit beside it
    // without overlap. The schema centers in the middle of its row span.
    const schemaSpans: Array<{ schema: LinkedSchema; startRow: number; rows: number }> = [];
    let cursor = 0;
    for (const s of visibleSchemas) {
        const rows = Math.max(1, s.linkedVcs.length);
        schemaSpans.push({ schema: s, startRow: cursor, rows });
        cursor += rows;
    }
    const schemaRows = Math.max(cursor, 1);

    // Token rows determine the column-5 height; we leave them independent.
    const tokenRows = Math.max(issuances.length, 0);
    const totalRows = Math.max(schemaRows, tokenRows, 3);   // min 3 for nice spacing
    const height = PAD_TOP * 2 + totalRows * ROW_HEIGHT;
    const centerY = PAD_TOP + (totalRows * ROW_HEIGHT) / 2;

    // ── Registry ──────────────────────────────────────────────────────────
    const registryId = 'registry';
    nodes.push({
        id: registryId,
        label: truncate(p.registry || '—', 14),
        fullLabel: p.registry || 'Registry',
        type: 'registry',
        x: COL_X.registry,
        y: centerY,
        inlineDoc: {
            type: 'StandardRegistry',
            name: p.registry || null,
            did: p.registryDid || null,
            network: props.network,
        },
    });

    // ── Policy (this project's specific methodology version) ──────────────
    const policyId = 'policy';
    nodes.push({
        id: policyId,
        label: truncate(p.methodology || '—', 14),
        fullLabel: p.methodology || 'Methodology',
        type: 'policy',
        x: COL_X.policy,
        y: centerY,
        explorerUrl: p.instanceTopicId
            ? `https://hashscan.io/${props.network}/topic/${p.instanceTopicId}`
            : undefined,
        inlineDoc: {
            type: 'PolicyVersion',
            name: p.methodology || null,
            methodologyId: p.methodologyId || null,
            instanceTopicId: p.instanceTopicId || null,
            policyTopicId: p.policyTopicId || null,
            registry: p.registry || null,
        },
    });
    edges.push({ from: registryId, to: policyId });

    // ── Schemas + their VCs ───────────────────────────────────────────────
    for (const span of schemaSpans) {
        const { schema, startRow, rows } = span;
        const schemaY = PAD_TOP + (startRow + rows / 2) * ROW_HEIGHT;
        const schemaId = `schema-${schema.schemaUuid}`;
        nodes.push({
            id: schemaId,
            label: truncate(schema.schemaName ?? schema.schemaUuid, 14),
            fullLabel: schema.schemaName ?? schema.schemaUuid,
            type: 'schema',
            x: COL_X.schema,
            y: schemaY,
            inlineDoc: {
                type: 'PolicySchema',
                schemaUuid: schema.schemaUuid,
                name: schema.schemaName,
                isProjectSchema: schema.isProjectSchema,
                vcCount: schema.vcCount,
            },
        });
        edges.push({ from: policyId, to: schemaId });

        schema.linkedVcs.forEach((vc, i) => {
            const vy = PAD_TOP + (startRow + i + 0.5) * ROW_HEIGHT;
            const vcId = `vc-${vc.consensusTimestamp}`;
            nodes.push({
                id: vcId,
                label: truncate(vc.consensusTimestamp.split('.')[0], 12),
                fullLabel: vc.consensusTimestamp,
                type: 'vc',
                x: COL_X.vc,
                y: vy,
                consensusTimestamp: vc.consensusTimestamp,
                explorerUrl: `https://hashscan.io/${props.network}/transaction/${vc.consensusTimestamp}`,
            });
            edges.push({ from: schemaId, to: vcId });
        });
    }

    // ── Tokens (issuances) ────────────────────────────────────────────────
    issuances.forEach((iss, i) => {
        const ty = tokenRows > 0
            ? PAD_TOP + (i + 0.5) * (totalRows / tokenRows) * ROW_HEIGHT
            : centerY;
        const tokenId = `token-${iss.tokenId || i}`;
        nodes.push({
            id: tokenId,
            label: truncate(iss.symbol || iss.name || iss.tokenId, 10),
            fullLabel: iss.name ? `${iss.name}${iss.symbol ? ` (${iss.symbol})` : ''}` : (iss.tokenId || 'Token'),
            type: 'token',
            x: COL_X.token,
            y: ty,
            explorerUrl: iss.tokenId
                ? `https://hashscan.io/${props.network}/token/${iss.tokenId}`
                : undefined,
            inlineDoc: iss.rawVc ?? {
                type: 'TokenIssuance',
                tokenId: iss.tokenId,
                tokenName: iss.name,
                tokenSymbol: iss.symbol,
                supply: iss.supply,
                mintDate: iss.mintDate,
            },
        });
        edges.push({ from: policyId, to: tokenId });
    });

    return { nodes, edges, height };
});

const nodes = computed(() => layout.value.nodes);
const edges = computed(() => layout.value.edges);
const viewBoxHeight = computed(() => layout.value.height);

function nodeById(id: string): RelNode | undefined {
    return nodes.value.find(n => n.id === id);
}

function edgePath(edge: RelEdge): string {
    const from = nodeById(edge.from);
    const to = nodeById(edge.to);
    if (!from || !to) return '';
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cx = from.x + dx * 0.5;
    const cy = from.y + dy * 0.3;
    return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

function edgeColor(edge: RelEdge): string {
    const from = nodeById(edge.from);
    if (!from) return '#ccc';
    return typeColors.value[from.type]?.stroke || '#ccc';
}

function isEdgeHighlighted(edge: RelEdge): boolean {
    if (!hoveredNode.value) return false;
    return edge.from === hoveredNode.value || edge.to === hoveredNode.value;
}

function isNodeHighlighted(node: RelNode): boolean {
    if (!hoveredNode.value) return true;
    if (node.id === hoveredNode.value) return true;
    return edges.value.some(e =>
        (e.from === hoveredNode.value && e.to === node.id) ||
        (e.to === hoveredNode.value && e.from === node.id),
    );
}

function onNodeClick(node: RelNode, event: MouseEvent) {
    if (selectedNode.value === node.id) {
        selectedNode.value = null;
        return;
    }
    selectedNode.value = node.id;

    if (svgRef.value) {
        const rect = svgRef.value.getBoundingClientRect();
        popoverPos.value = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }
}

async function onViewRawData(node: RelNode) {
    selectedNode.value = null;

    // VC node: fetch the real document from the API.
    if (node.consensusTimestamp) {
        try {
            const data = await $fetch<Record<string, any>>(
                `/api/v1/${props.network}/projects/${props.project.id}/linked-vcs/${node.consensusTimestamp}`,
                { baseURL },
            );
            emit('view-vc', { title: node.fullLabel, vc: data });
        } catch {
            const { toast } = await import('vue-sonner');
            toast.error('Failed to load raw data');
        }
        return;
    }

    // Other node types: emit the pre-built inline metadata so the parent's
    // VcJsonViewer can show it just like any other JSON document.
    if (node.inlineDoc) {
        emit('view-vc', { title: node.fullLabel, vc: node.inlineDoc });
    }
}

function closePopover() {
    selectedNode.value = null;
}

const selectedNodeData = computed(() => {
    if (!selectedNode.value) return null;
    return nodeById(selectedNode.value) || null;
});

const popoverStyle = computed(() => {
    const x = Math.min(Math.max(popoverPos.value.x - 140, 8), 600);
    const y = popoverPos.value.y + 16;
    return { left: `${x}px`, top: `${y}px` };
});

const nodeRadius = 36;
</script>

<template>
    <div class="w-full">
        <!-- Legend -->
        <div class="flex flex-wrap items-center gap-4 mb-4">
            <div
                v-for="(val, key) in typeColors"
                :key="key"
                class="flex items-center gap-1.5"
            >
                <span
                    class="h-3 w-3 rounded-sm"
                    :style="{ backgroundColor: val.fill }"
                />
                <span class="text-[11px] text-muted-foreground">{{ val.label }}</span>
            </div>
        </div>

        <!-- SVG Diagram -->
        <div class="relative w-full overflow-x-auto" @click.self="closePopover">
            <svg
                ref="svgRef"
                :viewBox="`0 0 980 ${viewBoxHeight}`"
                class="w-full min-w-[700px]"
                :style="{ maxHeight: `${Math.min(viewBoxHeight, 600)}px` }"
                @mouseleave="hoveredNode = null"
            >
                <defs>
                    <marker
                        v-for="(val, key) in typeColors"
                        :key="key"
                        :id="`arrow-${key}`"
                        markerWidth="8"
                        markerHeight="6"
                        refX="7"
                        refY="3"
                        orient="auto"
                    >
                        <polygon :points="'0 0, 8 3, 0 6'" :fill="val.stroke" opacity="0.6" />
                    </marker>

                    <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12" />
                    </filter>
                </defs>

                <!-- Edges -->
                <g>
                    <path
                        v-for="(edge, idx) in edges"
                        :key="`edge-${idx}`"
                        :d="edgePath(edge)"
                        fill="none"
                        :stroke="edgeColor(edge)"
                        :stroke-width="isEdgeHighlighted(edge) ? 2 : 1.2"
                        :opacity="hoveredNode ? (isEdgeHighlighted(edge) ? 0.7 : 0.12) : 0.35"
                        :marker-end="`url(#arrow-${nodeById(edge.from)?.type || 'vc'})`"
                        class="transition-all duration-200"
                    />
                </g>

                <!-- Nodes -->
                <g
                    v-for="node in nodes"
                    :key="node.id"
                    class="cursor-pointer"
                    :opacity="isNodeHighlighted(node) ? 1 : 0.25"
                    style="transition: opacity 0.2s ease;"
                    @mouseenter="hoveredNode = node.id"
                    @click="onNodeClick(node, $event)"
                >
                    <circle
                        v-if="hoveredNode === node.id"
                        :cx="node.x"
                        :cy="node.y"
                        :r="nodeRadius + 6"
                        :fill="typeColors[node.type].fill"
                        opacity="0.15"
                    />

                    <circle
                        v-if="selectedNode === node.id"
                        :cx="node.x"
                        :cy="node.y"
                        :r="nodeRadius + 4"
                        fill="none"
                        stroke="white"
                        stroke-width="3"
                        opacity="0.9"
                    />

                    <circle
                        :cx="node.x"
                        :cy="node.y"
                        :r="nodeRadius"
                        :fill="typeColors[node.type].fill"
                        :stroke="typeColors[node.type].stroke"
                        stroke-width="2"
                        filter="url(#node-shadow)"
                    />

                    <text
                        :x="node.x"
                        :y="node.y + 1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        fill="white"
                        font-size="11"
                        font-weight="600"
                        style="pointer-events: none;"
                    >
                        {{ node.label }}
                    </text>

                    <text
                        :x="node.x"
                        :y="node.y + nodeRadius + 14"
                        text-anchor="middle"
                        :fill="typeColors[node.type].stroke"
                        font-size="10"
                        font-weight="500"
                        opacity="0.8"
                        style="pointer-events: none;"
                    >
                        {{ typeColors[node.type].label }}
                    </text>
                </g>

                <!-- Empty state — no schemas / no VCs / no issuances -->
                <text
                    v-if="nodes.length <= 2"
                    :x="490"
                    :y="viewBoxHeight / 2 + 80"
                    text-anchor="middle"
                    fill="#999"
                    font-size="12"
                >
                    No schemas, VCs, or issuances linked to this project yet
                </text>
            </svg>

            <!-- Click popover -->
            <Transition
                enter-active-class="transition ease-out duration-150"
                enter-from-class="opacity-0 scale-95 translate-y-1"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition ease-in duration-100"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
            >
                <div
                    v-if="selectedNodeData"
                    class="absolute z-50 w-[280px] rounded-lg border bg-card shadow-xl"
                    :style="popoverStyle"
                >
                    <div class="flex items-center gap-2.5 px-4 py-3 border-b">
                        <span
                            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            :style="{ backgroundColor: typeColors[selectedNodeData.type].fill }"
                        >
                            <span class="text-[10px] font-bold text-white uppercase">{{ selectedNodeData.type.substring(0, 2) }}</span>
                        </span>
                        <div class="min-w-0 flex-1">
                            <div class="text-sm font-semibold text-foreground truncate">{{ selectedNodeData.fullLabel }}</div>
                            <div class="text-[11px] text-muted-foreground flex items-center gap-1">
                                <span
                                    class="inline-block h-2 w-2 rounded-sm"
                                    :style="{ backgroundColor: typeColors[selectedNodeData.type].fill }"
                                />
                                {{ typeColors[selectedNodeData.type].label }}
                            </div>
                        </div>
                        <button
                            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            @click.stop="closePopover"
                        >
                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <div class="p-2 space-y-0.5">
                        <button
                            v-if="selectedNodeData.consensusTimestamp || selectedNodeData.inlineDoc"
                            class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                            @click.stop="onViewRawData(selectedNodeData!)"
                        >
                            <svg class="h-4 w-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
                                <polyline stroke-linecap="round" stroke-linejoin="round" stroke-width="2" points="14 2 14 8 20 8"/>
                            </svg>
                            {{ $t('relationshipDiagram.viewRawData') }}
                        </button>
                        <a
                            v-if="selectedNodeData.explorerUrl"
                            :href="selectedNodeData.explorerUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                            @click.stop
                        >
                            <svg class="h-4 w-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                                <polyline stroke-linecap="round" stroke-linejoin="round" stroke-width="2" points="15 3 21 3 21 9"/>
                                <line stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                            {{ $t('relationshipDiagram.viewOnExplorer') }}
                        </a>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>
