/**
 * Parsed structure of a decoded Hedera Consensus Service (HCS) message.
 * All Guardian message types are normalized into this shape.
 */
export interface ParsedMessage {
    type: string;
    action: string | null;
    lang: string | null;
    uuid: string | null;
    owner: string | null;
    status: string | null;
    statusReason: string | null;
    statusMessage: string | null;
    responseType: string | null;
    files: string[];
    topics: string[];
    tokens: string[];
    options: Record<string, unknown>;
}

/**
 * Decodes a base64-encoded HCS message into a UTF-8 string.
 * Returns null if decoding fails.
 */
export function decodeBase64Message(base64: string): string | null {
    try {
        return Buffer.from(base64, 'base64').toString('utf-8');
    } catch {
        return null;
    }
}

/**
 * Parses a decoded JSON string into a ParsedMessage.
 * Returns null if JSON parsing fails.
 */
export function parseMessageJson(decoded: string): ParsedMessage | null {
    try {
        const json = JSON.parse(decoded);
        return extractFields(json);
    } catch {
        return null;
    }
}

/**
 * Extracts typed fields from a raw HCS message JSON object.
 * Handles all Guardian message types: Topic, Policy, Standard Registry,
 * Token, VC-Document, VP-Document, DID-Document, Module, Tool, Schema, etc.
 */
export function extractFields(json: Record<string, unknown>): ParsedMessage {
    const type = (json['type'] as string) || 'Unknown';
    const action = (json['action'] as string) || null;

    const result: ParsedMessage = {
        type,
        action,
        lang: (json['lang'] as string) || null,
        uuid: (json['id'] as string) || (json['uuid'] as string) || null,
        owner: (json['did'] as string) || (json['owner'] as string) || null,
        status: (json['status'] as string) || null,
        statusReason: (json['statusReason'] as string) || null,
        statusMessage: (json['statusMessage'] as string) || null,
        responseType: (json['responseType'] as string) || null,
        files: [],
        topics: [],
        tokens: [],
        options: {},
    };

    // Extract CIDs from various locations
    const cids = json['cid'] || json['urls'] || json['files'];
    if (Array.isArray(cids)) {
        result.files = cids.filter((c): c is string => typeof c === 'string');
    } else if (typeof cids === 'string') {
        result.files = [cids];
    }

    // Build options based on type
    switch (type) {
        case 'Topic':
            result.options = {
                childId: json['childId'] || json['topicId'] || null,
                parentId: json['parentId'] || null,
                name: json['name'] || null,
                description: json['description'] || null,
                owner: json['owner'] || json['did'] || null,
                messageType: json['messageType'] || null,
            };
            break;

        case 'Policy':
            result.options = {
                name: json['name'] || null,
                description: json['description'] || null,
                topicDescription: json['topicDescription'] || null,
                version: json['version'] || null,
                policyTag: json['policyTag'] || null,
                owner: json['owner'] || null,
                topicId: json['topicId'] || null,
                instanceTopicId: json['instanceTopicId'] || null,
                synchronizationTopicId: json['synchronizationTopicId'] || null,
                hash: json['hash'] || null,
                hashMap: json['hashMap'] || null,
                tools: json['tools'] || null,
                registryId: json['registryId'] || null,
            };
            if (json['tokenId']) {
                result.tokens.push(json['tokenId'] as string);
            }
            if (Array.isArray(json['tokenIds'])) {
                result.tokens.push(...(json['tokenIds'] as string[]));
            }
            if (json['instanceTopicId']) {
                result.topics.push(json['instanceTopicId'] as string);
            }
            break;

        case 'VC-Document':
        case 'VP-Document':
        case 'DID-Document':
            result.options = {
                issuer: json['issuer'] || null,
                relationships: json['relationships'] || null,
                schema: json['schema'] || null,
                tokenId: json['tokenId'] || null,
                amount: json['amount'] || null,
                memo: json['memo'] || null,
            };
            if (json['tokenId']) {
                result.tokens.push(json['tokenId'] as string);
            }
            break;

        case 'Standard Registry': {
            const attributes = json['attributes'] as Record<string, unknown> | undefined;
            result.options = {
                did: json['did'] || null,
                registrantTopicId: json['registrantTopicId'] || null,
                name: json['name'] || attributes?.['tags'] || null,
                description: json['description'] || null,
                lang: json['lang'] || null,
                topicId: json['topicId'] || null,
                action: json['action'] || null,
                geography: attributes?.['geography'] || null,
                law: attributes?.['law'] || null,
                tags: attributes?.['tags'] || null,
                attributes: attributes || null,
            };
            break;
        }

        case 'Token':
            result.options = {
                tokenId: json['tokenId'] || null,
                tokenName: json['tokenName'] || null,
                tokenSymbol: json['tokenSymbol'] || null,
                tokenType: json['tokenType'] || null,
                memo: json['memo'] || null,
            };
            if (json['tokenId']) {
                result.tokens.push(json['tokenId'] as string);
            }
            break;

        case 'Module':
        case 'Tool':
        case 'Schema':
        case 'Role-Document':
        case 'Contract':
        default:
            result.options = {
                name: json['name'] || null,
                description: json['description'] || null,
                topicId: json['topicId'] || null,
                tokenId: json['tokenId'] || null,
            };
            if (json['tokenId']) {
                result.tokens.push(json['tokenId'] as string);
            }
            break;
    }

    return result;
}

/**
 * Extracts all discoverable topic IDs from a parsed message's options.
 * Returns a deduplicated array of topic IDs (excluding the source topic).
 */
export function extractDiscoverableTopics(
    parsed: ParsedMessage,
    sourceTopicId: string,
): { topicId: string; isOrgTopic: boolean }[] {
    const topicFields = ['childId', 'instanceTopicId', 'registrantTopicId', 'topicId'];
    const seen = new Set<string>();
    const result: { topicId: string; isOrgTopic: boolean }[] = [];

    for (const field of topicFields) {
        const value = parsed.options[field] as string | undefined;
        if (value && !seen.has(value) && value !== sourceTopicId) {
            seen.add(value);
            result.push({
                topicId: value,
                isOrgTopic: field === 'registrantTopicId',
            });
        }
    }

    return result;
}

/**
 * Extracts all token IDs from a parsed message.
 */
export function extractTokenIds(parsed: ParsedMessage): string[] {
    return [...new Set(parsed.tokens)];
}
