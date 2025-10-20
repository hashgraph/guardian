import {MSG_REACH_NO_IN, MSG_REACH_NO_OUT, PolicyMessage} from './types.js';
import {IgnoreRule} from './ignore.js';
import {applyIgnoreRules} from './provider.js';

export interface ReachabilitySource {
    getId(): string;

    getTag(): string | undefined;

    getBlockType(): string;

    getParentId(): string | undefined;

    getChildrenIds(): string[];

    getOptions(): unknown;

    addPrecomputedMessagesAsText?(
        msgs: ReadonlyArray<string>,
        severity: 'warning' | 'info'
    ): void;
}

/**
 * Walks an arbitrary value and collects ALL string values
 * that match any tag from knownTags.
 */
export function collectTagReferences(
    source: unknown,
    knownTags: ReadonlySet<string>
): string[] {
    const result: string[] = [];

    function walk(value: unknown): void {
        if (value == null) {
            return;
        }

        if (typeof value === 'string') {
            if (knownTags.has(value)) {
                result.push(value);
            }
            return;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                walk(item);
            }
            return;
        }

        if (typeof value === 'object') {
            for (const v of Object.values(value as Record<string, unknown>)) {
                walk(v);
            }
        }
    }

    walk(source);
    return result;
}

/**
 * Builds a reachability graph and distributes warnings across blocks.
 * “Incoming/Outgoing links” here include:
 *  - hierarchical links parent → child
 *  - tag-based links from options (strings matching another block’s tag)
 */
export function computeReachabilityAndDistribute(
    sources: ReadonlyArray<ReachabilitySource>,
    ignoreRules?: ReadonlyArray<IgnoreRule>
): void {
    /**
     * Tag indices.
     * idByTag: map a tag to the node id to connect options → tag.
     * knownTags: the set of all tags for quick lookup while scanning options.
     */
    const idByTag = new Map<string, string>();
    const knownTags: Set<string> = new Set<string>();

    for (const source of sources) {
        const tag = source.getTag();
        const id = source.getId();

        if (tag && id) {
            idByTag.set(tag, id);
            knownTags.add(tag);
        }
    }

    /**
     * Link counters.
     * incomingLinksCountById — how many incoming links a node has (parents + tag-based references).
     * outgoingLinksCountById — how many outgoing links a node has (children + tag-based references).
     */
    const incomingLinksCountById = new Map<string, number>();
    const outgoingLinksCountById = new Map<string, number>();

    const incrementCount = (map: Map<string, number>, key: string): void => {
        map.set(key, (map.get(key) ?? 0) + 1);
    };

    for (const source of sources) {
        const id = source.getId();
        incomingLinksCountById.set(id, 0);
        outgoingLinksCountById.set(id, 0);
    }

    /**
     * Treat hierarchical parent → child relations as links.
     */
    for (const source of sources) {
        const parentId = source.getId();
        const childrenIds = source.getChildrenIds() ?? [];

        for (const childId of childrenIds) {
            incrementCount(outgoingLinksCountById, parentId);
            incrementCount(incomingLinksCountById, childId);
        }
    }

    /**
     * Tag-based links from options: any string matching a known tag.
     */
    for (const source of sources) {
        const fromId = source.getId();
        const options = source.getOptions();

        const referencedTags = collectTagReferences(options, knownTags);

        for (const tag of referencedTags) {
            const toId = idByTag.get(tag);
            if (toId && toId !== fromId) {
                incrementCount(outgoingLinksCountById, fromId);
                incrementCount(incomingLinksCountById, toId);
            }
        }
    }

    /**
     * Distribute warnings:
     *  - “no incoming links”: no parent and no tag-based references pointing to the node.
     *  - “no outgoing links”: no children and no tag-based references from the node.
     */
    for (const source of sources) {
        const id = source.getId();
        const tag = source.getTag();
        const type = source.getBlockType();
        const parentId = source.getParentId();

        const incomingCount = incomingLinksCountById.get(id) ?? 0;
        const outgoingCount = outgoingLinksCountById.get(id) ?? 0;

        const structuredMessages: PolicyMessage[] = [];
        const label = tag ?? id;

        if (incomingCount === 0 && !parentId) {
            structuredMessages.push({
                severity: 'warning',
                code: MSG_REACH_NO_IN,
                text: `Block "${type}" (${label}) has no incoming links (no parent and no tag-based references).`,
                blockType: type
            });
        }

        if (outgoingCount === 0) {
            structuredMessages.push({
                severity: 'warning',
                code: MSG_REACH_NO_OUT,
                text: `Block "${type}" (${label}) has no outgoing links (no children and no tag-based references).`,
                blockType: type
            });
        }

        const filtered = applyIgnoreRules(structuredMessages, ignoreRules);
        if (filtered.length) {
            const texts = filtered.map(m => m.text);
            source.addPrecomputedMessagesAsText?.(texts, 'warning');
        }
    }
}
