import { IPolicyDocumentationEntry } from '../interface/policy.interface.js';
import { LocationType } from '../type/location.type.js';
import { PolicyStatus } from '../type/policy-status.type.js';

/**
 * Kind of a problem found in a policy documentation entry
 */
export enum PolicyDocumentationIssueCode {
    TARGET_NOT_FOUND = 'TARGET_NOT_FOUND',
    BLOCK_TYPE_CHANGED = 'BLOCK_TYPE_CHANGED',
    DUPLICATE_ALIAS = 'DUPLICATE_ALIAS',
    INVALID_METHOD = 'INVALID_METHOD',
}

/**
 * Problem found in a policy documentation entry
 */
export interface IPolicyDocumentationIssue {
    /**
     * Index of the entry in the checked list
     */
    index: number;
    /**
     * Entry alias
     */
    alias: string;
    /**
     * Issue code
     */
    code: PolicyDocumentationIssueCode;
    /**
     * Human-readable message
     */
    message: string;
}

const METHODS = ['GET', 'POST', 'Both'];

function collectBlocks(node: any, map: Map<string, any>): void {
    if (!node || typeof node !== 'object') {
        return;
    }
    if (node.tag && !map.has(node.tag)) {
        map.set(node.tag, node);
    }
    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            collectBlocks(child, map);
        }
    }
}

/**
 * Checks documentation entries against the policy block tree.
 * @param config policy config (root block)
 * @param entries documentation entries
 * @returns list of problems, empty if everything is fine
 */
export function getPolicyDocumentationIssues(
    config: any,
    entries: IPolicyDocumentationEntry[] | null | undefined
): IPolicyDocumentationIssue[] {
    const issues: IPolicyDocumentationIssue[] = [];
    if (!Array.isArray(entries)) {
        return issues;
    }
    const blocks = new Map<string, any>();
    collectBlocks(config, blocks);

    const seen: { alias: string, method: string }[] = [];
    entries.forEach((entry, index) => {
        const alias = entry?.alias;
        if (!METHODS.includes(entry?.method)) {
            issues.push({
                index, alias, code: PolicyDocumentationIssueCode.INVALID_METHOD,
                message: `API alias "${alias}" has an unsupported method "${entry?.method}".`
            });
        }
        const block = blocks.get(entry?.target);
        if (!block) {
            issues.push({
                index, alias, code: PolicyDocumentationIssueCode.TARGET_NOT_FOUND,
                message: `API alias "${alias}" points to block "${entry?.target}", which no longer exists. This endpoint will stop working.`
            });
        } else if (entry.blockType && block.blockType !== entry.blockType) {
            issues.push({
                index, alias, code: PolicyDocumentationIssueCode.BLOCK_TYPE_CHANGED,
                message: `API alias "${alias}" points to block "${entry.target}", whose type changed from "${entry.blockType}" to "${block.blockType}". This endpoint may stop working.`
            });
        }
        const conflict = seen.find((item) =>
            item.alias === alias &&
            (item.method === entry?.method || item.method === 'Both' || entry?.method === 'Both')
        );
        if (conflict) {
            issues.push({
                index, alias, code: PolicyDocumentationIssueCode.DUPLICATE_ALIAS,
                message: `API alias "${alias}" is declared more than once for the same method; only the first one is reachable.`
            });
        }
        seen.push({ alias, method: entry?.method });
    });
    return issues;
}

const EDITABLE_STATUSES: string[] = [
    PolicyStatus.DRAFT,
    PolicyStatus.DRY_RUN,
    PolicyStatus.PUBLISH,
    PolicyStatus.DISCONTINUED,
];

/**
 * Whether the API documentation of the policy can be saved
 * @param policy policy status and location
 */
export function isPolicyDocumentationEditable(
    policy: { status?: string, locationType?: string }
): boolean {
    return policy.locationType !== LocationType.REMOTE && EDITABLE_STATUSES.includes(policy.status);
}
