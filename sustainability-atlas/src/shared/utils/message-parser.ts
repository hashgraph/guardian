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
    // Extract IPFS files only from set of types
    
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
                rationale: json['rationale'] || null
            };
            break;

        // Policy is the draft message; Instance-Policy is the published version.
        // They share the same field structure — the indexer treats Instance-Policy
        // as the canonical methodology entity (filtered by action='PublishPolicy').
        // case 'Policy': // Ignore Policy Type
        case 'Instance-Policy':
            result.options = {
                uuid: json['uuid'] || null,
                originalMessageId: json['originalMessageId'] || null,
                name: json['name'] || null,
                description: json['description'] || null,
                topicDescription: json['topicDescription'] || null,
                version: json['version'] || null,
                policyTag: json['policyTag'] || null,
                owner: json['owner'] || null,
                topicId: json['topicId'] || null,
                policyTopicId: json['topicId'] || null,
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
                // OrganizationName (Pascal) is the canonical name key in Guardian attributes.
                // Fall back to lowercase name, then Tags/tags (some registries like IREC
                // use Tags as their display name when OrganizationName is absent).
                name: (json['name'] as string)
                    || (attributes?.['OrganizationName'] as string)
                    || (attributes?.['name'] as string)
                    || (attributes?.['Tags'] as string)
                    || (attributes?.['tags'] as string)
                    || null,
                description: (json['description'] as string) || (attributes?.['description'] as string) || null,
                lang: json['lang'] || null,
                topicId: json['topicId'] || null,
                action: json['action'] || null,
                // Country (Pascal) is used in modern Guardian; fall back to lowercase geography.
                geography: (json['geography'] as string)
                    || (attributes?.['Country'] as string)
                    || (attributes?.['geography'] as string)
                    || null,
                // Website lives in attributes for modern Guardian messages.
                website: (json['website'] as string)
                    || (attributes?.['Website'] as string)
                    || null,
                law: (json['law'] as string) || (attributes?.['law'] as string) || null,
                // Tags (Pascal) is the modern key; fall back to lowercase tags.
                tags: (json['Tags'] as string)
                    || (json['tags'] as string)
                    || (attributes?.['Tags'] as string)
                    || (attributes?.['tags'] as string)
                    || null,
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
        case 'Tag': {
            result.options = {
                name: json['name'] || null,
                description: json['description'] || null,
                topicId: json['topicId'] || null,
                tokenId: json['tokenId'] || null,
                target: json['target'] || null,
                operation: json['operation'] || null,
                entity: json['entity'] || null
            };
            break;
        }
        case 'Role-Document': {
            result.options = {
                name: json['name'] || null,
                description: json['description'] || null,
                topicId: json['topicId'] || null,
                tokenId: json['tokenId'] || null,
                issuer: json['issuer'] || null,
                encodedData: json['encodedData'] || null,
                role: json['role'] || null,
                group: json['group'] || null,
            };
            if (json['tokenId']) {
                result.tokens.push(json['tokenId'] as string);
            }
            break;
        }

        case 'Module':
        case 'Tool':
        case 'Schema':
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
// TODO: Check this registrantTopicId actually comming
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
