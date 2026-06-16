/**
 * Extracts a human-readable workflow graph from a Guardian policy.json so the
 * frontend can render a role-swimlane flowchart of the methodology.
 *
 * Guardian policies are large block trees (`config.children`, 150-300 blocks)
 * wired by an `events[]` graph. Most events are `RefreshEvent`s that only
 * re-render UI tables — pure noise for a workflow view. This builder keeps only
 * the document/action blocks (the steps a human cares about) and connects them
 * by the real, non-Refresh flow edges, collapsing the plumbing in between.
 */

export interface PolicyGraphNode {
    /** Block tag — unique within the policy; used as the node id. */
    tag: string;
    /** Role lane this step belongs to (from block.permissions, tag prefix, or 'General'). */
    role: string;
    blockType: string;
    category: 'document' | 'action';
    /** Display label: block title -> schema name -> friendly block type. */
    label: string;
    /** Bare schema UUID (no '#', no version) for VC-data overlay, or null. */
    schemaUuid: string | null;
    /** Authored position (pre-order index in policy.json) — the real step order. */
    order: number;
}

export interface PolicyGraphEdge {
    source: string; // node tag
    target: string; // node tag
    /**
     * 'flow'     — a genuine event transition found in policy.json (sparse; reliable).
     * 'sequence' — authored step order within a role lane (the order the policy
     *              author laid out the steps). Guardian does not statically encode
     *              doc->doc flow, so this sequence is the honest primary backbone.
     */
    kind: 'flow' | 'sequence';
}

export interface PolicyWorkflowGraph {
    /** Lane order: policyRoles first, then any extra roles found on nodes. */
    roles: string[];
    nodes: PolicyGraphNode[];
    edges: PolicyGraphEdge[];
}

const DOCUMENT_BLOCK_TYPES = new Set(['requestVcDocumentBlock', 'externalDataBlock']);
const ACTION_BLOCK_TYPES = new Set(['mintDocumentBlock', 'tokenActionBlock']);
const RESERVED_ROLES = new Set(['OWNER', 'ANY', 'NO_ROLE', '']);

const FRIENDLY_BLOCK_TYPE: Record<string, string> = {
    requestVcDocumentBlock: 'Document',
    externalDataBlock: 'External Data',
    mintDocumentBlock: 'Mint Token',
    tokenActionBlock: 'Token Action',
};

