import { describe, expect, it, jest } from '@jest/globals';
import { ProjectKeyResolverChain } from '@worker/project-mapper/resolvers/resolver-chain.service';
import { ResolutionContext, ResolutionOutcome } from '@worker/project-mapper/resolvers/resolver.types';
import { DynamicTopicResolver } from '@worker/project-mapper/resolvers/dynamic-topic.resolver';
import { CsRefResolver } from '@worker/project-mapper/resolvers/cs-ref.resolver';
import { RelationshipsResolver } from '@worker/project-mapper/resolvers/relationships.resolver';
import { ProjectSchemaResolver } from '@worker/project-mapper/resolvers/project-schema.resolver';

const ctx: ResolutionContext = {
    consensusTimestamp: '1700000000.0',
    topicId: '0.0.123',
    csId: 'did:hedera:testnet:abc',
    csRef: '',
    isProjectSchemaVc: false,
    policyHasProjectSchemaClassification: false,
    policyMapping: {},
};

type ResolveFn = (c: ResolutionContext) => Promise<ResolutionOutcome>;
const fake = (resolve: ResolveFn) => ({ resolve: jest.fn(resolve) });
const pass: ResolveFn = async () => ({ status: 'pass' });

const build = (r1: ReturnType<typeof fake>, r2: ReturnType<typeof fake>, r3: ReturnType<typeof fake>, r4: ReturnType<typeof fake>) =>
    new ProjectKeyResolverChain(
        r1 as unknown as DynamicTopicResolver,
        r2 as unknown as CsRefResolver,
        r3 as unknown as RelationshipsResolver,
        r4 as unknown as ProjectSchemaResolver,
    );

describe('ProjectKeyResolverChain', () => {
    it('returns the first resolved result and short-circuits', async () => {
        const r1 = fake(async () => ({ status: 'resolved', projectKey: 'K1', method: 'topic' }));
        const r2 = fake(pass);
        const chain = build(r1, r2, fake(pass), fake(pass));
        await expect(chain.resolve(ctx)).resolves.toEqual({ projectKey: 'K1', method: 'topic' });
        expect(r2.resolve).not.toHaveBeenCalled();
    });

    it('returns null and short-circuits on reject', async () => {
        const r3 = fake(pass);
        const chain = build(fake(pass), fake(async () => ({ status: 'reject', reason: 'nope' })), r3, fake(pass));
        await expect(chain.resolve(ctx)).resolves.toBeNull();
        expect(r3.resolve).not.toHaveBeenCalled();
    });

    it('absorbs a throwing strategy as pass and continues the chain', async () => {
        const chain = build(
            fake(async () => { throw new Error('boom'); }),
            fake(async () => ({ status: 'resolved', projectKey: 'K2', method: 'csRef' })),
            fake(pass), fake(pass),
        );
        await expect(chain.resolve(ctx)).resolves.toEqual({ projectKey: 'K2', method: 'csRef' });
    });

    it('returns null when every strategy passes', async () => {
        const chain = build(fake(pass), fake(pass), fake(pass), fake(pass));
        await expect(chain.resolve(ctx)).resolves.toBeNull();
    });
});
