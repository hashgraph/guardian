import assert from 'node:assert/strict';
import { ObjectId } from '@mikro-orm/mongodb';
import {
    PreviewQueryUnsupportedError,
    buildPreviewDocumentCache,
    comparePreviewRecords,
    matchesPreviewFilter,
    normalizePreviewFilter,
    normalizePreviewOrder
} from '../../../dist/policy-engine/helpers/preview-query.js';

const MANUAL = 'https://www.mongodb.com/docs/v6.0';

const matchCases = [
    {
        rule: 'implicit equality on a scalar field',
        source: `${MANUAL}/tutorial/query-documents/`,
        record: { status: 'approved' },
        filter: { status: 'approved' },
        expected: true
    },
    {
        rule: 'equality is type-strict: the string "5" does not equal the number 5',
        source: `${MANUAL}/reference/bson-type-comparison-order/`,
        record: { amount: 5 },
        filter: { amount: { $eq: '5' } },
        expected: false
    },
    {
        rule: 'an integer and a double with the same value are equal',
        source: `${MANUAL}/reference/bson-type-comparison-order/`,
        record: { amount: 5 },
        filter: { amount: 5.0 },
        expected: true
    },
    {
        rule: 'a dotted path reaches a nested field',
        source: `${MANUAL}/tutorial/query-embedded-documents/`,
        record: { document: { credentialSubject: { area: 10 } } },
        filter: { 'document.credentialSubject.area': 10 },
        expected: true
    },
    {
        rule: 'a dotted path without an index matches when any array element matches',
        source: `${MANUAL}/tutorial/query-array-of-documents/`,
        record: { document: { credentialSubject: [{ id: 'B' }, { id: 'A' }] } },
        filter: { 'document.credentialSubject.id': { $eq: 'A' } },
        expected: true
    },
    {
        rule: 'a numeric path segment selects that array element only',
        source: `${MANUAL}/tutorial/query-array-of-documents/`,
        record: { document: { credentialSubject: [{ id: 'B' }, { id: 'A' }] } },
        filter: { 'document.credentialSubject.0.id': 'A' },
        expected: false
    },
    {
        rule: 'equality against an array field matches an element',
        source: `${MANUAL}/tutorial/query-arrays/`,
        record: { tags: ['red', 'blue'] },
        filter: { tags: 'blue' },
        expected: true
    },
    {
        rule: 'equality against an array field matches the whole array in the same order',
        source: `${MANUAL}/tutorial/query-arrays/`,
        record: { tags: ['red', 'blue'] },
        filter: { tags: { $eq: ['red', 'blue'] } },
        expected: true
    },
    {
        rule: 'whole-array equality is order sensitive',
        source: `${MANUAL}/tutorial/query-arrays/`,
        record: { tags: ['red', 'blue'] },
        filter: { tags: { $eq: ['blue', 'red'] } },
        expected: false
    },
    {
        rule: '$gt compares only within one type: a string bound never matches a number',
        source: `${MANUAL}/reference/method/db.collection.find/`,
        record: { amount: 7 },
        filter: { amount: { $gt: '5' } },
        expected: false
    },
    {
        rule: '$gt on strings compares them as text, so "10" is not greater than "5"',
        source: `${MANUAL}/reference/bson-type-comparison-order/`,
        record: { amount: '10' },
        filter: { amount: { $gt: '5' } },
        expected: false
    },
    {
        rule: '$gte and $lte on numbers include the bound',
        source: `${MANUAL}/reference/operator/query/gte/`,
        record: { amount: 5 },
        filter: { amount: { $gte: 5, $lte: 5 } },
        expected: true
    },
    {
        rule: '$lt against an array matches when any element is lower',
        source: `${MANUAL}/tutorial/query-arrays/`,
        record: { values: [10, 2] },
        filter: { values: { $lt: 5 } },
        expected: true
    },
    {
        rule: 'several operators on one field must all hold',
        source: `${MANUAL}/reference/operator/query/and/`,
        record: { amount: 7 },
        filter: { amount: { $gt: 5, $lt: 6 } },
        expected: false
    },
    {
        rule: 'equality with null matches a missing field',
        source: `${MANUAL}/tutorial/query-for-null-fields/`,
        record: { other: 1 },
        filter: { note: null },
        expected: true
    },
    {
        rule: 'equality with null matches an explicit null',
        source: `${MANUAL}/tutorial/query-for-null-fields/`,
        record: { note: null },
        filter: { note: { $eq: null } },
        expected: true
    },
    {
        rule: '$exists: false matches only a missing field, not null',
        source: `${MANUAL}/tutorial/query-for-null-fields/`,
        record: { initId: null },
        filter: { initId: { $exists: false } },
        expected: false
    },
    {
        rule: '$exists: false matches a missing field',
        source: `${MANUAL}/reference/operator/query/exists/`,
        record: { other: 1 },
        filter: { initId: { $exists: false } },
        expected: true
    },
    {
        rule: '$exists: true matches when any array element has the field',
        source: `${MANUAL}/reference/operator/query/exists/`,
        record: { items: [{ a: 1 }, { b: 2 }] },
        filter: { 'items.a': { $exists: true } },
        expected: true
    },
    {
        rule: '$ne matches a document where the field is missing',
        source: `${MANUAL}/reference/operator/query/ne/`,
        record: { other: 1 },
        filter: { edited: { $ne: true } },
        expected: true
    },
    {
        rule: '$ne does not match when any array element equals the value',
        source: `${MANUAL}/reference/operator/query/ne/`,
        record: { tags: ['red', 'blue'] },
        filter: { tags: { $ne: 'blue' } },
        expected: false
    },
    {
        rule: '$ne with a value of another type matches',
        source: `${MANUAL}/reference/operator/query/ne/`,
        record: { amount: 5 },
        filter: { amount: { $ne: '5' } },
        expected: true
    },
    {
        rule: '$in matches when the field equals any listed value',
        source: `${MANUAL}/reference/operator/query/in/`,
        record: { owner: 'did:b' },
        filter: { owner: { $in: ['did:a', 'did:b'] } },
        expected: true
    },
    {
        rule: '$in with null in the list matches a missing field',
        source: `${MANUAL}/reference/operator/query/in/`,
        record: { other: 1 },
        filter: { owner: { $in: [null] } },
        expected: true
    },
    {
        rule: '$in matches an array field when any element is listed',
        source: `${MANUAL}/reference/operator/query/in/`,
        record: { tags: ['red', 'blue'] },
        filter: { tags: { $in: ['green', 'blue'] } },
        expected: true
    },
    {
        rule: '$nin matches a missing field',
        source: `${MANUAL}/reference/operator/query/nin/`,
        record: { other: 1 },
        filter: { status: { $nin: ['a', 'b'] } },
        expected: true
    },
    {
        rule: '$nin does not match when any array element is listed',
        source: `${MANUAL}/reference/operator/query/nin/`,
        record: { tags: ['red', 'blue'] },
        filter: { tags: { $nin: ['blue'] } },
        expected: false
    },
    {
        rule: '$regex matches a string',
        source: `${MANUAL}/reference/operator/query/regex/`,
        record: { name: 'Plot North 7' },
        filter: { name: { $regex: '.*North.*' } },
        expected: true
    },
    {
        rule: '$regex never matches a number',
        source: `${MANUAL}/reference/operator/query/regex/`,
        record: { name: 17 },
        filter: { name: { $regex: '.*1.*' } },
        expected: false
    },
    {
        rule: '$regex matches a string element of an array',
        source: `${MANUAL}/reference/operator/query/regex/`,
        record: { names: [1, 'Plot North'] },
        filter: { names: { $regex: 'North' } },
        expected: true
    },
    {
        rule: '$not matches a missing field',
        source: `${MANUAL}/reference/operator/query/not/`,
        record: { other: 1 },
        filter: { hederaStatus: { $not: { $eq: 'REVOKE' } } },
        expected: true
    },
    {
        rule: '$not fails where the inner expression holds',
        source: `${MANUAL}/reference/operator/query/not/`,
        record: { hederaStatus: 'REVOKE' },
        filter: { hederaStatus: { $not: { $eq: 'REVOKE' } } },
        expected: false
    },
    {
        rule: '$or matches when any branch matches',
        source: `${MANUAL}/reference/operator/query/or/`,
        record: { document: { credentialSubject: [{ id: 'X' }] } },
        filter: {
            $or: [
                { 'document.credentialSubject.id': { $eq: 'X' } },
                { 'document.credentialSubject.0.id': { $eq: 'Y' } }
            ]
        },
        expected: true
    },
    {
        rule: 'ObjectId equality compares the id value',
        source: `${MANUAL}/reference/bson-types/`,
        record: { _id: new ObjectId('64b7f0a1c2d3e4f5a6b7c8d9') },
        filter: { _id: new ObjectId('64b7f0a1c2d3e4f5a6b7c8d9') },
        expected: true
    }
];

