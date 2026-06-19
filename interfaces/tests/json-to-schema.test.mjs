import assert from 'node:assert/strict';
import { JsonToSchema } from '../dist/helpers/schema-json.js';

describe('JsonToSchema.fromJson — happy path', () => {
    it('builds a schema with name/description/entity from JSON', () => {
        const json = {
            name: 'Hello',
            description: 'desc',
            entity: 'NONE',
            fields: [],
            conditions: [],
        };
        const result = JsonToSchema.fromJson(json, []);
        assert.equal(result.name, 'Hello');
        assert.equal(result.description, 'desc');
        assert.equal(result.entity, 'NONE');
    });

    it('parses a single String field', () => {
        const json = {
            name: 'S',
            entity: 'NONE',
            fields: [
                { key: 'note', title: 'Note', description: 'A note', required: 'None', type: 'String', availableOptions: [] },
            ],
            conditions: [],
        };
        const result = JsonToSchema.fromJson(json, []);
        assert.equal(result.fields.length, 1);
        const field = result.fields[0];
        assert.equal(field.name, 'note');
        assert.equal(field.type, 'string');
        assert.equal(field.required, false);
        assert.equal(field.hidden, false);
    });

    it('parses required="Required" as required=true', () => {
        const json = {
            name: 'S',
            entity: 'NONE',
            fields: [{ key: 'x', required: 'Required', type: 'String', availableOptions: [] }],
            conditions: [],
        };
        const result = JsonToSchema.fromJson(json, []);
        assert.equal(result.fields[0].required, true);
        assert.equal(result.fields[0].hidden, false);
        assert.equal(result.fields[0].autocalculate, false);
    });

    it('parses required="Hidden" as hidden=true', () => {
        const json = {
            name: 'S',
            entity: 'NONE',
            fields: [{ key: 'x', required: 'Hidden', type: 'String', availableOptions: [] }],
            conditions: [],
        };
        assert.equal(JsonToSchema.fromJson(json, []).fields[0].hidden, true);
    });

    it('parses required="Auto Calculate" as autocalculate=true with expression', () => {
        const json = {
            name: 'S',
            entity: 'NONE',
            fields: [
                { key: 'x', required: 'Auto Calculate', type: 'String', expression: 'a+b', availableOptions: [] },
            ],
            conditions: [],
        };
        const result = JsonToSchema.fromJson(json, []);
        assert.equal(result.fields[0].autocalculate, true);
        assert.equal(result.fields[0].expression, 'a+b');
    });

    it('parses Number / Integer / Boolean primitives', () => {
        const json = {
            name: 'S',
            entity: 'NONE',
            fields: [
                { key: 'a', type: 'Number', availableOptions: [] },
                { key: 'b', type: 'Integer', availableOptions: [] },
                { key: 'c', type: 'Boolean', availableOptions: [] },
            ],
            conditions: [],
        };
        const result = JsonToSchema.fromJson(json, []);
        const types = result.fields.map((f) => f.type);
        assert.deepEqual(types, ['number', 'integer', 'boolean']);
    });

    it("emits VC's default fields when entity=VC", () => {
        const json = { name: 'S', entity: 'VC', fields: [], conditions: [] };
        const result = JsonToSchema.fromJson(json, []);
        const names = result.fields.map((f) => f.name);
        assert.ok(names.includes('policyId'));
        assert.ok(names.includes('ref'));
        assert.ok(names.includes('guardianVersion'));
    });

    it('omits default fields for entity=NONE', () => {
        const json = { name: 'S', entity: 'NONE', fields: [], conditions: [] };
        const result = JsonToSchema.fromJson(json, []);
        assert.equal(result.fields.length, 0);
    });
});

describe('JsonToSchema.fromJson — error paths', () => {
    it('throws when name is missing', () => {
        assert.throws(
            () => JsonToSchema.fromJson({ entity: 'NONE', fields: [], conditions: [] }, []),
            /Invalid format/,
        );
    });

    it('throws when fields is not an array', () => {
        assert.throws(
            () => JsonToSchema.fromJson({ name: 'S', entity: 'NONE', fields: 'oops', conditions: [] }, []),
            /Invalid format/,
        );
    });

    it('throws on unknown entity value', () => {
        assert.throws(
            () => JsonToSchema.fromJson({ name: 'S', entity: 'MAYBE', fields: [], conditions: [] }, []),
            /Invalid format/,
        );
    });

    it('throws on unknown field type', () => {
        const json = {
            name: 'S',
            entity: 'NONE',
            fields: [{ key: 'x', type: 'NotAType' }],
            conditions: [],
        };
        assert.throws(() => JsonToSchema.fromJson(json, []), /Invalid format/);
    });

    it('throws when private flag is supplied for non-EVC entities', () => {
        const json = {
            name: 'S',
            entity: 'NONE',
            fields: [{ key: 'x', type: 'String', private: true }],
            conditions: [],
        };
        assert.throws(() => JsonToSchema.fromJson(json, []), /property type/);
    });
});
