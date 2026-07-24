import { describe, expect, it } from '@jest/globals';
import { DataSource } from 'typeorm';
import { ProjectSchemaResolver } from '@worker/project-mapper/resolvers/project-schema.resolver';
import { TopicClassifierService } from '@worker/project-mapper/topic-classifier';
import { ResolutionContext } from '@worker/project-mapper/resolvers/resolver.types';

const baseCtx: ResolutionContext = {
    consensusTimestamp: '1700000000.0',
    topicId: '0.0.999',
    csId: 'did:hedera:testnet:proj',
    csRef: '',
    isProjectSchemaVc: false,
    policyHasProjectSchemaClassification: false,
    policyMapping: {},
};

// earliestTimestampForCsId issues one query; return the root VC's timestamp.
const ds = { query: async () => [{ ts: '1699999999.0' }] } as unknown as DataSource;
const resolver = new ProjectSchemaResolver(ds, {} as unknown as TopicClassifierService);

describe('ProjectSchemaResolver (M4)', () => {
    it('keys a project-schema VC by its own cs.id, recording rootVcTimestamp', async () => {
        await expect(resolver.resolve({ ...baseCtx, isProjectSchemaVc: true })).resolves.toEqual({
            status: 'resolved', projectKey: 'did:hedera:testnet:proj', method: 'projectSchema',
            metadata: { rootVcTimestamp: '1699999999.0' },
        });
    });

    it('rejects a non-project-schema VC in a classified policy', async () => {
        await expect(resolver.resolve({ ...baseCtx, isProjectSchemaVc: false, policyHasProjectSchemaClassification: true })).resolves.toEqual({
            status: 'reject', reason: 'not the project schema, no cs.ref/ancestor',
        });
    });

    it('passes in an unclassified policy', async () => {
        await expect(resolver.resolve({ ...baseCtx, isProjectSchemaVc: false, policyHasProjectSchemaClassification: false })).resolves.toEqual({
            status: 'pass',
        });
    });
});
