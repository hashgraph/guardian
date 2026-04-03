<script setup lang="ts">
interface RelNode {
    id: string;
    label: string;
    fullLabel: string;
    type: 'registry' | 'policy' | 'schema' | 'role' | 'vc' | 'vp' | 'token';
    x: number;
    y: number;
}

interface RelEdge {
    from: string;
    to: string;
}

const props = defineProps<{
    projectName: string;
    methodology: string;
    methodologyId: string;
    registry: string;
    developer: string;
    projectId: string;
    vintage: string;
    country: string;
    sector: string;
    tokenSymbol?: string;
    tokenName?: string;
    tokenId?: string;
}>();

const emit = defineEmits<{
    'view-vc': [data: { title: string; vc: Record<string, any> }];
}>();

const typeColors: Record<string, { fill: string; stroke: string; label: string }> = {
    registry: { fill: '#4361ee', stroke: '#3a56d4', label: 'Registry' },
    policy:   { fill: '#66bb6a', stroke: '#4caf50', label: 'Policy' },
    schema:   { fill: '#ffa726', stroke: '#fb8c00', label: 'Schema' },
    role:     { fill: '#ef5350', stroke: '#e53935', label: 'Role' },
    vc:       { fill: '#81d4fa', stroke: '#4fc3f7', label: 'Raw Data' },
    vp:       { fill: '#388e3c', stroke: '#2e7d32', label: 'VP' },
    token:    { fill: '#ff8a65', stroke: '#ff7043', label: 'Token' },
};

const hoveredNode = ref<string | null>(null);
const selectedNode = ref<string | null>(null);
const popoverPos = ref({ x: 0, y: 0 });
const svgRef = ref<SVGSVGElement | null>(null);

function truncate(str: string, max: number): string {
    return str.length > max ? str.substring(0, max) + '...' : str;
}

const nodes = computed<RelNode[]>(() => {
    const methShort = truncate(props.methodology, 12);
    const regShort = truncate(props.registry, 14);
    const tokenSym = props.tokenSymbol || 'VER';
    const tokenLabel = props.tokenName ? truncate(props.tokenName, 12) : 'MintToken';

    return [
        { id: 'registry',       label: regShort,           fullLabel: props.registry,                     type: 'registry', x: 100, y: 180 },
        { id: 'policy-1',       label: methShort,          fullLabel: props.methodology,                  type: 'policy',   x: 280, y: 100 },
        { id: 'mint-token',     label: tokenLabel,         fullLabel: props.tokenName || 'MintToken',     type: 'schema',   x: 460, y: 100 },
        { id: 'vvb-verify-1',   label: 'VVB Verificat...', fullLabel: 'VVB Verification Report',         type: 'vc',       x: 680, y: 100 },
        { id: 'ver-1',          label: tokenSym,           fullLabel: `${tokenSym} Token`,                type: 'token',    x: 880, y: 100 },
        { id: 'vvb',            label: 'VVB',              fullLabel: 'Validation & Verification Body',   type: 'role',     x: 560, y: 230 },
        { id: 'policy-2',       label: methShort,          fullLabel: `${props.methodology} (v2)`,        type: 'policy',   x: 280, y: 320 },
        { id: 'vvb-verify-2',   label: 'VVB Verificat...', fullLabel: 'VVB Verification Document',       type: 'vc',       x: 460, y: 320 },
        { id: 'mint-token-doc', label: 'MintToken Do...', fullLabel: 'MintToken Document VP',             type: 'vp',       x: 680, y: 320 },
        { id: 'ver-2',          label: tokenSym,           fullLabel: `${tokenSym} Retirement Token`,     type: 'token',    x: 880, y: 320 },
    ];
});

const edges = computed<RelEdge[]>(() => [
    { from: 'registry', to: 'policy-1' },
    { from: 'registry', to: 'policy-2' },
    { from: 'policy-1', to: 'mint-token' },
    { from: 'policy-1', to: 'vvb' },
    { from: 'mint-token', to: 'vvb-verify-1' },
    { from: 'vvb-verify-1', to: 'ver-1' },
    { from: 'vvb', to: 'vvb-verify-1' },
    { from: 'vvb', to: 'vvb-verify-2' },
    { from: 'vvb', to: 'mint-token-doc' },
    { from: 'policy-2', to: 'vvb-verify-2' },
    { from: 'vvb-verify-2', to: 'mint-token-doc' },
    { from: 'mint-token-doc', to: 'ver-2' },
    { from: 'mint-token', to: 'vvb' },
    { from: 'policy-2', to: 'vvb' },
]);

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
    return typeColors[from.type]?.stroke || '#ccc';
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

// Generate a mock hashscan transaction ID per node (deterministic from project + node id)
function nodeHashscanUrl(node: RelNode): string {
    const base = parseInt(props.projectId) || 1;
    const hash = node.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const seconds = 1774094386 + base * 1000 + hash * 100;
    const nanos = (base * 32210979 + hash * 854625) % 1000000000;
    return `https://hashscan.io/mainnet/transaction/${seconds}.${String(nanos).padStart(9, '0')}`;
}

