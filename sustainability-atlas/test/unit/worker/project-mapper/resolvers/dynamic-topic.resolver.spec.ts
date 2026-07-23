import { describe, expect, it, jest } from '@jest/globals';
import { DataSource } from 'typeorm';
import { DynamicTopicResolver } from '@worker/project-mapper/resolvers/dynamic-topic.resolver';
import { TopicClassifierService, TopicClassification } from '@worker/project-mapper/topic-classifier';
import { ResolutionContext } from '@worker/project-mapper/resolvers/resolver.types';

const ctx: ResolutionContext = {
    consensusTimestamp: '1700000000.0',
    topicId: '0.0.999',
    csId: 'did:hedera:testnet:abc',
    csRef: '',
    isProjectSchemaVc: false,
    policyHasProjectSchemaClassification: false,
    policyMapping: {},
};

const makeResolver = (
    classification: TopicClassification,
    canonicalCsId: string | null = null,
): DynamicTopicResolver => {
    const classifier = { classifyTopic: jest.fn(async () => classification) } as unknown as TopicClassifierService;
    // canonicalCsIdInTopic issues queries; return the canonical cs.id (or none).
    const ds = { query: jest.fn(async () => (canonicalCsId ? [{ cs_id: canonicalCsId }] : [])) } as unknown as DataSource;
    return new DynamicTopicResolver(ds, classifier);
};

describe('DynamicTopicResolver (M1)', () => {
    it('resolves by the topic canonical cs.id, recording the topic in metadata', async () => {
        const r = makeResolver({ kind: 'dynamic-project', name: 'Project', instancePolicyTopicId: '0.0.1' }, 'did:root');
        await expect(r.resolve(ctx)).resolves.toEqual({
            status: 'resolved', projectKey: 'did:root', method: 'topic', metadata: { dynamicTopicId: '0.0.999' },
        });
    });

    it('falls back to the VC cs.id when the topic has no canonical project VC yet', async () => {
        const r = makeResolver({ kind: 'dynamic-project', name: 'Project', instancePolicyTopicId: '0.0.1' }, null);
        await expect(r.resolve(ctx)).resolves.toEqual({
            status: 'resolved', projectKey: 'did:hedera:testnet:abc', method: 'topic', metadata: { dynamicTopicId: '0.0.999' },
        });
    });

    it('passes for an instance topic', async () => {
        const r = makeResolver({ kind: 'instance', name: null, instancePolicyTopicId: '0.0.999' });
        await expect(r.resolve(ctx)).resolves.toEqual({ status: 'pass' });
    });

    it('passes for an "other" topic', async () => {
        const r = makeResolver({ kind: 'other', name: null, instancePolicyTopicId: null });
        await expect(r.resolve(ctx)).resolves.toEqual({ status: 'pass' });
    });
});
