import assert from 'node:assert/strict';
import { DocumentGenerator } from '../dist/helpers/generate-document.js';

const subField = (extra = {}) => ({
    name: 'child',
    type: '#ChildSchema&1.0.0',
    isRef: true,
    fields: [
        { name: 'amount', type: 'number' },
        { name: 'label', type: 'string' },
    ],
    ...extra,
});

describe('DocumentGenerator sub-document generation', () => {
    it('builds a nested document with type and @context', () => {
        const value = DocumentGenerator.generateField(subField(), ['iri'], null, {});
        assert.equal(value.type, 'ChildSchema&1.0.0');
        assert.deepEqual(value['@context'], ['iri']);
        assert.equal(value.amount, 1);
        assert.equal(value.label, 'example');
    });

    it('omits undefined nested values', () => {
        const field = subField({ fields: [{ name: 'note', type: 'null' }] });
        const value = DocumentGenerator.generateField(field, ['iri'], null, {});
        assert.equal('note' in value, false);
    });

    it('applies nested rowPresets keyed by parent then child name', () => {
        const value = DocumentGenerator.generateField(subField(), ['iri'], null, { child: { amount: 42 } });
        assert.equal(value.amount, 42);
        assert.equal(value.label, 'example');
    });

    it('wraps the sub-document in an array for isArray fields', () => {
        const value = DocumentGenerator.generateField(subField({ isArray: true }), ['iri'], null, {});
        assert.equal(Array.isArray(value), true);
        assert.equal(value[0].type, 'ChildSchema&1.0.0');
    });

    it('recurses through multiple levels of refs', () => {
        const field = subField({
            fields: [{
                name: 'inner',
                type: '#Inner&1.0.0',
                isRef: true,
                fields: [{ name: 'deep', type: 'boolean' }],
            }],
        });
        const value = DocumentGenerator.generateField(field, ['iri'], null, {});
        assert.equal(value.inner.type, 'Inner&1.0.0');
        assert.equal(value.inner.deep, true);
    });
});

describe('DocumentGenerator.generateDocument', () => {
    const schema = () => ({
        iri: '#Root&1.0.0',
        type: 'Root',
        fields: [
            { name: 'n', type: 'integer' },
            { name: 'skip', type: 'null' },
            { name: 's', type: 'string', isArray: true },
        ],
    });

    it('uses the schema iri as the @context and the schema type as type', () => {
        const doc = DocumentGenerator.generateDocument(schema(), null, {});
        assert.deepEqual(doc['@context'], ['#Root&1.0.0']);
        assert.equal(doc.type, 'Root');
    });

    it('assigns a uuid-shaped id', () => {
        const doc = DocumentGenerator.generateDocument(schema(), null, {});
        assert.match(doc.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('skips fields whose generated value is undefined', () => {
        const doc = DocumentGenerator.generateDocument(schema(), null, {});
        assert.equal('skip' in doc, false);
        assert.equal(doc.n, 1);
        assert.deepEqual(doc.s, ['example']);
    });

    it('falls back to the default option when option is omitted', () => {
        const doc = DocumentGenerator.generateDocument(schema(), undefined, undefined);
        assert.equal(doc.n, 1);
    });

    it('generates distinct ids per invocation', () => {
        const a = DocumentGenerator.generateDocument(schema(), null, {});
        const b = DocumentGenerator.generateDocument(schema(), null, {});
        assert.notEqual(a.id, b.id);
    });
});
