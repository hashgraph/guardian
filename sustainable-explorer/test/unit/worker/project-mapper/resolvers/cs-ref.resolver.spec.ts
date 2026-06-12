import { describe, expect, it, jest } from '@jest/globals';
import { DataSource } from 'typeorm';
import { CsRefResolver } from '@worker/project-mapper/resolvers/cs-ref.resolver';
import { TopicClassifierService } from '@worker/project-mapper/topic-classifier';
import { ResolutionContext } from '@worker/project-mapper/resolvers/resolver.types';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a mock DataSource whose `query` method dispatches on SQL shape.
 *
 * Each handler is keyed by a substring that uniquely identifies the query:
 *   'AS ref'          → resolveViaRef start (fetch the ref field from start VC)
 *   'AS cs_id'        → resolveViaRef hop   (follow ref chain)
 *   'AS schema_type'  → isCsIdOnProjectSchema
 *   'FROM business_view' → isKnownProjectRow
 *   'AS ts'           → earliestTimestampForCsId
 */
function makeDs(
    handlers: Record<string, () => unknown[]>,
): DataSource {
    const query = jest.fn(async (sql: string) => {
        for (const [key, handler] of Object.entries(handlers)) {
            if (sql.includes(key)) return handler();
        }
        return [];
    });
    return { query } as unknown as DataSource;
}

const baseCtx: ResolutionContext = {
    consensusTimestamp: '1700000000.0',
    topicId: '0.0.999',
    csId: 'did:hedera:testnet:self',
    csRef: 'did:hedera:testnet:root',
    isProjectSchemaVc: false,
    policyHasProjectSchemaClassification: false,
    policyMapping: {},
};

const classifiedCtx: ResolutionContext = {
    ...baseCtx,
    policyHasProjectSchemaClassification: true,
    isProjectSchemaVc: false,
};

// Mapping that declares one project schema UUID so isCsIdOnProjectSchema has
// something to compare against. Required PolicyMappingEntry fields (source,
// title, description) are included to satisfy the type.
const policyMappingWithSchema = {
    someStep: [{
        source: 'schema' as const,
        title: 'Project',
        description: 'Project schema',
        isProjectSchema: true,
        schemaIri: '#abc-uuid&1.0.0',
    }],
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe('CsRefResolver (M2)', () => {
    it('passes when ctx.csRef is empty (no ref present on this VC)', async () => {
        const ds = makeDs({});
        const resolver = new CsRefResolver(ds, {} as unknown as TopicClassifierService);
        const result = await resolver.resolve({ ...baseCtx, csRef: '' });
        expect(result).toEqual({ status: 'pass' });
    });

    it('resolves with rootVcTimestamp when cs.ref chain lands on a project-schema VC', async () => {
        // resolveViaRef: start VC has no further ref → returns null (cs.ref used as-is)
        // isCsIdOnProjectSchema: root VC type matches the schema UUID → true
        // earliestTimestampForCsId: returns a root timestamp
        const ds = makeDs({
            'AS ref': () => [{ ref: null }],           // resolveViaRef start — no ref field
            'AS schema_type': () => [{ schema_type: '#abc-uuid&1.0.0' }], // on project schema
            'AS ts': () => [{ ts: '1699000000.0' }],   // earliestTimestampForCsId
        });
        const resolver = new CsRefResolver(ds, {} as unknown as TopicClassifierService);
        const result = await resolver.resolve({
            ...classifiedCtx,
            csRef: 'did:hedera:testnet:root',
            policyMapping: policyMappingWithSchema,
        });
        expect(result).toEqual({
            status: 'resolved',
            projectKey: 'did:hedera:testnet:root',
            method: 'csRef',
            metadata: { rootVcTimestamp: '1699000000.0' },
        });
    });

    it('resolves when root is NOT on project schema but IS a known PROJECT row (new behaviour)', async () => {
        // resolveViaRef: start VC has no further ref → resolvedKey = ctx.csRef
        // isCsIdOnProjectSchema: schema_type does NOT match → onProjectSchema = false
        // isKnownProjectRow: business_view returns a row → true  ← new gate
        // earliestTimestampForCsId: returns a root timestamp
        const ds = makeDs({
            'AS ref': () => [{ ref: null }],           // resolveViaRef start — no ref field
            'AS schema_type': () => [{ schema_type: '#other-uuid&1.0.0' }], // NOT project schema
            'FROM business_view': () => [{ '?column?': 1 }],               // IS known PROJECT row
            'AS ts': () => [{ ts: '1699000001.0' }],   // earliestTimestampForCsId
        });
        const resolver = new CsRefResolver(ds, {} as unknown as TopicClassifierService);
        const result = await resolver.resolve({
            ...classifiedCtx,
            csRef: 'did:hedera:testnet:root',
            policyMapping: policyMappingWithSchema,
        });
        expect(result).toEqual({
            status: 'resolved',
            projectKey: 'did:hedera:testnet:root',
            method: 'csRef',
            metadata: { rootVcTimestamp: '1699000001.0' },
        });
    });

    it('rejects when root is neither on project schema nor a known PROJECT row', async () => {
        // resolveViaRef: start VC has no further ref → resolvedKey = ctx.csRef
        // isCsIdOnProjectSchema: schema_type does NOT match → false
        // isKnownProjectRow: business_view returns empty → false
        const ds = makeDs({
            'AS ref': () => [{ ref: null }],           // resolveViaRef start — no ref field
            'AS schema_type': () => [{ schema_type: '#other-uuid&1.0.0' }], // NOT project schema
            'FROM business_view': () => [],             // NOT a known PROJECT row
        });
        const resolver = new CsRefResolver(ds, {} as unknown as TopicClassifierService);
        const result = await resolver.resolve({
            ...classifiedCtx,
            csRef: 'did:hedera:testnet:root',
            policyMapping: policyMappingWithSchema,
        });
        expect(result).toEqual({
            status: 'reject',
            reason: 'cs.ref resolves to non-project-schema VC with no known project row',
        });
    });
});
