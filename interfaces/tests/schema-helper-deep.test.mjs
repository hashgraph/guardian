import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.cloneFields', () => {
    it('returns a new array of shallow-cloned field objects', () => {
        const fields = [{ name: 'a', type: 'string' }, { name: 'b', type: 'number' }];
        const clone = SchemaHelper.cloneFields(fields);
        assert.notEqual(clone, fields);
        assert.notEqual(clone[0], fields[0]);
        assert.deepEqual(clone, fields);
    });
    it('recursively clones nested fields', () => {
        const fields = [{ name: 'parent', fields: [{ name: 'child', fields: [{ name: 'grandchild' }] }] }];
        const clone = SchemaHelper.cloneFields(fields);
        assert.notEqual(clone[0].fields, fields[0].fields);
        assert.notEqual(clone[0].fields[0].fields, fields[0].fields[0].fields);
        assert.deepEqual(clone, fields);
    });
    it('does not mutate the source when the clone is edited', () => {
        const fields = [{ name: 'x', fields: [{ name: 'y' }] }];
        const clone = SchemaHelper.cloneFields(fields);
        clone[0].name = 'changed';
        clone[0].fields[0].name = 'changed-child';
        assert.equal(fields[0].name, 'x');
        assert.equal(fields[0].fields[0].name, 'y');
    });
    it('handles an empty array', () => {
        assert.deepEqual(SchemaHelper.cloneFields([]), []);
    });
    it('leaves non-array fields property untouched', () => {
        const fields = [{ name: 'a', fields: undefined }];
        const clone = SchemaHelper.cloneFields(fields);
        assert.equal(clone[0].fields, undefined);
    });
});

describe('SchemaHelper.uniqueRefs', () => {
    it('copies schemas and strips $defs', () => {
        const map = { '#A': { title: 'A', $defs: { '#B': { title: 'B' } } } };
        const result = SchemaHelper.uniqueRefs(map, {});
        assert.equal(result['#A'].title, 'A');
        assert.equal(result['#A'].$defs, undefined);
    });
    it('flattens nested $defs into the result map', () => {
        const map = { '#A': { title: 'A', $defs: { '#B': { title: 'B' } } } };
        const result = SchemaHelper.uniqueRefs(map, {});
        assert.equal(result['#B'].title, 'B');
        assert.equal(result['#B'].$defs, undefined);
    });
    it('does not overwrite an already present iri', () => {
        const existing = { '#A': { title: 'existing' } };
        const map = { '#A': { title: 'new' } };
        const result = SchemaHelper.uniqueRefs(map, existing);
        assert.equal(result['#A'].title, 'existing');
    });
    it('returns the passed-in accumulator object', () => {
        const acc = {};
        const result = SchemaHelper.uniqueRefs({}, acc);
        assert.equal(result, acc);
    });
    it('recurses through multiple levels of $defs', () => {
        const map = {
            '#A': { title: 'A', $defs: { '#B': { title: 'B', $defs: { '#C': { title: 'C' } } } } },
        };
        const result = SchemaHelper.uniqueRefs(map, {});
        assert.equal(result['#C'].title, 'C');
    });
});

describe('SchemaHelper.findRefs', () => {
    it('returns refs only for fields that reference known schemas', () => {
        const target = {
            fields: [
                { isRef: true, type: '#Known' },
                { isRef: false, type: '#Ignored' },
                { isRef: true, type: '#Missing' },
            ],
        };
        const schemas = [{ iri: '#Known', document: { title: 'Known' } }];
        const refs = SchemaHelper.findRefs(target, schemas);
        assert.equal(refs['#Known'].title, 'Known');
        assert.equal(refs['#Ignored'], undefined);
        assert.equal(refs['#Missing'], undefined);
    });
    it('resolves the built-in GeoJSON ref', () => {
        const target = { fields: [{ isRef: true, type: '#GeoJSON' }] };
        const refs = SchemaHelper.findRefs(target, []);
        assert.ok(refs['#GeoJSON']);
    });
    it('resolves the built-in SentinelHUB ref', () => {
        const target = { fields: [{ isRef: true, type: '#SentinelHUB' }] };
        const refs = SchemaHelper.findRefs(target, []);
        assert.ok(refs['#SentinelHUB']);
    });
    it('returns an empty map when no fields are refs', () => {
        const target = { fields: [{ isRef: false, type: 'string' }] };
        assert.deepEqual(SchemaHelper.findRefs(target, []), {});
    });
});

describe('SchemaHelper.getFieldsFromObject', () => {
    it('builds properties and collects required field names', () => {
        const required = [];
        const properties = {};
        const fields = [
            { name: 'a', type: 'string', required: true, title: 'A', description: 'A' },
            { name: 'b', type: 'string', required: false, title: 'B', description: 'B' },
        ];
        SchemaHelper.getFieldsFromObject(fields, required, properties, 'ctx');
        assert.ok(properties.a);
        assert.ok(properties.b);
        assert.deepEqual(required, ['a']);
    });
    it('throws when a field name contains whitespace', () => {
        assert.throws(
            () => SchemaHelper.getFieldsFromObject(
                [{ name: 'bad name', type: 'string', required: false }], [], {}, 'ctx'),
            /must not contain spaces/,
        );
    });
    it('skips a field whose name already exists in properties', () => {
        const properties = { dup: { existing: true } };
        const required = [];
        SchemaHelper.getFieldsFromObject(
            [{ name: 'dup', type: 'string', required: true }], required, properties, 'ctx');
        assert.equal(properties.dup.existing, true);
        assert.deepEqual(required, []);
    });
    it('does not add optional fields to the required list', () => {
        const required = [];
        SchemaHelper.getFieldsFromObject(
            [{ name: 'opt', type: 'string', required: false }], required, {}, 'ctx');
        assert.deepEqual(required, []);
    });
});
