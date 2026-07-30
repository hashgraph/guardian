import assert from 'node:assert/strict';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';

const doc = (fields) => ({ document: { credentialSubject: [fields] } });
const filter = (field, type, value) => ({ field, type, value });

describe('PolicyUtils.checkDocumentField', () => {
    describe('equal / not_equal', () => {
        it('equal: exact match', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ status: 'Approved' }), filter('document.credentialSubject.0.status', 'equal', 'Approved')), true);
        });

        it('equal: mismatch', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ status: 'Pending' }), filter('document.credentialSubject.0.status', 'equal', 'Approved')), false);
        });

        it('not_equal: different values', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ status: 'Pending' }), filter('document.credentialSubject.0.status', 'not_equal', 'Approved')), true);
        });

        it('not_equal: same value', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ status: 'Approved' }), filter('document.credentialSubject.0.status', 'not_equal', 'Approved')), false);
        });

        it('returns false for null document', () => {
            assert.equal(PolicyUtils.checkDocumentField(null, filter('field', 'equal', 'x')), false);
        });
    });

    describe('in / not_in (comma-separated list)', () => {
        it('in: field value is in the list', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'B' }), filter('document.credentialSubject.0.type', 'in', 'A,B,C')), true);
        });

        it('in: field value is not in the list', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'D' }), filter('document.credentialSubject.0.type', 'in', 'A,B,C')), false);
        });

        it('in: trims whitespace from list entries', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'B' }), filter('document.credentialSubject.0.type', 'in', 'A, B, C')), true);
        });

        it('in: single-entry list works', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'A' }), filter('document.credentialSubject.0.type', 'in', 'A')), true);
        });

        it('not_in: field value absent from list', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'D' }), filter('document.credentialSubject.0.type', 'not_in', 'A,B,C')), true);
        });

        it('not_in: field value present in list', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ type: 'A' }), filter('document.credentialSubject.0.type', 'not_in', 'A,B,C')), false);
        });
    });

    describe('gt / gte / lt / lte — numeric coercion', () => {
        it('gt: numeric string field > numeric string config', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ qty: '10' }), filter('document.credentialSubject.0.qty', 'gt', '5')), true);
        });

        it('gt: numeric field (number type) vs numeric string config', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ qty: 10 }), filter('document.credentialSubject.0.qty', 'gt', '5')), true);
        });

        it('gt: equal values is false', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ qty: 5 }), filter('document.credentialSubject.0.qty', 'gt', '5')), false);
        });

        it('gt: less-than is false', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ qty: 3 }), filter('document.credentialSubject.0.qty', 'gt', '5')), false);
        });

        it('gt: avoids lexicographic trap — 9 > 10 is false numerically', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ qty: '9' }), filter('document.credentialSubject.0.qty', 'gt', '10')), false);
        });

        it('gte: equal values is true', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ qty: 5 }), filter('document.credentialSubject.0.qty', 'gte', '5')), true);
        });

        it('lt: field less than config', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ qty: 3 }), filter('document.credentialSubject.0.qty', 'lt', '5')), true);
        });

        it('lte: equal values is true', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ qty: 5 }), filter('document.credentialSubject.0.qty', 'lte', '5')), true);
        });
    });

    describe('gt / gte / lt / lte — Date coercion', () => {
        it('gt: later ISO date is greater', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ date: '2024-06-01' }), filter('document.credentialSubject.0.date', 'gt', '2024-01-01')), true);
        });

        it('gt: earlier ISO date is not greater', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ date: '2024-01-01' }), filter('document.credentialSubject.0.date', 'gt', '2024-06-01')), false);
        });

        it('gte: same ISO date is true', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ date: '2024-06-01' }), filter('document.credentialSubject.0.date', 'gte', '2024-06-01')), true);
        });

        it('lt: earlier ISO date is less', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ date: '2023-12-31' }), filter('document.credentialSubject.0.date', 'lt', '2024-01-01')), true);
        });

        it('lte: same date is true', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ date: '2024-01-01' }), filter('document.credentialSubject.0.date', 'lte', '2024-01-01')), true);
        });

        it('full ISO timestamp comparison', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ ts: '2024-06-01T12:00:00.000Z' }), filter('document.credentialSubject.0.ts', 'gt', '2024-06-01T10:00:00.000Z')), true);
        });
    });

    describe('gt / gte / lt / lte — non-date strings', () => {
        it('status string "Approved" compared to another string returns a boolean', () => {
            const result = PolicyUtils.checkDocumentField(
                doc({ status: 'Approved' }),
                filter('document.credentialSubject.0.status', 'gt', 'Active')
            );
            assert.equal(typeof result, 'boolean');
        });
    });

    describe('unknown operator', () => {
        it('returns false for unrecognised operator', () => {
            assert.equal(PolicyUtils.checkDocumentField(doc({ x: 1 }), filter('document.credentialSubject.0.x', 'regex', '.*')), false);
        });
    });
});
