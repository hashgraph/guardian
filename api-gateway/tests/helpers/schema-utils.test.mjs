import assert from 'node:assert/strict';
import { SchemaUtils } from '../../dist/helpers/schema-utils.js';

describe('SchemaUtils.toOld', () => {
    it('JSON-stringifies document and context fields on a single schema', () => {
        const s = { document: { a: 1 }, context: { b: 2 } };
        const out = SchemaUtils.toOld(s);
        assert.equal(typeof out.document, 'string');
        assert.equal(out.document, '{"a":1}');
        assert.equal(out.context, '{"b":2}');
    });

    it('mutates and returns each schema in an array', () => {
        const arr = [{ document: { x: 1 } }, { context: { y: 2 } }];
        const out = SchemaUtils.toOld(arr);
        assert.equal(out, arr);
        assert.equal(arr[0].document, '{"x":1}');
        assert.equal(arr[1].context, '{"y":2}');
    });

    it('passes null/undefined through unchanged', () => {
        assert.equal(SchemaUtils.toOld(null), null);
        assert.equal(SchemaUtils.toOld(undefined), undefined);
    });
});

describe('SchemaUtils.fromOld', () => {
    it('JSON-parses string document and context back to objects', () => {
        const s = { document: '{"a":1}', context: '{"b":2}' };
        const out = SchemaUtils.fromOld(s);
        assert.deepEqual(out.document, { a: 1 });
        assert.deepEqual(out.context, { b: 2 });
    });

    it('leaves non-string document/context untouched', () => {
        const s = { document: { a: 1 }, context: { b: 2 } };
        const out = SchemaUtils.fromOld(s);
        assert.deepEqual(out.document, { a: 1 });
    });

    it('handles missing schema (passes through)', () => {
        assert.equal(SchemaUtils.fromOld(null), null);
        assert.equal(SchemaUtils.fromOld(undefined), undefined);
    });
});

describe('SchemaUtils.clearIds', () => {
    it('removes version/id/status/topicId/_id fields and returns the same schema reference', () => {
        const s = { version: '1', id: 'i', status: 'PUBLISHED', topicId: '0.0.1', _id: 'm', name: 'keep' };
        const out = SchemaUtils.clearIds(s);
        assert.equal(out, s);
        assert.deepEqual(out, { name: 'keep' });
    });
});
