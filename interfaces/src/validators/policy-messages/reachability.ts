import { MSG_REACH_NO_IN, MSG_REACH_NO_OUT, MSG_REACH_ISOLATED, PolicyMessage } from './types.js';

export interface ReachabilitySource {
    getId(): string;
    getTag(): string | undefined;
    getBlockType(): string;
    getParentId(): string | undefined;
    getRawConfig(): unknown;
}

export interface ReachabilityContext {
    sources: ReadonlyArray<ReachabilitySource>;
    blockAboutRegistry?: Record<string, any>;
}

export type RawNodeView = {
    id?: string;
    tag?: string;
    blockType?: string;
    properties?: { stopPropagation?: boolean } | Record<string, unknown>;
    events?: any[];
    options?: { events?: any[] } | Record<string, unknown>;
    uiMetaData?: Record<string, unknown>;
};

/**
 * Builds a narrow projection of the raw policy node used by reachability checks.
 * Copies only fields that are relevant to reachability, recursively for children.
 */
export function projectRawNode(source: any): RawNodeView {
    return {
        id: source?.id,
        tag: source?.tag,
        blockType: source?.blockType,
        properties: source?.properties,
        events: source?.events,
        options: source?.options,
        uiMetaData: source?.uiMetaData,
    };
}

/**
 * After ignore-rules filtering, collapse partial reachability warnings
 * only if an ISOLATED message is present. If ISOLATED was filtered out,
 * keep NO_IN / NO_OUT as-is.
 */
export function collapseReachabilityMessages(
    messages: ReadonlyArray<PolicyMessage>
): PolicyMessage[] {
    const hasIsolated: boolean = messages.some(
        (message) => message.code === MSG_REACH_ISOLATED
    );

    if (!hasIsolated) {
        return messages.slice();
    }

    return messages.filter(
        (message) =>
            message.code !== MSG_REACH_NO_IN &&
            message.code !== MSG_REACH_NO_OUT
    );
}

/**
 * Pure function: computes reachability for a policy graph and returns
 * a Map<blockId, PolicyMessage[]>. It does not mutate sources or blocks.
 *
 * Reachability rules:
 *  - Explicit edges: collected from `node.events` and `node.options.events`.
 *    Respects `disabled === true`. Targets may be specified via `target | to | targetTag | targetId`.
 *  - Implicit edges: if a block type has `defaultEvent === true` in the blockAbout registry
 *    AND the block does not set `properties.stopPropagation === true`, then we add an edge
 *    to the next sibling in the same parent.
 */
export function computeReachability(
    context: ReachabilityContext | undefined
): Map<string, PolicyMessage[]> {
    const messagesByBlockId = new Map<string, PolicyMessage[]>();

    if (!context || !context.sources?.length) {
        return messagesByBlockId;
    }

    const sources = context.sources;
    const blockAboutRegistry = context.blockAboutRegistry ?? {};

    // Indexes
    const sourceById = new Map<string, ReachabilitySource>();
    const idByTag = new Map<string, string>();
    const childIdsByParentId = new Map<string | undefined, string[]>();

    // Initialize indexes and prefill map with empty arrays for all blocks
    for (const src of sources) {
        const id = src.getId();
        sourceById.set(id, src);

        const tag = src.getTag();
        if (tag && !idByTag.has(tag)) {
            idByTag.set(tag, id);
        }

        const parentId = src.getParentId();
        const siblings = childIdsByParentId.get(parentId) ?? [];
        siblings.push(id);
        childIdsByParentId.set(parentId, siblings);

        messagesByBlockId.set(id, []);
    }

    // Flags that indicate whether a node has any inbound/outbound edges
    const hasInbound = new Map<string, boolean>();
    const hasOutbound = new Map<string, boolean>();

    for (const id of sourceById.keys()) {
        hasInbound.set(id, false);
        hasOutbound.set(id, false);
    }

    /**
     * Resolves a string reference to a block id.
     * Accepts either a tag (preferred) or a raw id.
     */
    const resolveTargetId = (ref: unknown): string | undefined => {
        if (typeof ref !== 'string' || !ref.trim()) {
            return undefined;
        }
        return idByTag.get(ref) ?? (sourceById.has(ref) ? ref : undefined);
    };

    /**
     * Processes explicit event connections declared on a node.
     * Looks into both `events` and `options.events`.
     */
    const markExplicitConnections = (holderId: string, rawNode: any): void => {
        if (!rawNode || typeof rawNode !== 'object') {
            return;
        }

        const eventSets: any[][] = [];
        if (Array.isArray(rawNode.events)) {
            eventSets.push(rawNode.events);
        }
        if (Array.isArray(rawNode?.options?.events)) {
            eventSets.push(rawNode.options.events);
        }

        for (const events of eventSets) {
            for (const ev of events) {
                if (!ev || ev.disabled === true) {
                    continue;
                }
                const refs = [ev.target, ev.to, ev.targetTag, ev.targetId];
                for (const ref of refs) {
                    const targetId = resolveTargetId(ref);
                    if (targetId && targetId !== holderId) {
                        hasOutbound.set(holderId, true);
                        hasInbound.set(targetId, true);
                    }
                }
            }
        }
    };

    /**
     * Adds implicit "defaultEvent → next sibling" connections for all children of a parent.
     */
    const markImplicitNextSiblingConnections = (parentId: string | undefined): void => {
        const childIds = childIdsByParentId.get(parentId) ?? [];

        for (let i = 0; i < childIds.length - 1; i++) {
            const currentId = childIds[i];
            const nextId = childIds[i + 1];

            const currentSource = sourceById.get(currentId);
            const currentRaw = currentSource?.getRawConfig() as any | undefined;

            const currentType: string | undefined =
                currentRaw?.blockType ?? currentSource?.getBlockType();

            const about = currentType ? (blockAboutRegistry as any)[currentType] : undefined;

            const hasDefaultEvent = about?.defaultEvent === true;
            const stopPropagation = currentRaw?.properties?.stopPropagation === true;

            if (hasDefaultEvent && !stopPropagation) {
                hasOutbound.set(currentId, true);
                hasInbound.set(nextId, true);
            }
        }
    };

    // Collect explicit connections
    for (const src of sources) {
        const id = src.getId();
        const raw = src.getRawConfig() as any | undefined;
        markExplicitConnections(id, raw);
    }

    // Collect implicit connections among siblings
    for (const parentId of childIdsByParentId.keys()) {
        markImplicitNextSiblingConnections(parentId);
    }

    // Build messages per block id based on inbound/outbound flags
    for (const src of sources) {
        const id = src.getId();
        const type = src.getBlockType();

        const inbound = !!hasInbound.get(id);
        const outbound = !!hasOutbound.get(id);

        const messages: PolicyMessage[] = [];

        if (!inbound) {
            messages.push({
                severity: 'warning',
                code: MSG_REACH_NO_IN,
                text: 'No inbound links for this block. Note: not all blocks necessarily require their presence.',
                blockType: type
            });
        }

        if (!outbound) {
            messages.push({
                severity: 'warning',
                code: MSG_REACH_NO_OUT,
                text: 'No outbound links for this block. Note: not all blocks necessarily require their presence.',
                blockType: type
            });
        }

        if (!inbound && !outbound) {
            messages.push({
                severity: 'warning',
                code: MSG_REACH_ISOLATED,
                text: 'No inbound and outbound links for this block. Note: not all blocks necessarily require their presence.',
                blockType: type
            });
        }

        if (messages.length) {
            messagesByBlockId.set(id, messages);
        }
    }

    return messagesByBlockId;
}