describe('@unit preview query matcher', () => {
    describe('matches as MongoDB 6.0', () => {
        for (const item of matchCases) {
            it(`${item.rule} (${item.source})`, () => {
                const filter = normalizePreviewFilter(item.filter);
                assert.equal(matchesPreviewFilter(item.record, filter), item.expected);
            });
        }
    });

    describe('normalizes the filter as MikroORM 6.6.17 does before MongoDB sees it', () => {
        it('renames id to _id and turns a 24-hex string into an ObjectId', () => {
            const filter = normalizePreviewFilter({ id: '64b7f0a1c2d3e4f5a6b7c8d9' });
            assert.deepEqual(Object.keys(filter), ['_id']);
            assert.ok(filter._id instanceof ObjectId);
            assert.equal(String(filter._id), '64b7f0a1c2d3e4f5a6b7c8d9');
        });

        it('turns a string filter into an _id lookup', () => {
            const filter = normalizePreviewFilter('64b7f0a1c2d3e4f5a6b7c8d9');
            assert.equal(String(filter._id), '64b7f0a1c2d3e4f5a6b7c8d9');
            assert.equal(matchesPreviewFilter({ _id: new ObjectId('64b7f0a1c2d3e4f5a6b7c8d9') }, filter), true);
        });

        it('converts ObjectId strings inside an _id operator list', () => {
            const filter = normalizePreviewFilter({ _id: { $nin: ['64b7f0a1c2d3e4f5a6b7c8d9'] } });
            assert.ok(filter._id.$nin[0] instanceof ObjectId);
            assert.equal(matchesPreviewFilter({ _id: new ObjectId('64b7f0a1c2d3e4f5a6b7c8d9') }, filter), false);
        });

        it('turns an undefined value into null, so it matches a missing field', () => {
            const filter = normalizePreviewFilter({ group: undefined });
            assert.equal(filter.group, null);
            assert.equal(matchesPreviewFilter({ owner: 'did:a' }, filter), true);
            assert.equal(matchesPreviewFilter({ group: 'g1' }, filter), false);
        });

        it('turns an array value on a field into $in', () => {
            const filter = normalizePreviewFilter({ owner: ['did:a', 'did:b'] });
            assert.deepEqual(filter.owner, { $in: ['did:a', 'did:b'] });
            assert.equal(matchesPreviewFilter({ owner: 'did:b' }, filter), true);
        });

        it('turns $re into a regular expression', () => {
            const filter = normalizePreviewFilter({ name: { $re: '^Plot' } });
            assert.ok(filter.name.$regex instanceof RegExp);
            assert.equal(matchesPreviewFilter({ name: 'Plot 1' }, filter), true);
        });

        it('treats a missing filter as an empty one', () => {
            assert.deepEqual(normalizePreviewFilter(undefined), {});
            assert.equal(matchesPreviewFilter({ a: 1 }, normalizePreviewFilter(null)), true);
        });
    });

    describe('refuses what it does not support', () => {
        const unsupported = [
            ['an unknown field operator', { amount: { $elemMatch: { a: 1 } } }],
            ['an unknown top-level operator', { $where: 'this.a > 1' }],
            ['a sub-document equality', { location: { lat: 1 } }],
            ['$gt with a list', { amount: { $gt: [1, 2] } }],
            ['$in without a list', { amount: { $in: 'a' } }]
        ];
        for (const [name, raw] of unsupported) {
            it(name, () => {
                assert.throws(
                    () => matchesPreviewFilter({ amount: 1 }, normalizePreviewFilter(raw)),
                    PreviewQueryUnsupportedError
                );
            });
        }
    });

    describe('sorts as MongoDB 6.0', () => {
        const sortSource = `${MANUAL}/reference/bson-type-comparison-order/`;

        it(`orders types null, numbers, strings, objects, ObjectId, booleans, dates (${sortSource})`, () => {
            const values = [new Date(1), true, new ObjectId('64b7f0a1c2d3e4f5a6b7c8d9'), { a: 1 }, 'a', 2, null];
            const records = values.map((value) => ({ value }));
            const order = normalizePreviewOrder({ value: 'ASC' });
            const sorted = [...records].sort((a, b) => comparePreviewRecords(a, b, order)).map((record) => record.value);
            assert.equal(sorted[0], null);
            assert.equal(sorted[1], 2);
            assert.equal(sorted[2], 'a');
            assert.deepEqual(sorted[3], { a: 1 });
            assert.ok(sorted[4] instanceof ObjectId);
            assert.equal(sorted[5], true);
            assert.ok(sorted[6] instanceof Date);
        });

        it(`a missing field sorts as null (${sortSource})`, () => {
            const order = normalizePreviewOrder({ value: 'ASC' });
            assert.equal(comparePreviewRecords({}, { value: null }, order), 0);
            assert.ok(comparePreviewRecords({}, { value: 0 }, order) < 0);
        });

        it(`an array sorts by its lowest element ascending and its highest descending (${MANUAL}/reference/method/cursor.sort/)`, () => {
            const ascending = normalizePreviewOrder({ value: 'ASC' });
            const descending = normalizePreviewOrder({ value: 'DESC' });
            const a = { value: [1, 9] };
            const b = { value: [5] };
            assert.ok(comparePreviewRecords(a, b, ascending) < 0);
            assert.ok(comparePreviewRecords(a, b, descending) < 0);
        });

        it(`an empty array sorts before null (${MANUAL}/reference/method/cursor.sort/)`, () => {
            const order = normalizePreviewOrder({ value: 'ASC' });
            assert.ok(comparePreviewRecords({ value: [] }, { value: null }, order) < 0);
        });

        it('sorts by a date, newest first, with DESC', () => {
            const order = normalizePreviewOrder({ createDate: 'DESC' });
            const older = { createDate: new Date('2026-01-01T00:00:00Z') };
            const newer = { createDate: new Date('2026-06-01T00:00:00Z') };
            assert.ok(comparePreviewRecords(newer, older, order) < 0);
        });

        it(`compares strings by their bytes, so "B" sorts before "a" (${sortSource})`, () => {
            const order = normalizePreviewOrder({ value: 'ASC' });
            assert.ok(comparePreviewRecords({ value: 'B' }, { value: 'a' }, order) < 0);
        });

        it('renames id to _id in a sort and refuses an unknown direction', () => {
            assert.deepEqual(normalizePreviewOrder({ id: 'DESC' }), [['_id', -1]]);
            assert.throws(() => normalizePreviewOrder({ value: 'ASC NULLS LAST' }), PreviewQueryUnsupportedError);
        });
    });

    describe('builds the document field cache as the stored entity does', () => {
        it('keeps numbers and short strings of the listed fields only', () => {
            const document = { credentialSubject: [{ id: 'did:1', area: 10, approved: true, note: 'x'.repeat(100) }] };
            const cache = buildPreviewDocumentCache(document, ['credentialSubject.0.id', 'credentialSubject.0.area', 'credentialSubject.0.approved', 'credentialSubject.0.note']);
            assert.deepEqual(cache, { credentialSubject: [{ id: 'did:1', area: 10 }] });
        });

        it('returns null without a field list, as the entity then stores no document', () => {
            assert.equal(buildPreviewDocumentCache({ a: 1 }, undefined), null);
        });

        it('makes a filter on an uncached field behave as MongoDB sees the stored record', () => {
            const document = { credentialSubject: [{ id: 'did:1', approved: true }] };
            const record = { document: buildPreviewDocumentCache(document, ['credentialSubject.0.id', 'credentialSubject.0.approved']) };
            assert.equal(matchesPreviewFilter(record, normalizePreviewFilter({ 'document.credentialSubject.0.approved': true })), false);
            assert.equal(matchesPreviewFilter(record, normalizePreviewFilter({ 'document.credentialSubject.0.id': 'did:1' })), true);
        });
    });
});
