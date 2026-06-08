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

const makeResolver = (classification: TopicClassification): DynamicTopicResolver => {
    const classifier = { classifyTopic: jest.fn(async () => classification) } as unknown as TopicClassifierService;
    return new DynamicTopicResolver({} as unknown as DataSource, classifier);
};

describe('DynamicTopicResolver (M1)', () => {
    it('resolves by topicId for a dynamic-project topic', async () => {
        const r = makeResolver({ kind: 'dynamic-project', name: 'Project', instancePolicyTopicId: '0.0.1' });
        await expect(r.resolve(ctx)).resolves.toEqual({ status: 'resolved', projectKey: '0.0.999', method: 'topic' });
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
