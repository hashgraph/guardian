import assert from 'node:assert/strict';
import { SchemaImportExportHelper } from '../../dist/helpers/import-helpers/schema/schema-import-helper.js';

describe('SchemaImportExportHelper.getDefs', () => {
    it('is a static function', () => {
        assert.equal(typeof SchemaImportExportHelper.getDefs, 'function');
    });

    it('returns $defs keys from an object document', () => {
        const result = SchemaImportExportHelper.getDefs({ document: { $defs: { '#a': {}, '#b': {} } } });
        assert.deepEqual(result.sort(), ['#a', '#b']);
    });

    it('parses a stringified document', () => {
        const result = SchemaImportExportHelper.getDefs({ document: JSON.stringify({ $defs: { '#x': {} } }) });
        assert.deepEqual(result, ['#x']);
    });

    it('returns empty array when $defs is absent', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefs({ document: { type: 'object' } }), []);
    });

    it('returns empty array when document is empty object', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefs({ document: {} }), []);
    });

    it('returns empty array on invalid JSON string', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefs({ document: 'not-json' }), []);
    });

    it('returns empty array when document is null', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefs({ document: null }), []);
    });

    it('returns empty array when $defs is empty', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefs({ document: { $defs: {} } }), []);
    });
});

describe('SchemaImportExportHelper.getDefDocuments', () => {
    it('is a static function', () => {
        assert.equal(typeof SchemaImportExportHelper.getDefDocuments, 'function');
    });

    it('returns $defs values from an object document', () => {
        const result = SchemaImportExportHelper.getDefDocuments({
            document: { $defs: { '#a': { type: 'object' }, '#b': { type: 'string' } } }
        });
        assert.equal(result.length, 2);
        assert.ok(result.some((d) => d.type === 'object'));
        assert.ok(result.some((d) => d.type === 'string'));
    });

    it('parses a stringified document', () => {
        const result = SchemaImportExportHelper.getDefDocuments({
            document: JSON.stringify({ $defs: { '#x': { type: 'number' } } })
        });
        assert.deepEqual(result, [{ type: 'number' }]);
    });

    it('returns empty array when $defs is absent', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefDocuments({ document: { type: 'object' } }), []);
    });

    it('returns empty array when document is empty object', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefDocuments({ document: {} }), []);
    });

    it('returns empty array when document is null', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefDocuments({ document: null }), []);
    });

    it('returns empty array on invalid JSON string', () => {
        assert.deepEqual(SchemaImportExportHelper.getDefDocuments({ document: 'broken' }), []);
    });
});

describe('SchemaImportExportHelper.validateDefs', () => {
    it('is a static function', () => {
        assert.equal(typeof SchemaImportExportHelper.validateDefs, 'function');
    });

    it('returns null when target already validated', () => {
        const validated = new Map();
        validated.set('iri-1', {});
        assert.equal(SchemaImportExportHelper.validateDefs('iri-1', [], validated), null);
    });

    it('returns "Invalid defs" when target schema is not found', () => {
        assert.equal(SchemaImportExportHelper.validateDefs('missing', [], new Map()), 'Invalid defs');
    });

    it('does not look up schemas already in the validated map', () => {
        const validated = new Map([['x', { iri: 'x' }]]);
        const allSchemas = [];
        assert.equal(SchemaImportExportHelper.validateDefs('x', allSchemas, validated), null);
    });
});
