import assert from 'node:assert/strict';
import { Schema } from '../dist/models/schema.js';
import { SchemaCategory } from '../dist/type/schema-category.type.js';
import { SchemaEntity } from '../dist/type/schema-entity.type.js';
import { SchemaStatus } from '../dist/type/schema-status.type.js';

const minimalDocument = () => ({
    $id: '#Doc&1.0.0',
    title: 'Doc title',
    description: 'Doc description',
    properties: {},
    required: [],
});

describe('Schema constructor source parsing', () => {
    it('parses a JSON-string document', () => {
        const s = new Schema({ document: JSON.stringify(minimalDocument()) });
        assert.equal(typeof s.document, 'object');
        assert.equal(s.document.$id, '#Doc&1.0.0');
        assert.deepEqual(s.fields, []);
        assert.deepEqual(s.conditions, []);
    });

    it('keeps an object document by reference', () => {
        const doc = minimalDocument();
        const s = new Schema({ document: doc });
        assert.equal(s.document, doc);
    });

    it('parses a JSON-string context and keeps an object context', () => {
        const context = { '@context': {} };
        assert.deepEqual(new Schema({ context: JSON.stringify(context) }).context, context);
        assert.equal(new Schema({ context }).context, context);
    });

    it('derives category SYSTEM for system schemas and POLICY otherwise', () => {
        assert.equal(new Schema({ system: true }).category, SchemaCategory.SYSTEM);
        assert.equal(new Schema({}).category, SchemaCategory.POLICY);
        assert.equal(new Schema({ category: SchemaCategory.TOOL }).category, SchemaCategory.TOOL);
    });

    it('reads component from component or __component', () => {
        assert.equal(new Schema({ component: 'a' }).component, 'a');
        assert.equal(new Schema({ __component: 'b' }).component, 'b');
        assert.equal(new Schema({ component: 'a', __component: 'b' }).component, 'a');
    });

    it('defaults entity, status, and document for an empty source', () => {
        const s = new Schema({});
        assert.equal(s.entity, SchemaEntity.NONE);
        assert.equal(s.status, SchemaStatus.DRAFT);
        assert.equal(s.document, null);
        assert.equal(s.context, null);
    });
});

describe('Schema.from', () => {
    it('wraps a response object into a Schema', () => {
        const s = Schema.from({ name: 'n', uuid: '0000', iri: '#n' });
        assert.ok(s instanceof Schema);
        assert.equal(s.name, 'n');
        assert.equal(s.iri, '#n');
    });

    it('returns null when construction fails', () => {
        const original = console.error;
        console.error = () => undefined;
        try {
            assert.equal(Schema.from({ document: '{invalid json' }), null);
        } finally {
            console.error = original;
        }
    });
});

describe('Schema.fromDocument', () => {
    it('builds a schema whose fields come from the document', () => {
        const document = {
            ...minimalDocument(),
            properties: {
                amount: { title: 'Amount', description: 'Amount', type: 'number', readOnly: false },
            },
        };
        const s = Schema.fromDocument(document);
        assert.equal(s.document.$id, '#Doc&1.0.0');
        assert.equal(s.fields.length, 1);
        assert.equal(s.fields[0].name, 'amount');
        assert.equal(s.fields[0].type, 'number');
    });

    it('returns null for an unparsable document', () => {
        const original = console.error;
        console.error = () => undefined;
        try {
            assert.equal(Schema.fromDocument('{nope'), null);
        } finally {
            console.error = original;
        }
    });
});

describe('Schema.fromVc', () => {
    it('returns null when the document has no $defs', () => {
        assert.equal(Schema.fromVc({}), null);
    });

    it('builds a schema from the first nested $defs entry', () => {
        const vc = {
            $defs: {
                '#Nested&1.0.0': {
                    ...minimalDocument(),
                    $id: '#Nested&1.0.0',
                    title: 'Nested',
                },
            },
        };
        const s = Schema.fromVc(vc);
        assert.ok(s instanceof Schema);
        assert.equal(s.document.$id, '#Nested&1.0.0');
        assert.equal(s.document.title, 'Nested');
    });

    it('returns null when $defs is empty', () => {
        assert.equal(Schema.fromVc({ $defs: {} }), null);
    });
});

describe('Schema.updateRefs', () => {
    it('fills document.$defs with referenced sub-schema documents', () => {
        const child = new Schema();
        child.iri = '#Child&1.0.0';
        child.document = { $id: '#Child&1.0.0', properties: {} };
        const parent = new Schema();
        parent.setFields([
            { name: 'c', type: '#Child&1.0.0', isRef: true, fields: [] },
        ], [], true);
        parent.updateDocument();
        parent.updateRefs([child]);
        assert.deepEqual(Object.keys(parent.document.$defs), ['#Child&1.0.0']);
        assert.deepEqual(parent.document.$defs['#Child&1.0.0'], child.document);
    });
});