// Generate a mock VC for each node entity
function nodeVc(node: RelNode): Record<string, any> {
    const issuer = `did:hedera:testnet:z6Mk${props.registry.replace(/\s+/g, '')}Registry`;
    const baseVc = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://w3id.org/security/suites/ed25519-2020/v1',
        ],
        id: `urn:uuid:${node.id}-${props.projectId}`,
        type: ['VerifiableCredential'],
        issuer,
        issuanceDate: new Date().toISOString(),
    };

    const vcByType: Record<string, any> = {
        registry: {
            ...baseVc,
            credentialSubject: [{
                type: 'StandardRegistry',
                name: props.registry,
                did: issuer,
                network: 'mainnet',
                status: 'Issuing',
                policies: [props.methodology],
            }],
        },
        policy: {
            ...baseVc,
            credentialSubject: [{
                type: 'PolicyDocument',
                policyName: props.methodology,
                policyId: props.methodologyId,
                registry: props.registry,
                version: node.id === 'policy-1' ? '1.0' : '2.0',
                status: 'Published',
                sector: props.sector,
                country: props.country,
            }],
        },
        schema: {
            ...baseVc,
            credentialSubject: [{
                type: 'MintTokenSchema',
                tokenName: props.tokenName || 'MintToken',
                tokenSymbol: props.tokenSymbol || 'VER',
                tokenId: props.tokenId || '0.0.48291',
                tokenType: 'Fungible',
                methodology: props.methodology,
                project: props.projectName,
            }],
        },
        role: {
            ...baseVc,
            credentialSubject: [{
                type: 'RoleAssignment',
                roleName: 'VVB',
                roleDescription: 'Validation & Verification Body',
                assignedTo: `did:hedera:testnet:z6MkVVB${props.projectId}`,
                registry: props.registry,
                methodology: props.methodology,
            }],
        },
        vc: {
            ...baseVc,
            credentialSubject: [{
                type: 'VVBVerificationReport',
                project: props.projectName,
                methodology: props.methodology,
                verificationBody: 'VVB',
                verificationDate: new Date().toISOString().split('T')[0],
                result: 'Approved',
                vintage: props.vintage,
                emissionReductions: { unit: 'tCO2e' },
            }],
        },
        vp: {
            ...baseVc,
            type: ['VerifiablePresentation'],
            credentialSubject: [{
                type: 'MintTokenDocument',
                project: props.projectName,
                tokenName: props.tokenName || 'MintToken',
                tokenId: props.tokenId || '0.0.48291',
                methodology: props.methodology,
                registry: props.registry,
                vintage: props.vintage,
                verificationStatus: 'Verified',
            }],
        },
        token: {
            ...baseVc,
            credentialSubject: [{
                type: 'TokenIssuance',
                tokenId: props.tokenId || '0.0.48291',
                tokenName: props.tokenName || 'Carbon Credit',
                tokenSymbol: props.tokenSymbol || 'VER',
                tokenType: 'Fungible',
                project: props.projectName,
                registry: props.registry,
                vintage: props.vintage,
            }],
        },
    };

    const vc = vcByType[node.type] || baseVc;
    vc.proof = {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `${issuer}#key-1`,
        proofPurpose: 'assertionMethod',
        proofValue: 'z3FXQFBYhSMYDNaUbDfcideGfreKPJLx9bFPmNTNg7CvX8rZpPJLHJ5BpQz1p5vZVp3LdNeDx8k93HQDbVMnEsJA2',
    };
    return vc;
}

function onNodeClick(node: RelNode, event: MouseEvent) {
    if (selectedNode.value === node.id) {
        selectedNode.value = null;
        return;
    }
    selectedNode.value = node.id;

    // Position popover near click relative to the container
    if (svgRef.value) {
        const rect = svgRef.value.getBoundingClientRect();
        popoverPos.value = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }
}

function onViewVc(node: RelNode) {
    emit('view-vc', { title: node.fullLabel, vc: nodeVc(node) });
    selectedNode.value = null;
}

function closePopover() {
    selectedNode.value = null;
}

const selectedNodeData = computed(() => {
    if (!selectedNode.value) return null;
    return nodeById(selectedNode.value) || null;
});

// Clamp popover to stay in view
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
                viewBox="0 0 980 420"
                class="w-full min-w-[700px]"
                style="max-height: 420px;"
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
                    <!-- Outer glow on hover -->
                    <circle
                        v-if="hoveredNode === node.id"
                        :cx="node.x"
                        :cy="node.y"
                        :r="nodeRadius + 6"
                        :fill="typeColors[node.type].fill"
                        opacity="0.15"
                    />

                    <!-- Selected ring -->
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

                    <!-- Main circle -->
                    <circle
                        :cx="node.x"
                        :cy="node.y"
                        :r="nodeRadius"
                        :fill="typeColors[node.type].fill"
                        :stroke="typeColors[node.type].stroke"
                        stroke-width="2"
                        filter="url(#node-shadow)"
                    />

                    <!-- Label -->
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

                    <!-- Type label below -->
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
                    <!-- Header -->
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

                    <!-- Actions -->
                    <div class="p-2 space-y-0.5">
                        <button
                            class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                            @click.stop="onViewVc(selectedNodeData!)"
                        >
                            <svg class="h-4 w-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
                                <polyline stroke-linecap="round" stroke-linejoin="round" stroke-width="2" points="14 2 14 8 20 8"/>
                            </svg>
                            View Raw Data
                        </button>
                        <a
                            :href="nodeHashscanUrl(selectedNodeData!)"
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
                            View on Explorer
                        </a>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>
