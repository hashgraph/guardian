import {getDeprecationMessagesForBlock, getDeprecationMessagesForProperties} from './adapter-from-deprecations.js';
import {PolicyMessage} from './types.js';
import {IgnoreRule,} from './ignore.js';
import {collapseReachabilityMessages} from './reachability.js';

/**
 * Builds a deduplication key for a message.
 */
function getMessageKey(message: PolicyMessage): string {
    return [
        `code:${message.code}`,
        `block:${message.blockType ?? ''}`,
        `prop:${message.property ?? ''}`,
        `text:${message.text}`
    ].join('|');
}

function deduplicateMessages(messages: ReadonlyArray<PolicyMessage>): PolicyMessage[] {
    const unique = new Map<string, PolicyMessage>();
    for (const message of messages) {
        const key = getMessageKey(message);
        if (!unique.has(key)) {
            unique.set(key, message);
        }
    }
    return Array.from(unique.values());
}

function isIgnoredByRule(message: PolicyMessage, rule: IgnoreRule): boolean {
    const codeMatches = !rule.code || rule.code === message.code;
    const blockTypeMatches = !rule.blockType || rule.blockType === message.blockType;
    const propertyMatches = !rule.property || rule.property === message.property;
    const containsMatches = !rule.contains || message.text.includes(rule.contains);
    const severityMatches = !rule.severity || rule.severity === message.severity;
    return codeMatches && blockTypeMatches && propertyMatches && containsMatches && severityMatches;
}

export function applyIgnoreRules(
    messages: ReadonlyArray<PolicyMessage>,
    ignoreRules?: ReadonlyArray<IgnoreRule>
): PolicyMessage[] {
    if (!ignoreRules || ignoreRules.length === 0) {
        return messages.slice();
    }
    const result: PolicyMessage[] = [];
    outer:
        for (const message of messages) {
            for (const rule of ignoreRules) {
                if (isIgnoredByRule(message, rule)) {
                    continue outer;
                }
            }
            result.push(message);
        }
    return result;
}

/**
 * A single entry point: collect all messages for a block from domain registries
 * and return a flat list of PolicyMessage.
 */
export function getPolicyMessagesForBlock(
    blockType: string,
    usedProperties: Record<string, unknown> | undefined,
    currentBlockId?: string,
    reachabilityPerBlock?: Map<string, PolicyMessage[]>
): PolicyMessage[] {
    const messages: PolicyMessage[] = [];

    for (const message of getDeprecationMessagesForBlock(blockType)) {
        messages.push(message);
    }

    for (const message of getDeprecationMessagesForProperties(blockType, usedProperties)) {
        messages.push(message);
    }

    if (currentBlockId && reachabilityPerBlock) {
        const reachMsgs = reachabilityPerBlock.get(currentBlockId);

        if (reachMsgs?.length) {
            messages.push(...reachMsgs);
        }
    }

    return deduplicateMessages(messages);
}

/**
 * Full pipeline for the validator:
 *  1) collect from all sources,
 *  2) apply ignore rules,
 *  3) split into warnings/infos (string arrays) for serialization.
 */
export function buildMessagesForValidator(
    blockType: string,
    usedProperties: Record<string, unknown> | undefined,
    ignoreRules?: ReadonlyArray<IgnoreRule>,
    reachabilityPerBlock?: Map<string, PolicyMessage[]>,
    currentBlockId?: string
): {
    messages: PolicyMessage[];
    warningsText: string[];
    infosText: string[];
} {
    const allMessages = getPolicyMessagesForBlock(blockType, usedProperties, currentBlockId, reachabilityPerBlock);
    const filtered = applyIgnoreRules(allMessages, ignoreRules);
    const collapsed = collapseReachabilityMessages(filtered);

    const warningsText: string[] = [];
    const infosText: string[] = [];

    for (const message of collapsed) {
        if (message.severity === 'warning') {
            warningsText.push(message.text);
        } else {
            infosText.push(message.text);
        }
    }

    return {
        messages: collapsed,
        warningsText,
        infosText
    };
}
