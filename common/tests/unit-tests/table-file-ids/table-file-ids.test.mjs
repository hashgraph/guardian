import assert from 'node:assert/strict';
import { ObjectId } from '@mikro-orm/mongodb';
import { extractTableFileIds } from '../../../dist/helpers/table-file-ids.js';

const oid = () => new ObjectId().toHexString();

describe('extractTableFileIds', () => {
    it('returns [] for null/undefined/primitive roots', () => {
        assert.deepEqual(extractTableFileIds(null), []);
        assert.deepEqual(extractTableFileIds(undefined), []);
        assert.deepEqual(extractTableFileIds(42), []);
        assert.deepEqual(extractTableFileIds('plain string'), []);
    });

    it('finds a fileId on a top-level table node', () => {
        const id = oid();
        const out = extractTableFileIds({ type: 'table', fileId: id });
        assert.equal(out.length, 1);
        assert.equal(out[0].toHexString(), id);
    });

    it('matches "type" case-insensitively', () => {
        const id = oid();
        const out = extractTableFileIds({ type: 'TABLE', fileId: id });
        assert.equal(out[0].toHexString(), id);
    });

    it('ignores nodes whose type is not table', () => {
        assert.deepEqual(
            extractTableFileIds({ type: 'image', fileId: oid() }),
            []
        );
    });

    it('ignores table nodes without a usable fileId', () => {
        assert.deepEqual(extractTableFileIds({ type: 'table' }), []);
        assert.deepEqual(extractTableFileIds({ type: 'table', fileId: '' }), []);
        assert.deepEqual(extractTableFileIds({ type: 'table', fileId: '   ' }), []);
        assert.deepEqual(extractTableFileIds({ type: 'table', fileId: 123 }), []);
    });

    it('descends into arrays', () => {
        const id = oid();
        const out = extractTableFileIds([
            { type: 'group' },
            { type: 'table', fileId: id },
        ]);
        assert.equal(out.length, 1);
        assert.equal(out[0].toHexString(), id);
    });

    it('descends into nested object children', () => {
        const id = oid();
        const out = extractTableFileIds({
            outer: { inner: { type: 'table', fileId: id } },
        });
        assert.equal(out.length, 1);
        assert.equal(out[0].toHexString(), id);
    });

    it('parses JSON strings encountered during traversal', () => {
        const id = oid();
        const json = JSON.stringify({ type: 'table', fileId: id });
        const out = extractTableFileIds({ payload: json });
        assert.equal(out.length, 1);
        assert.equal(out[0].toHexString(), id);
    });

    it('silently skips invalid JSON strings', () => {
        assert.deepEqual(extractTableFileIds({ payload: '{not json' }), []);
    });

    it('deduplicates ids across the document', () => {
        const id = oid();
        const out = extractTableFileIds([
            { type: 'table', fileId: id },
            { type: 'table', fileId: ` ${id} ` },
            { nested: { type: 'table', fileId: id } },
        ]);
        assert.equal(out.length, 1);
        assert.equal(out[0].toHexString(), id);
    });

    it('returns multiple distinct ids', () => {
        const a = oid();
        const b = oid();
        const out = extractTableFileIds([
            { type: 'table', fileId: a },
            { type: 'table', fileId: b },
        ]);
        const hex = out.map((o) => o.toHexString()).sort();
        assert.deepEqual(hex, [a, b].sort());
    });

    it('returns ObjectId instances, not strings', () => {
        const id = oid();
        const [first] = extractTableFileIds({ type: 'table', fileId: id });
        assert.ok(first instanceof ObjectId);
    });
});
