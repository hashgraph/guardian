import assert from 'node:assert/strict';
import { buildMongoFilter } from '../../dist/api/policy-data.service.js';
import { POLICY_DATA_MAX_CONTAINS_LENGTH } from '@guardian/interfaces';

const POLICY_ID = 'pol-1';
const SCHEMA_IRI = '#MRVData';

// Wrap a single field filter so tests read as { op, value } pairs.
const f = (field, op, value) => ({ [field]: { op, value } });

describe('buildMongoFilter', () => {
    it('returns only policyId + schema when no filters are supplied', () => {
        assert.deepEqual(
            buildMongoFilter(POLICY_ID, SCHEMA_IRI, undefined),
            { policyId: POLICY_ID, schema: SCHEMA_IRI }
        );
    });

    it('always pins policyId and schema even when filters are present', () => {
        const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'eq', 'ISSUE'));
        assert.equal(q.policyId, POLICY_ID);
        assert.equal(q.schema, SCHEMA_IRI);
    });

    describe('operator mapping', () => {
        const cases = [
            ['eq', 'ISSUE', { $eq: 'ISSUE' }],
            ['ne', 'ISSUE', { $ne: 'ISSUE' }],
            ['gt', 5, { $gt: 5 }],
            ['gte', 5, { $gte: 5 }],
            ['lt', 5, { $lt: 5 }],
            ['lte', 5, { $lte: 5 }],
            ['in', ['A', 'B'], { $in: ['A', 'B'] }],
            ['nin', ['A', 'B'], { $nin: ['A', 'B'] }],
        ];
        for (const [op, value, expected] of cases) {
            it(`maps "${op}" to the correct Mongo operator`, () => {
                const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', op, value));
                assert.deepEqual(q.hederaStatus, expected);
            });
        }
    });

    describe('contains', () => {
        it('builds a case-insensitive $regex', () => {
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'contains', 'issue'));
            assert.deepEqual(q.hederaStatus, { $regex: 'issue', $options: 'i' });
        });

        it('escapes regex metacharacters in the value', () => {
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'contains', 'a.b*c+d'));
            // '.', '*' and '+' must be backslash-escaped so they match literally
            assert.equal(q.hederaStatus.$regex, 'a\\.b\\*c\\+d');
            assert.equal(q.hederaStatus.$options, 'i');
        });

        it('rejects a non-string value', () => {
            assert.throws(
                () => buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'contains', 5)),
                /requires a string value/
            );
        });

        it('rejects a value over the max length', () => {
            const tooLong = 'x'.repeat(POLICY_DATA_MAX_CONTAINS_LENGTH + 1);
            assert.throws(
                () => buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'contains', tooLong)),
                /exceeds max length/
            );
        });

        it('accepts a value exactly at the max length', () => {
            const atLimit = 'x'.repeat(POLICY_DATA_MAX_CONTAINS_LENGTH);
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'contains', atLimit));
            assert.equal(q.hederaStatus.$regex, atLimit);
        });
    });

    describe('in / nin value coercion', () => {
        it('splits a comma-separated string and trims each element', () => {
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'in', 'a, b ,c'));
            assert.deepEqual(q.hederaStatus, { $in: ['a', 'b', 'c'] });
        });

        it('passes an array through unchanged', () => {
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'nin', ['A', 'B']));
            assert.deepEqual(q.hederaStatus, { $nin: ['A', 'B'] });
        });

        it('wraps a lone scalar into a single-element array', () => {
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'in', 42));
            assert.deepEqual(q.hederaStatus, { $in: [42] });
        });

        it('rejects an array element that is not a scalar', () => {
            assert.throws(
                () => buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'in', ['A', {}])),
                /requires all array elements/
            );
        });
    });

    describe('field whitelist & path normalisation', () => {
        it('accepts a whitelisted system field', () => {
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('owner', 'eq', 'did:x'));
            assert.deepEqual(q.owner, { $eq: 'did:x' });
        });

        it('accepts an option.* field', () => {
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('option.status', 'eq', 'APPROVED'));
            assert.deepEqual(q['option.status'], { $eq: 'APPROVED' });
        });

        it('accepts a document.* field', () => {
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('document.credentialSubject.field', 'eq', 'v'));
            assert.deepEqual(q['document.credentialSubject.field'], { $eq: 'v' });
        });

        it('normalises bracket array notation to dot notation', () => {
            const q = buildMongoFilter(
                POLICY_ID, SCHEMA_IRI,
                f('document.credentialSubject[0].field3', 'eq', 'v')
            );
            assert.ok('document.credentialSubject.0.field3' in q);
            assert.ok(!('document.credentialSubject[0].field3' in q));
        });

        it('rejects an unknown field', () => {
            assert.throws(
                () => buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('fooBar', 'eq', 'x')),
                /Unknown filter field/
            );
        });
    });

    describe('rejection paths', () => {
        it('rejects an unknown operator', () => {
            assert.throws(
                () => buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'like', 'x')),
                /Unknown operator/
            );
        });

        it('rejects a malformed entry missing "op"', () => {
            assert.throws(
                () => buildMongoFilter(POLICY_ID, SCHEMA_IRI, { hederaStatus: { value: 'x' } }),
                /must have shape/
            );
        });

        it('rejects a malformed entry missing "value"', () => {
            assert.throws(
                () => buildMongoFilter(POLICY_ID, SCHEMA_IRI, { hederaStatus: { op: 'eq' } }),
                /must have shape/
            );
        });

        it('rejects eq/ne with a non-scalar, non-null value', () => {
            assert.throws(
                () => buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'eq', { nested: true })),
                /requires a string, number, boolean, or null/
            );
        });

        it('allows eq with an explicit null value', () => {
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'eq', null));
            assert.deepEqual(q.hederaStatus, { $eq: null });
        });

        it('rejects a range operator with a non-scalar value', () => {
            assert.throws(
                () => buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('createDate', 'gt', { a: 1 })),
                /requires a string, number, or boolean/
            );
        });
    });
});
