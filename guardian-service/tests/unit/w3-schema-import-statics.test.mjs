import assert from 'node:assert/strict';
import { SchemaImportExportHelper } from '../../dist/helpers/import-helpers/schema/schema-import-helper.js';

const fakeSchema = (iri, fields = [], document = null) => ({
    iri,
    fields,
    conditions: [],
    document: document || { $id: iri, $defs: {} },
    updateCalls: 0,
    updateRefsCalls: 0,
    update() { this.updateCalls += 1; },
    updateRefs() { this.updateRefsCalls += 1; }
});

describe('SchemaImportExportHelper.getDefs', () => {
    it('returns the keys of $defs for an object document', () => {
        const schema = { document: { $defs: { '#A': {}, '#B': {} } } };
        assert.deepEqual(SchemaImportExportHelper.getDefs(schema), ['#A', '#B']);
    });

    it('parses a JSON string document', () => {
        const schema = { document: JSON.stringify({ $defs: { '#C': {} } }) };
        assert.deepEqual(SchemaImportExportHelper.getDefs(schema), ['#C']);
    });

    it('returns an empty array when $defs is missing', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefs({ document: {} }), []);
    });

    it('returns an empty array for invalid JSON', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefs({ document: '{not json' }), []);
    });

    it('returns an empty array for a null document', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefs({ document: null }), []);
    });
});

describe('SchemaImportExportHelper.getDefDocuments', () => {
    it('returns the values of $defs', () => {
        const defA = { $id: '#A' };
        const schema = { document: { $defs: { '#A': defA } } };
        assert.deepEqual(SchemaImportExportHelper.getDefDocuments(schema), [defA]);
    });

    it('parses a JSON string document', () => {
        const schema = { document: JSON.stringify({ $defs: { '#A': { $id: '#A' } } }) };
        assert.deepEqual(SchemaImportExportHelper.getDefDocuments(schema), [{ $id: '#A' }]);
    });

    it('returns an empty array when $defs is missing', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefDocuments({ document: {} }), []);
    });

    it('returns an empty array for invalid JSON', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefDocuments({ document: 'oops{' }), []);
    });
});

describe('SchemaImportExportHelper.validateDefs', () => {
    it('returns null for an already validated target', () => {
        const validated = new Map([['#A', {}]]);
        assert.equal(SchemaImportExportHelper.validateDefs('#A', [], validated), null);
    });

    it('returns Invalid defs when the target schema is missing', () => {
        assert.equal(SchemaImportExportHelper.validateDefs('#missing', [], new Map()), 'Invalid defs');
    });

    it('reports circular dependencies', () => {
        const schema = fakeSchema('#A', [], { $id: '#A', $defs: { '#A': {} } });
        const error = SchemaImportExportHelper.validateDefs('#A', [schema], new Map());
        assert.equal(error, 'There is circular dependency in schema: #A');
    });

    it('validates a leaf schema and records it', () => {
        const schema = fakeSchema('#A');
        const validated = new Map();
        const error = SchemaImportExportHelper.validateDefs('#A', [schema], validated);
        assert.equal(error, null);
        assert.equal(validated.get('#A'), schema);
        assert.equal(schema.updateCalls, 1);
        assert.equal(schema.updateRefsCalls, 1);
    });

    it('validates nested refs transitively', () => {
        const child = fakeSchema('#B');
        const parent = fakeSchema('#A', [{ isRef: true, type: '#B' }]);
        const validated = new Map();
        const error = SchemaImportExportHelper.validateDefs('#A', [parent, child], validated);
        assert.equal(error, null);
        assert.ok(validated.has('#A'));
        assert.ok(validated.has('#B'));
    });

    it('nulls broken ref types and reports Invalid defs', () => {
        const field = { isRef: true, type: '#missing' };
        const parent = fakeSchema('#A', [field]);
        const validated = new Map();
        const error = SchemaImportExportHelper.validateDefs('#A', [parent], validated);
        assert.equal(error, 'Invalid defs');
        assert.equal(field.type, null);
        assert.ok(validated.has('#A'));
    });

    it('ignores non-ref fields', () => {
        const parent = fakeSchema('#A', [{ isRef: false, type: 'string' }]);
        const error = SchemaImportExportHelper.validateDefs('#A', [parent], new Map());
        assert.equal(error, null);
    });
});