function bareUuid(iri: unknown): string | null {
    if (typeof iri !== 'string' || !iri) return null;
    const u = iri.replace(/^#/, '').split('&')[0].trim();
    return u || null;
}

function asObject(v: unknown): Record<string, unknown> | null {
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function categoryOf(blockType: string): 'document' | 'action' | null {
    if (DOCUMENT_BLOCK_TYPES.has(blockType)) return 'document';
    if (ACTION_BLOCK_TYPES.has(blockType)) return 'action';
    return null;
}

function roleOf(block: Record<string, unknown>): string {
    // Roles come ONLY from explicit block permissions — the reliable source.
    // Deriving a role from the tag prefix produced noise lanes like 'mint' /
    // 'request' / 'mrv' (lowercased block-name fragments, not real roles), so
    // unowned/system steps fall into a single 'General' lane instead.
    const perms = block['permissions'];
    if (Array.isArray(perms)) {
        const first = perms.find(p => typeof p === 'string' && !RESERVED_ROLES.has(p as string));
        if (typeof first === 'string') return first;
    }
    return 'General';
}

/**
 * Resolves a schema's human name from rawSchemaJson, matching first by exact
 * IRI then by bare UUID (rawSchemaJson keys are full IRIs).
 */
function schemaName(
    schemaIri: unknown,
    rawSchemaJson: Record<string, unknown>,
    uuid: string | null,
): string | null {
    if (typeof schemaIri === 'string' && rawSchemaJson[schemaIri]) {
        const doc = asObject(rawSchemaJson[schemaIri]);
        if (doc && typeof doc['name'] === 'string' && doc['name']) return doc['name'] as string;
    }
    if (uuid) {
        for (const [key, val] of Object.entries(rawSchemaJson)) {
            if (bareUuid(key) !== uuid) continue;
            const doc = asObject(val);
            if (doc && typeof doc['name'] === 'string' && doc['name']) return doc['name'] as string;
        }
    }
    return null;
}

function labelOf(
    block: Record<string, unknown>,
    blockType: string,
    category: 'document' | 'action',
    rawSchemaJson: Record<string, unknown>,
    uuid: string | null,
): string {
    const ui = asObject(block['uiMetaData']);
    const title = ui && typeof ui['title'] === 'string' ? (ui['title'] as string).trim() : '';
    if (title) return title;
    if (category === 'document') {
        const name = schemaName(block['schema'], rawSchemaJson, uuid);
        if (name) return name;
    }
    return FRIENDLY_BLOCK_TYPE[blockType] ?? blockType;
}

/**
 * Builds the workflow graph. Pure and fully defensive: any malformed/missing
 * input yields an empty graph rather than throwing.
 */
export function buildPolicyWorkflowGraph(
    rawPolicyJson: Record<string, unknown> | null | undefined,
    rawSchemaJson: Record<string, unknown> | null | undefined,
): PolicyWorkflowGraph {
    const empty: PolicyWorkflowGraph = { roles: [], nodes: [], edges: [] };
    const policy = asObject(rawPolicyJson);
    const config = policy ? asObject(policy['config']) : null;
    if (!config) return empty;
    const schemas = asObject(rawSchemaJson) ?? {};

    const nodes: PolicyGraphNode[] = [];
    const nodeTags = new Set<string>();
    const emittedSchema = new Set<string>(); // dedupe document nodes by schema
    const blockTypeByTag = new Map<string, string>();
    const childrenByTag = new Map<string, string[]>();
    const parentByTag = new Map<string, string>();
    // adjacency over real (non-Refresh) flow events: sourceTag -> targetTag[]
    const adj = new Map<string, string[]>();

    // DFS the block tree: collect node blocks, tree structure, flow-event
    // adjacency. The real workflow events live on sibling PLUMBING blocks
    // (buttonBlock / sendToGuardianBlock RunEvent / switchBlock), not on the
    // document/action blocks — so edges are derived at containing-screen scope.
    const walk = (block: Record<string, unknown>, parentTag: string): void => {
        const tag = typeof block['tag'] === 'string' ? (block['tag'] as string) : '';
        const blockType = typeof block['blockType'] === 'string' ? (block['blockType'] as string) : '';
        if (tag) {
            blockTypeByTag.set(tag, blockType);
            if (parentTag) {
                parentByTag.set(tag, parentTag);
                const sib = childrenByTag.get(parentTag) ?? [];
                sib.push(tag);
                childrenByTag.set(parentTag, sib);
            }
        }

        const category = categoryOf(blockType);
        if (category && tag && !nodeTags.has(tag)) {
            const uuid = category === 'document' ? bareUuid(block['schema']) : null;
            // Collapse repeated blocks that submit the SAME document schema into a
            // single node (e.g. "submit dMRV" + "edit dMRV") — keeping both was
            // confusing (one document appearing twice, both "data present"). The
            // first occurrence (authored order) wins. Action blocks (no schema)
            // are kept individually.
            if (uuid && emittedSchema.has(uuid)) {
                // duplicate document schema — skip as a node (still walked for events)
            } else {
                if (uuid) emittedSchema.add(uuid);
                nodes.push({
                    tag,
                    role: roleOf(block),
                    blockType,
                    category,
                    label: labelOf(block, blockType, category, schemas, uuid),
                    schemaUuid: uuid,
                    order: nodes.length, // pre-order index = authored position
                });
                nodeTags.add(tag);
            }
        }

        const events = block['events'];
        if (Array.isArray(events)) {
            for (const ev of events) {
                const e = asObject(ev);
                if (!e) continue;
                if (e['output'] === 'RefreshEvent') continue; // UI noise
                const source = typeof e['source'] === 'string' ? (e['source'] as string) : '';
                const target = typeof e['target'] === 'string' ? (e['target'] as string) : '';
                if (!source || !target) continue;
                const list = adj.get(source) ?? [];
                list.push(target);
                adj.set(source, list);
            }
        }

        const children = block['children'];
        if (Array.isArray(children)) {
            for (const child of children) {
                const c = asObject(child);
                if (c) walk(c, tag);
            }
        }
    };
    walk(config, '');

    const SCOPE_TYPES = new Set(['interfaceStepBlock', 'interfaceContainerBlock']);
    const rootTag = typeof config['tag'] === 'string' ? (config['tag'] as string) : '';

    // The "screen" a node lives on: nearest step/container ancestor (excluding
    // the root). Flow events on that screen's plumbing represent the node's exits.
    const scopeOf = (tag: string): string => {
        let cur = parentByTag.get(tag);
        const seen = new Set<string>();
        while (cur && !seen.has(cur)) {
            seen.add(cur);
            if (cur !== rootTag && SCOPE_TYPES.has(blockTypeByTag.get(cur) ?? '')) return cur;
            cur = parentByTag.get(cur);
        }
        return parentByTag.get(tag) ?? tag; // fall back to the direct parent
    };

    const subtreeTags = (root: string): string[] => {
        const out: string[] = [];
        const stack = [root];
        const seen = new Set<string>();
        let steps = 0;
        while (stack.length && steps < 2000) {
            steps++;
            const t = stack.pop()!;
            if (seen.has(t)) continue;
            seen.add(t);
            out.push(t);
            for (const c of childrenByTag.get(t) ?? []) stack.push(c);
        }
        return out;
    };

    // First node(s) reached descending into a subtree — the "entry steps" of a
    // target screen. Stops at the first node on each branch.
    const entryNodes = (root: string): string[] => {
        if (nodeTags.has(root)) return [root];
        const found: string[] = [];
        const queue = [...(childrenByTag.get(root) ?? [])];
        const seen = new Set<string>([root]);
        let steps = 0;
        while (queue.length && steps < 2000) {
            steps++;
            const t = queue.shift()!;
            if (seen.has(t)) continue;
            seen.add(t);
            if (nodeTags.has(t)) { found.push(t); continue; }
            for (const c of childrenByTag.get(t) ?? []) queue.push(c);
        }
        return found;
    };

    const edgeSet = new Set<string>();
    const edges: PolicyGraphEdge[] = [];

    // 'flow' edges: genuine event transitions. For each node, follow flow events
    // leaving its screen scope to the entry node(s) of the target screen. These
    // are reliable but sparse (Guardian rarely wires doc->doc statically).
    const entryCache = new Map<string, string[]>();
    for (const node of nodes) {
        const scope = scopeOf(node.tag);
        const scopeTags = new Set(subtreeTags(scope));
        for (const src of scopeTags) {
            for (const target of adj.get(src) ?? []) {
                if (scopeTags.has(target)) continue; // internal wiring
                let entries = entryCache.get(target);
                if (!entries) { entries = entryNodes(target); entryCache.set(target, entries); }
                for (const succ of entries) {
                    if (succ === node.tag || scopeTags.has(succ)) continue;
                    const key = `${node.tag} ${succ}`;
                    if (edgeSet.has(key)) continue;
                    edgeSet.add(key);
                    edges.push({ source: node.tag, target: succ, kind: 'flow' });
                }
            }
        }
    }

    // 'sequence' edges: within each role lane, connect documents in authored
    // order (the policy author's step sequence). This is the honest primary
    // backbone — real structure from policy.json, not a guessed lifecycle. A
    // pair already linked by a 'flow' edge is not duplicated.
    const byRole = new Map<string, PolicyGraphNode[]>();
    for (const n of nodes) {
        const list = byRole.get(n.role) ?? [];
        list.push(n);
        byRole.set(n.role, list);
    }
    for (const laneNodes of byRole.values()) {
        const ordered = [...laneNodes].sort((a, b) => a.order - b.order);
        for (let i = 0; i + 1 < ordered.length; i++) {
            const a = ordered[i].tag;
            const b = ordered[i + 1].tag;
            const key = `${a} ${b}`;
            if (edgeSet.has(key)) continue; // already a flow edge
            edgeSet.add(key);
            edges.push({ source: a, target: b, kind: 'sequence' });
        }
    }

    // Lane order: policyRoles first, then extra roles found on nodes.
    const roles: string[] = [];
    const seenRole = new Set<string>();
    const policyRoles = policy?.['policyRoles'];
    if (Array.isArray(policyRoles)) {
        for (const r of policyRoles) {
            if (typeof r === 'string' && r && !seenRole.has(r)) {
                seenRole.add(r);
                roles.push(r);
            }
        }
    }
    for (const n of nodes) {
        if (!seenRole.has(n.role)) {
            seenRole.add(n.role);
            roles.push(n.role);
        }
    }

    return { roles, nodes, edges };
}
