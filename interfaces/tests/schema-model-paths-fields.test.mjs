import assert from 'node:assert/strict';
import { Schema } from '../dist/models/schema.js';

const nestedDocument = () => ({
    $id: '#u-1&1.0.0',
    $comment: JSON.stringify({ term: 'u-1&1.0.0', '@id': 'ctx:#u-1&1.0.0' }),
    title: 'Nested',
    description: 'd',
    type: 'object',
    properties: {
        ref1: { $ref: '#sub' },
        list: { type: 'array', items: { type: 'string' } },
    },
    required: [],
    $defs: {
        '#sub': {
            properties: {
                x: { type: 'string' },
                deep: { $ref: '#sub2' },
            },
            required: [],
            $defs: { '#sub2': { properties: { y: { type: 'number' } }, required: [] } },
        },
        '#sub2': { properties: { y: { type: 'number' } }, required: [] },
    },
});

describe('Schema model — nested path and type derivation', () => {
    it('assigns dotted paths to nested fields', () => {
        const s = new Schema({ iri: '#u-1&1.0.0', document: nestedDocument() });
        const ref = s.fields.find((f) => f.name === 'ref1');
        assert.equal(ref.path, 'ref1');
        assert.equal(ref.fields.find((f) => f.name === 'x').path, 'ref1.x');
    });

    it('builds fullPath from the schema iri', () => {
        const s = new Schema({ iri: '#u-1&1.0.0', document: nestedDocument() });
        const ref = s.fields.find((f) => f.name === 'ref1');
        assert.equal(ref.fullPath, '#u-1&1.0.0/ref1');
        assert.equal(ref.fields.find((f) => f.name === 'x').fullPath, '#u-1&1.0.0/ref1.x');
    });

    it('marks ref fields as object and nests their scalar types', () => {
        const s = new Schema({ iri: '#u-1&1.0.0', document: nestedDocument() });
        const ref = s.fields.find((f) => f.name === 'ref1');
        assert.equal(ref.fullType, 'object');
        assert.equal(ref.fields.find((f) => f.name === 'x').fullType, 'string');
    });

    it('appends [] per array level to fullType', () => {
        const s = new Schema({ iri: '#u-1&1.0.0', document: nestedDocument() });
        const list = s.fields.find((f) => f.name === 'list');
        assert.equal(list.isArray, true);
        assert.equal(list.fullType, 'string[]');
    });
});

describe('Schema model — setFields and update', () => {
    it('setFields without force only accepts arrays', () => {
        const s = new Schema();
        s.fields = [{ name: 'keep' }];
        s.conditions = [{ id: 'keep' }];
        s.setFields(undefined, undefined);
        assert.deepEqual(s.fields, [{ name: 'keep' }]);
        assert.deepEqual(s.conditions, [{ id: 'keep' }]);
    });

    it('setFields without force replaces arrays', () => {
        const s = new Schema();
        s.setFields([{ name: 'a' }], [{ id: 'c' }]);
        assert.deepEqual(s.fields, [{ name: 'a' }]);
        assert.deepEqual(s.conditions, [{ id: 'c' }]);
    });

    it('setFields with force coerces missing values to empty arrays', () => {
        const s = new Schema();
        s.fields = [{ name: 'old' }];
        s.setFields(undefined, undefined, true);
        assert.deepEqual(s.fields, []);
        assert.deepEqual(s.conditions, []);
    });

    it('update returns null when no fields are available', () => {
        const s = new Schema();
        s.fields = null;
        assert.equal(s.update(undefined, undefined), null);
    });

    it('update builds a fresh document from the given fields', () => {
        const s = new Schema();
        s.update([{ name: 'a', title: 'A', description: 'A', type: 'string', required: true, isArray: false, isRef: false, readOnly: false }], []);
        assert.ok(s.document.properties.a);
        assert.ok(s.document.required.includes('a'));
    });
});

describe('Schema.fromVc', () => {
    it('returns a Schema built from the first $defs entry', () => {
        const sub = {
            $id: '#s-1&1.0.0',
            $comment: JSON.stringify({ term: 's-1&1.0.0', '@id': 'ctx:#s-1&1.0.0' }),
            title: 'Sub',
            properties: { x: { type: 'string' } },
            required: [],
        };
        const result = Schema.fromVc({ $defs: { '#s-1&1.0.0': sub } });
        assert.ok(result instanceof Schema);
        assert.equal(result.document.$id, '#s-1&1.0.0');
    });

    it('returns null when the document has no $defs', () => {
        assert.equal(Schema.fromVc({}), null);
    });

    it('returns null for an empty $defs object', () => {
        assert.equal(Schema.fromVc({ $defs: {} }), null);
    });

    it('returns null when reading the document throws', () => {
        const original = console.error;
        console.error = () => { };
        try {
            const trap = {};
            Object.defineProperty(trap, '$defs', { get() { throw new Error('boom'); } });
            assert.equal(Schema.fromVc(trap), null);
        } finally {
            console.error = original;
        }
    });
});
