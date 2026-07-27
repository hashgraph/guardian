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
        const acceptCases = [
            ['accepts a whitelisted system field',
                f('owner', 'eq', 'did:x'),
                (q) => assert.deepEqual(q.owner, { $eq: 'did:x' })],
            ['accepts an option.* field',
                f('option.status', 'eq', 'APPROVED'),
                (q) => assert.deepEqual(q['option.status'], { $eq: 'APPROVED' })],
            ['accepts a document.* field',
                f('document.credentialSubject.field', 'eq', 'v'),
                (q) => assert.deepEqual(q['document.credentialSubject.field'], { $eq: 'v' })],
            ['normalises bracket array notation to dot notation',
                f('document.credentialSubject[0].field3', 'eq', 'v'),
                (q) => {
                    assert.ok('document.credentialSubject.0.field3' in q);
                    assert.ok(!('document.credentialSubject[0].field3' in q));
                }],
        ];
        for (const [name, input, check] of acceptCases) {
            it(name, () => check(buildMongoFilter(POLICY_ID, SCHEMA_IRI, input)));
        }

        it('rejects an unknown field', () => {
            assert.throws(
                () => buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('fooBar', 'eq', 'x')),
                /Unknown filter field/
            );
        });
    });

    describe('rejection paths', () => {
        const rejectCases = [
            ['rejects an unknown operator',
                f('hederaStatus', 'like', 'x'), /Unknown operator/],
            ['rejects a malformed entry missing "op"',
                { hederaStatus: { value: 'x' } }, /must have shape/],
            ['rejects a malformed entry missing "value"',
                { hederaStatus: { op: 'eq' } }, /must have shape/],
            ['rejects eq/ne with a non-scalar, non-null value',
                f('hederaStatus', 'eq', { nested: true }), /requires a string, number, boolean, or null/],
            ['rejects a range operator with a non-scalar value',
                f('createDate', 'gt', { a: 1 }), /requires a string, number, or boolean/],
        ];
        for (const [name, input, expected] of rejectCases) {
            it(name, () => {
                assert.throws(() => buildMongoFilter(POLICY_ID, SCHEMA_IRI, input), expected);
            });
        }

        it('allows eq with an explicit null value (positive control)', () => {
            const q = buildMongoFilter(POLICY_ID, SCHEMA_IRI, f('hederaStatus', 'eq', null));
            assert.deepEqual(q.hederaStatus, { $eq: null });
        });
    });
});
