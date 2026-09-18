import assert from 'node:assert/strict';
import { Schema } from '../dist/models/schema.js';

const baseSchema = () => {
    const s = new Schema({ uuid: 'u', iri: '#x', version: '1.0.0', name: 'S', description: 'd' });
    s.setFields([
        { name: 'a', description: 'A', type: 'string', required: false, isArray: false, isRef: false, readOnly: false, order: 0 },
        { name: 'b', description: 'B', type: 'number', required: false, isArray: true, isRef: false, readOnly: false, order: 1 },
    ], [], true);
    return s;
};

describe('Schema model — updateDocument / round-trip parseDocument', () => {
    it('updateDocument builds a JSON-schema document', () => {
        const s = baseSchema();
        s.updateDocument();
        assert.equal(s.document.title, 'S');
        assert.ok(s.document.properties.a);
        assert.ok(s.document.properties.b);
    });

    it('a schema reconstructed from a document re-parses its fields', () => {
        const s = baseSchema();
        s.updateDocument();
        const s2 = new Schema({ document: s.document, iri: '#x', uuid: 'u', version: '1.0.0' });
        assert.deepEqual(s2.fields.map((f) => f.name), ['a', 'b']);
    });

    it('reconstructed array field keeps isArray', () => {
        const s = baseSchema();
        s.updateDocument();
        const s2 = new Schema({ document: s.document, iri: '#x', uuid: 'u', version: '1.0.0' });
        assert.equal(s2.fields.find((f) => f.name === 'b').isArray, true);
    });

    it('setDocument re-derives name and description from the document', () => {
        const s = baseSchema();
        s.updateDocument();
        const doc = s.document;
        const s2 = new Schema({ uuid: 'u', iri: '#x', version: '1.0.0' });
        s2.setDocument(doc);
        assert.equal(s2.name, 'S');
        assert.equal(s2.description, 'd');
        assert.equal(s2.fields.length, 2);
    });
});

describe('Schema model — getDeepFields', () => {
    it('returns one node per top-level field', () => {
        const s = baseSchema();
        const nodes = s.getDeepFields();
        assert.equal(nodes.length, 2);
        assert.deepEqual(nodes.map((n) => n.path), ['a', 'b']);
    });

    it('computes fullType with array suffix from arrayLvl', () => {
        const s = baseSchema();
        const nodes = s.getDeepFields();
        const b = nodes.find((n) => n.path === 'b');
        assert.equal(b.arrayLvl, 1);
        assert.equal(b.type, 'number[]');
    });

    it('non-array primitive has arrayLvl 0', () => {
        const s = baseSchema();
        const a = s.getDeepFields().find((n) => n.path === 'a');
        assert.equal(a.arrayLvl, 0);
        assert.equal(a.type, 'string');
    });

    it('each node carries a reference to its underlying field', () => {
        const s = baseSchema();
        const nodes = s.getDeepFields();
        assert.equal(nodes[0].field, s.fields[0]);
    });

    it('returns an empty array when there are no fields', () => {
        const s = new Schema({ uuid: 'u', iri: '#x', version: '1.0.0' });
        s.setFields([], [], true);
        assert.deepEqual(s.getDeepFields(), []);
    });
});

describe('Schema model — setExample', () => {
    it('writes examples into matching document properties', () => {
        const s = baseSchema();
        s.updateDocument();
        s.setExample({ a: 'hello' });
        assert.deepEqual(s.document.properties.a.examples, ['hello']);
    });

    it('leaves unrelated properties untouched', () => {
        const s = baseSchema();
        s.updateDocument();
        s.setExample({ a: 'hello' });
        assert.equal(s.document.properties.b.examples, undefined);
    });

    it('is a no-op when given falsy data', () => {
        const s = baseSchema();
        s.updateDocument();
        const before = JSON.stringify(s.document);
        s.setExample(null);
        assert.equal(JSON.stringify(s.document), before);
    });
});

describe('Schema model — update', () => {
    it('update replaces fields and rebuilds the document', () => {
        const s = baseSchema();
        s.update([
            { name: 'z', description: 'Z', type: 'string', required: false, isArray: false, isRef: false, readOnly: false, order: 0 },
        ], []);
        assert.deepEqual(s.fields.map((f) => f.name), ['z']);
        assert.ok(s.document.properties.z);
    });
});
