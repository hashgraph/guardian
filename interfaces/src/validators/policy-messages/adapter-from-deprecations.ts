import {
    DEPRECATED_BLOCKS,
    DEPRECATED_PROPERTIES,
    DeprecationInfo
} from '../deprecations/index.js';

import {
    PolicyMessage
} from './types.js';

/**
 * Builds a human-readable deprecation text based on DeprecationInfo.
 * Supports both a whole block and a specific property (via the optional `property` parameter).
 */
function buildDeprecationText(
    blockType: string,
    info: DeprecationInfo,
    property?: string
): string {
    const textParts: string[] = [];

    if (property) {
        textParts.push(`Property "${property}" in block "${blockType}" is deprecated`);
    } else {
        textParts.push(`Block "${blockType}" is deprecated`);
    }

    if (info.since) {
        textParts.push(`since ${info.since}`);
    }

    if (info.alternative) {
        textParts.push(info.alternative);
    }

    if (info.alternativeBlockType) {
        textParts.push(`Use "${info.alternativeBlockType}"`);
    }

    if (info.removalPlanned) {
        textParts.push(`removal planned in ${info.removalPlanned}`);
    }

    if (info.reason) {
        textParts.push(`Reason: ${info.reason}`);
    }

    if (info.migrationGuideUrl) {
        textParts.push(`Guide: ${info.migrationGuideUrl}`);
    }

    return textParts.join('. ');
}

/**
 * Produces deprecation messages for a whole block type.
 */
export function getDeprecationMessagesForBlock(
    blockType: string
): ReadonlyArray<PolicyMessage> {
    const deprecationInfo = DEPRECATED_BLOCKS.get(blockType);

    if (!deprecationInfo) {
        return [];
    }

    const message: PolicyMessage = {
        severity: 'warning',
        code: 'DEPRECATION_BLOCK',
        kind: 'deprecation',
        text: buildDeprecationText(blockType, deprecationInfo),
        blockType,
        since: deprecationInfo.since,
        removalPlanned: deprecationInfo.removalPlanned,
        migrationGuideUrl: deprecationInfo.migrationGuideUrl
    };

    return [message];
}

/**
 * Produces deprecation messages for properties of a specific block type.
 * Messages are returned only for properties that are actually present in the configuration.
 */
export function getDeprecationMessagesForProperties(
    blockType: string,
    usedProperties: Record<string, unknown> | undefined
): ReadonlyArray<PolicyMessage> {
    if (!usedProperties) {
        return [];
    }

    const propertiesMap = DEPRECATED_PROPERTIES.get(blockType);

    if (!propertiesMap) {
        return [];
    }

    const messages: PolicyMessage[] = [];

    for (const [propertyName, deprecationInfo] of propertiesMap.entries()) {
        const isPropertyUsed = usedProperties[propertyName] !== undefined;

        if (isPropertyUsed) {
            const message: PolicyMessage = {
                severity: 'warning',
                code: 'DEPRECATION_PROP',
                kind: 'deprecation',
                text: buildDeprecationText(blockType, deprecationInfo, propertyName),
                blockType,
                property: propertyName,
                since: deprecationInfo.since,
                removalPlanned: deprecationInfo.removalPlanned,
                migrationGuideUrl: deprecationInfo.migrationGuideUrl
            };

            messages.push(message);
        }
    }

    return messages;
}
