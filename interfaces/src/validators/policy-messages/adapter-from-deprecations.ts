import {
    DEPRECATED_BLOCKS,
    DEPRECATED_PROPERTIES,
    DeprecationInfo
} from '../deprecations/index.js';

import {
    MSG_DEPRECATION_BLOCK,
    MSG_DEPRECATION_PROP,
    PolicyMessage
} from './types.js';

/**
 * Safely resolves a nested value from a plain object using a dot-delimited path.
 *
 * @param obj   Source object to read from.
 * @param path  Dot-delimited path (e.g., "uiMetaData.title").
 * @returns     The resolved value or `undefined` if not found.
 */
function getByPath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') {
        return undefined;
    }

    const normalized = path.replace(/\[(\d+)\]/g, '.$1');

    return normalized.split('.').reduce((acc: any, key) => {
        if (acc === null  || acc === undefined) {
            return undefined;
        }

        return acc[key as keyof typeof acc];
    }, obj as any);
}

/**
 * Builds a human-readable deprecation text based on DeprecationInfo.
 * Supports both a whole block and a specific property.
 */
function buildDeprecationText(
    itemName: string,
    info: DeprecationInfo
): string {
    const BASE_DEPRECATION_PHRASE = 'was deprecated.';

    const messageParts: string[] = [];

    const hasNonEmptyString = (
        value: unknown
    ): boolean => {
        if (typeof value !== 'string') {
            return false;
        }
        return value.trim().length > 0;
    };

    if (hasNonEmptyString(itemName)) {
        messageParts.push(`"${itemName}" ${BASE_DEPRECATION_PHRASE}`);
    }

    const fields = [
        info.alternative,
        info.alternativeBlockType,
        info.reason,
        info.since,
        info.removalPlanned
    ];

    for (const field of fields) {
        if (hasNonEmptyString(field)) {
            messageParts.push((field as string).trim());
        }
    }

    return messageParts.join(' ');
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
        severity: deprecationInfo.severity ?? 'warning',
        code: MSG_DEPRECATION_BLOCK,
        text: buildDeprecationText(blockType, deprecationInfo),
        blockType,
        since: deprecationInfo.since,
        removalPlanned: deprecationInfo.removalPlanned,
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
        const isPropertyUsed = getByPath(usedProperties, propertyName) !== undefined

        if (isPropertyUsed) {
            const message: PolicyMessage = {
                severity: deprecationInfo.severity ?? 'warning',
                code: MSG_DEPRECATION_PROP,
                text: buildDeprecationText(propertyName, deprecationInfo),
                blockType,
                property: propertyName,
                since: deprecationInfo.since,
                removalPlanned: deprecationInfo.removalPlanned,
            };

            messages.push(message);
        }
    }

    return messages;
}
