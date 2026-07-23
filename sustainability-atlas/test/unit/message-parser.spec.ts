import {
    decodeBase64Message,
    parseMessageJson,
    extractFields,
    extractDiscoverableTopics,
    extractTokenIds,
    ParsedMessage,
} from '../../src/shared/utils/message-parser';
import { describe, it, expect } from '@jest/globals';
import { Buffer } from 'buffer';

describe('message-parser', () => {

    // ── decodeBase64Message ─────────────────────────────────────────────

    describe('decodeBase64Message', () => {
        it('should decode a valid base64 string', () => {
            const input = Buffer.from('{"type":"Policy"}').toString('base64');
            expect(decodeBase64Message(input)).toBe('{"type":"Policy"}');
        });

        it('should handle empty string', () => {
            expect(decodeBase64Message('')).toBe('');
        });

        it('should decode a Guardian Standard Registry message', () => {
            const raw = {
                id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                status: 'ISSUE',
                type: 'Standard Registry',
                action: 'Initialization',
                lang: 'en-US',
                did: 'did:hedera:testnet:ExampleRegistryPlaceholder1234567890abcd;hedera:testnet:tid=0.0.9999001',
                topicId: '0.0.9999001',
                attributes: { geography: 'Global', law: 'uk, eu', tags: 'ExampleRegistry' },
            };
            const encoded = Buffer.from(JSON.stringify(raw)).toString('base64');
            const decoded = decodeBase64Message(encoded);
            expect(decoded).not.toBeNull();
            expect(JSON.parse(decoded!)).toEqual(raw);
        });
    });

    // ── parseMessageJson ────────────────────────────────────────────────

    describe('parseMessageJson', () => {
        it('should parse valid JSON and extract fields', () => {
            const result = parseMessageJson('{"type":"Policy","name":"Test Policy"}');
            expect(result).not.toBeNull();
            expect(result!.type).toBe('Policy');
            expect(result!.options['name']).toBe('Test Policy');
        });

        it('should return null for invalid JSON', () => {
            expect(parseMessageJson('not json')).toBeNull();
        });

        it('should return null for empty string', () => {
            expect(parseMessageJson('')).toBeNull();
        });
    });

    // ── extractFields: common fields ────────────────────────────────────

    describe('extractFields - common fields', () => {
        it('should extract type and action', () => {
            const result = extractFields({ type: 'Policy', action: 'publish' });
            expect(result.type).toBe('Policy');
            expect(result.action).toBe('publish');
        });

        it('should default type to Unknown if missing', () => {
            const result = extractFields({});
            expect(result.type).toBe('Unknown');
        });

        it('should extract uuid from id field', () => {
            const result = extractFields({ type: 'Policy', id: 'abc-123' });
            expect(result.uuid).toBe('abc-123');
        });

        it('should extract uuid from uuid field as fallback', () => {
            const result = extractFields({ type: 'Policy', uuid: 'xyz-789' });
            expect(result.uuid).toBe('xyz-789');
        });

        it('should prefer id over uuid', () => {
            const result = extractFields({ type: 'Policy', id: 'from-id', uuid: 'from-uuid' });
            expect(result.uuid).toBe('from-id');
        });

        it('should extract owner from did field', () => {
            const result = extractFields({ type: 'Policy', did: 'did:hedera:test:abc' });
            expect(result.owner).toBe('did:hedera:test:abc');
        });

        it('should extract owner from owner field as fallback', () => {
            const result = extractFields({ type: 'Policy', owner: 'owner-value' });
            expect(result.owner).toBe('owner-value');
        });

        it('should extract status, lang, responseType', () => {
            const result = extractFields({
                type: 'Policy',
                status: 'ACTIVE',
                lang: 'en-US',
                responseType: 'JSON',
                statusReason: 'approved',
                statusMessage: 'All checks passed',
            });
            expect(result.status).toBe('ACTIVE');
            expect(result.lang).toBe('en-US');
            expect(result.responseType).toBe('JSON');
            expect(result.statusReason).toBe('approved');
            expect(result.statusMessage).toBe('All checks passed');
        });

        it('should set null for missing optional fields', () => {
            const result = extractFields({ type: 'Policy' });
            expect(result.action).toBeNull();
            expect(result.lang).toBeNull();
            expect(result.uuid).toBeNull();
            expect(result.owner).toBeNull();
            expect(result.status).toBeNull();
            expect(result.responseType).toBeNull();
        });
    });

    // ── extractFields: CID extraction ───────────────────────────────────

    describe('extractFields - CID extraction', () => {
        it('should extract CIDs from cid field (array)', () => {
            const result = extractFields({
                type: 'VC-Document',
                cid: ['QmABC', 'QmDEF'],
            });
            expect(result.files).toEqual(['QmABC', 'QmDEF']);
        });

        it('should extract CIDs from cid field (string)', () => {
            const result = extractFields({
                type: 'VC-Document',
                cid: 'QmSingleCID',
            });
            expect(result.files).toEqual(['QmSingleCID']);
        });

        it('should extract CIDs from urls field', () => {
            const result = extractFields({
                type: 'VC-Document',
                urls: ['QmFromUrls'],
            });
            expect(result.files).toEqual(['QmFromUrls']);
        });

        it('should extract CIDs from files field', () => {
            const result = extractFields({
                type: 'VC-Document',
                files: ['QmFromFiles'],
            });
            expect(result.files).toEqual(['QmFromFiles']);
        });

        it('should prefer cid over urls over files', () => {
            const result = extractFields({
                type: 'VC-Document',
                cid: ['QmFromCid'],
                urls: ['QmFromUrls'],
                files: ['QmFromFiles'],
            });
            expect(result.files).toEqual(['QmFromCid']);
        });

        it('should filter out non-string values from CID arrays', () => {
            const result = extractFields({
                type: 'VC-Document',
                cid: ['QmValid', 123, null, 'QmAlsoValid'],
            });
            expect(result.files).toEqual(['QmValid', 'QmAlsoValid']);
        });

        it('should return empty files array when no CIDs found', () => {
            const result = extractFields({ type: 'Policy' });
            expect(result.files).toEqual([]);
        });
    });

    // ── extractFields: Standard Registry ────────────────────────────────

    describe('extractFields - Standard Registry', () => {
        it('should extract Standard Registry fields', () => {
            const result = extractFields({
                type: 'Standard Registry',
                action: 'Initialization',
                did: 'did:hedera:mainnet:abc',
                topicId: '0.0.1234',
                lang: 'en-US',
            });
            expect(result.type).toBe('Standard Registry');
            expect(result.options['did']).toBe('did:hedera:mainnet:abc');
            expect(result.options['topicId']).toBe('0.0.1234');
            expect(result.options['action']).toBe('Initialization');
        });

        it('should extract attributes (geography, law, tags)', () => {
            const result = extractFields({
                type: 'Standard Registry',
                did: 'did:hedera:mainnet:abc',
                attributes: {
                    geography: 'USA CAN EU',
                    law: 'USA',
                    tags: 'GCC Solar Rooftop',
                },
            });
            expect(result.options['geography']).toBe('USA CAN EU');
            expect(result.options['law']).toBe('USA');
            expect(result.options['tags']).toBe('GCC Solar Rooftop');
            expect(result.options['attributes']).toEqual({
                geography: 'USA CAN EU',
                law: 'USA',
                tags: 'GCC Solar Rooftop',
            });
        });

        it('should use attributes.tags as name fallback when name is missing', () => {
            const result = extractFields({
                type: 'Standard Registry',
                attributes: { tags: 'DOVU' },
            });
            expect(result.options['name']).toBe('DOVU');
        });

        it('should prefer explicit name over attributes.tags', () => {
            const result = extractFields({
                type: 'Standard Registry',
                name: 'Explicit Name',
                attributes: { tags: 'Tag Name' },
            });
            expect(result.options['name']).toBe('Explicit Name');
        });

        it('should extract registrantTopicId', () => {
            const result = extractFields({
                type: 'Standard Registry',
                registrantTopicId: '0.0.9999',
            });
            expect(result.options['registrantTopicId']).toBe('0.0.9999');
        });

        it('should handle missing attributes gracefully', () => {
            const result = extractFields({
                type: 'Standard Registry',
                did: 'did:hedera:mainnet:abc',
            });
            expect(result.options['geography']).toBeNull();
            expect(result.options['law']).toBeNull();
            expect(result.options['tags']).toBeNull();
            expect(result.options['attributes']).toBeNull();
        });
    });

    // ── extractFields: Policy ───────────────────────────────────────────

    describe('extractFields - Policy', () => {
        it('should extract Policy fields', () => {
            const result = extractFields({
                type: 'Policy',
                name: 'iREC Policy',
                description: 'Renewable energy certificates',
                version: '1.2.0',
                policyTag: 'Tag_iREC',
                owner: 'did:hedera:test:owner',
                topicId: '0.0.5000',
                instanceTopicId: '0.0.5001',
            });
            expect(result.options['name']).toBe('iREC Policy');
            expect(result.options['version']).toBe('1.2.0');
            expect(result.options['instanceTopicId']).toBe('0.0.5001');
            expect(result.topics).toEqual(['0.0.5001']);
        });

        it('should extract tokenId and tokenIds into tokens array', () => {
            const result = extractFields({
                type: 'Policy',
                tokenId: '0.0.8001',
                tokenIds: ['0.0.8002', '0.0.8003'],
            });
            expect(result.tokens).toEqual(['0.0.8001', '0.0.8002', '0.0.8003']);
        });

        it('should handle Policy with no tokens', () => {
            const result = extractFields({ type: 'Policy', name: 'Basic' });
            expect(result.tokens).toEqual([]);
        });
    });

    // ── extractFields: Token ────────────────────────────────────────────

    describe('extractFields - Token', () => {
        it('should extract Token fields and add to tokens array', () => {
            const result = extractFields({
                type: 'Token',
                tokenId: '0.0.48291',
                tokenName: 'Carbon Credit',
                tokenSymbol: 'CC',
                tokenType: 'FUNGIBLE_COMMON',
            });
            expect(result.options['tokenId']).toBe('0.0.48291');
            expect(result.options['tokenName']).toBe('Carbon Credit');
            expect(result.options['tokenSymbol']).toBe('CC');
            expect(result.tokens).toEqual(['0.0.48291']);
        });
    });

    // ── extractFields: VC/VP/DID Documents ──────────────────────────────

    describe('extractFields - Documents', () => {
        it('should extract VC-Document fields', () => {
            const result = extractFields({
                type: 'VC-Document',
                issuer: 'did:hedera:test:issuer',
                schema: '#schema-id',
                tokenId: '0.0.9999',
                cid: ['QmVCDoc123'],
            });
            expect(result.options['issuer']).toBe('did:hedera:test:issuer');
            expect(result.options['schema']).toBe('#schema-id');
            expect(result.tokens).toEqual(['0.0.9999']);
            expect(result.files).toEqual(['QmVCDoc123']);
        });

        it('should extract VP-Document fields the same way', () => {
            const result = extractFields({
                type: 'VP-Document',
                issuer: 'did:hedera:test:vp-issuer',
                relationships: ['rel1', 'rel2'],
            });
            expect(result.type).toBe('VP-Document');
            expect(result.options['issuer']).toBe('did:hedera:test:vp-issuer');
            expect(result.options['relationships']).toEqual(['rel1', 'rel2']);
        });

        it('should extract DID-Document fields', () => {
            const result = extractFields({
                type: 'DID-Document',
                did: 'did:hedera:test:did-doc',
            });
            expect(result.type).toBe('DID-Document');
            expect(result.owner).toBe('did:hedera:test:did-doc');
        });
    });

    // ── extractFields: Topic ────────────────────────────────────────────

    describe('extractFields - Topic', () => {
        it('should extract Topic fields', () => {
            const result = extractFields({
                type: 'Topic',
                childId: '0.0.2000',
                parentId: '0.0.1000',
                name: 'Policy Topic',
                messageType: 'DYNAMIC_TOPIC',
            });
            expect(result.options['childId']).toBe('0.0.2000');
            expect(result.options['parentId']).toBe('0.0.1000');
            expect(result.options['name']).toBe('Policy Topic');
            expect(result.options['messageType']).toBe('DYNAMIC_TOPIC');
        });

        it('should fall back to topicId when childId is missing', () => {
            const result = extractFields({
                type: 'Topic',
                topicId: '0.0.3000',
            });
            expect(result.options['childId']).toBe('0.0.3000');
        });
    });

    // ── extractFields: default/unknown types ────────────────────────────

    describe('extractFields - default types', () => {
        it('should handle Module type', () => {
            const result = extractFields({
                type: 'Module',
                name: 'Test Module',
                description: 'A module',
                tokenId: '0.0.7777',
            });
            expect(result.options['name']).toBe('Test Module');
            expect(result.tokens).toEqual(['0.0.7777']);
        });

        it('should handle completely unknown types', () => {
            const result = extractFields({
                type: 'FutureType',
                name: 'Something New',
            });
            expect(result.type).toBe('FutureType');
            expect(result.options['name']).toBe('Something New');
        });
    });

    // ── extractDiscoverableTopics ───────────────────────────────────────

    describe('extractDiscoverableTopics', () => {
        it('should extract childId as discoverable topic', () => {
            const parsed = extractFields({
                type: 'Topic',
                childId: '0.0.2000',
            });
            const topics = extractDiscoverableTopics(parsed, '0.0.1000');
            expect(topics).toEqual([
                { topicId: '0.0.2000', isOrgTopic: false },
            ]);
        });

        it('should extract registrantTopicId as org topic', () => {
            const parsed = extractFields({
                type: 'Standard Registry',
                registrantTopicId: '0.0.3000',
                topicId: '0.0.4000',
            });
            const topics = extractDiscoverableTopics(parsed, '0.0.1000');
            expect(topics).toContainEqual({ topicId: '0.0.3000', isOrgTopic: true });
            expect(topics).toContainEqual({ topicId: '0.0.4000', isOrgTopic: false });
        });

        it('should exclude the source topic', () => {
            const parsed = extractFields({
                type: 'Topic',
                childId: '0.0.1000', // same as source
            });
            const topics = extractDiscoverableTopics(parsed, '0.0.1000');
            expect(topics).toEqual([]);
        });

        it('should deduplicate topics', () => {
            const parsed = extractFields({
                type: 'Policy',
                topicId: '0.0.5000',
                instanceTopicId: '0.0.5000', // same as topicId
            });
            const topics = extractDiscoverableTopics(parsed, '0.0.1000');
            expect(topics).toHaveLength(1);
            expect(topics[0].topicId).toBe('0.0.5000');
        });

        it('should return multiple unique topics', () => {
            const parsed = extractFields({
                type: 'Policy',
                topicId: '0.0.5000',
                instanceTopicId: '0.0.5001',
            });
            const topics = extractDiscoverableTopics(parsed, '0.0.1000');
            expect(topics).toHaveLength(2);
        });

        it('should return empty for messages with no topic references', () => {
            const parsed = extractFields({ type: 'Token', tokenId: '0.0.8000' });
            const topics = extractDiscoverableTopics(parsed, '0.0.1000');
            expect(topics).toEqual([]);
        });
    });

    // ── extractTokenIds ─────────────────────────────────────────────────

    describe('extractTokenIds', () => {
        it('should extract token IDs from parsed message', () => {
            const parsed = extractFields({
                type: 'Token',
                tokenId: '0.0.48291',
            });
            expect(extractTokenIds(parsed)).toEqual(['0.0.48291']);
        });

        it('should deduplicate token IDs', () => {
            const parsed = extractFields({
                type: 'Policy',
                tokenId: '0.0.8001',
                tokenIds: ['0.0.8001', '0.0.8002'],
            });
            const tokens = extractTokenIds(parsed);
            expect(tokens).toContain('0.0.8001');
            expect(tokens).toContain('0.0.8002');
            expect(tokens.filter(t => t === '0.0.8001')).toHaveLength(1);
        });

        it('should return empty array when no tokens', () => {
            const parsed = extractFields({ type: 'Topic' });
            expect(extractTokenIds(parsed)).toEqual([]);
        });
    });

    // ── Full pipeline: decode → parse → extract ─────────────────────────

    describe('full pipeline', () => {
        it('should handle a Standard Registry message end-to-end', () => {
            const raw = {
                id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                status: 'ISSUE',
                type: 'Standard Registry',
                action: 'Initialization',
                lang: 'en-US',
                did: 'did:hedera:testnet:ExampleRegistryPlaceholder1234567890abcd;hedera:testnet:tid=0.0.9999001',
                topicId: '0.0.9999001',
                attributes: { geography: 'Global', law: 'uk, eu', tags: 'ExampleRegistry' },
            };
            const encoded = Buffer.from(JSON.stringify(raw)).toString('base64');

            const decoded = decodeBase64Message(encoded);
            expect(decoded).not.toBeNull();

            const parsed = parseMessageJson(decoded!);
            expect(parsed).not.toBeNull();
            expect(parsed!.type).toBe('Standard Registry');
            expect(parsed!.owner).toBe(raw.did);
            expect(parsed!.options['name']).toBe('ExampleRegistry');
            expect(parsed!.options['geography']).toBe('Global');
            expect(parsed!.options['topicId']).toBe('0.0.9999001');

            const topics = extractDiscoverableTopics(parsed!, '0.0.9000000');
            expect(topics).toContainEqual({ topicId: '0.0.9999001', isOrgTopic: false });

            expect(extractTokenIds(parsed!)).toEqual([]);
        });

        it('should decode and parse real-world base64 payload from Hedera Mirror Node', () => {
            // Base64 payload simulating a Standard Registry message as retrieved
            // from the Hedera Mirror Node. Structure mirrors a real mainnet message
            // but all identifiers are synthetic to avoid referencing real registries.
            const messageJson = '{"id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","status":"ISSUE","type":"Standard Registry","action":"Initialization","lang":"en-US","did":"did:hedera:testnet:ExampleRegistryPlaceholder1234567890abcd;hedera:testnet:tid=0.0.9999001","topicId":"0.0.9999001","attributes":{"geography":"Global","law":"uk, eu","tags":"ExampleRegistry"}}';
            const rawBase64 = Buffer.from(messageJson).toString('base64');

            // Step 1: Decode base64
            const decoded = decodeBase64Message(rawBase64);
            expect(decoded).not.toBeNull();
            expect(decoded).toBe(messageJson);

            // Step 2: Parse JSON and extract fields
            const parsed = parseMessageJson(decoded!);
            expect(parsed).not.toBeNull();

            // Step 3: Verify all common fields
            expect(parsed!.type).toBe('Standard Registry');
            expect(parsed!.action).toBe('Initialization');
            expect(parsed!.lang).toBe('en-US');
            expect(parsed!.uuid).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
            expect(parsed!.status).toBe('ISSUE');
            expect(parsed!.owner).toBe(
                'did:hedera:testnet:ExampleRegistryPlaceholder1234567890abcd;hedera:testnet:tid=0.0.9999001',
            );

            // Step 4: Verify Standard Registry specific options
            expect(parsed!.options['did']).toBe(
                'did:hedera:testnet:ExampleRegistryPlaceholder1234567890abcd;hedera:testnet:tid=0.0.9999001',
            );
            expect(parsed!.options['topicId']).toBe('0.0.9999001');
            expect(parsed!.options['action']).toBe('Initialization');
            expect(parsed!.options['lang']).toBe('en-US');
            expect(parsed!.options['registrantTopicId']).toBeNull();

            // Step 5: Verify attributes extraction
            expect(parsed!.options['geography']).toBe('Global');
            expect(parsed!.options['law']).toBe('uk, eu');
            expect(parsed!.options['tags']).toBe('ExampleRegistry');
            expect(parsed!.options['attributes']).toEqual({
                geography: 'Global',
                law: 'uk, eu',
                tags: 'ExampleRegistry',
            });

            // Step 6: name falls back to tags when explicit name is missing
            expect(parsed!.options['name']).toBe('ExampleRegistry');

            // Step 7: No files, no tokens
            expect(parsed!.files).toEqual([]);
            expect(parsed!.tokens).toEqual([]);

            // Step 8: Child topic discovery — the topicId field from the root
            // topic 0.0.9000000 should yield 0.0.9999001 as a new topic
            const discovered = extractDiscoverableTopics(parsed!, '0.0.9000000');
            expect(discovered).toHaveLength(1);
            expect(discovered[0]).toEqual({
                topicId: '0.0.9999001',
                isOrgTopic: false,
            });

            // Step 9: No tokens discovered
            expect(extractTokenIds(parsed!)).toEqual([]);
        });

        it('should handle a Policy message with tokens and instance topic', () => {
            const raw = {
                type: 'Policy',
                action: 'publish',
                name: 'iREC 3.0',
                version: '1.0.0',
                owner: 'did:hedera:test:owner123',
                topicId: '0.0.5000',
                instanceTopicId: '0.0.5001',
                tokenId: '0.0.8001',
                tokenIds: ['0.0.8002'],
                cid: ['QmPolicyDoc123'],
            };
            const encoded = Buffer.from(JSON.stringify(raw)).toString('base64');
            const decoded = decodeBase64Message(encoded)!;
            const parsed = parseMessageJson(decoded)!;

            expect(parsed.type).toBe('Policy');
            expect(parsed.files).toEqual(['QmPolicyDoc123']);
            expect(parsed.tokens).toEqual(['0.0.8001', '0.0.8002']);

            const topics = extractDiscoverableTopics(parsed, '0.0.4000');
            expect(topics).toHaveLength(2);
            expect(topics).toContainEqual({ topicId: '0.0.5001', isOrgTopic: false });
            expect(topics).toContainEqual({ topicId: '0.0.5000', isOrgTopic: false });
        });
    });
});
