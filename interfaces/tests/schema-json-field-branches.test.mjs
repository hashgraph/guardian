import assert from 'node:assert/strict';
import { SchemaToJson, JsonToSchema, ErrorContext } from '../dist/helpers/schema-json.js';

const ctx = () => new ErrorContext().setPath(['schema']);

describe('SchemaToJson.fieldToJson — optional outputs', () => {
    const base = { name: 'f', title: 'F', description: 'd', type: 'string' };

    it('emits private only when isPrivate is a boolean', () => {
        assert.equal(SchemaToJson.fieldToJson({ ...base, isPrivate: true }, 0).private, true);
        assert.equal(SchemaToJson.fieldToJson({ ...base, isPrivate: false }, 0).private, false);
        assert.equal('private' in SchemaToJson.fieldToJson(base, 0), false);
    });

    it('emits default when a default value is set', () => {
        assert.equal(SchemaToJson.fieldToJson({ ...base, default: 'dv' }, 0).default, 'dv');
        assert.equal('default' in SchemaToJson.fieldToJson(base, 0), false);
    });

    it('emits suggest when a suggestion is set', () => {
        assert.equal(SchemaToJson.fieldToJson({ ...base, suggest: 'sv' }, 0).suggest, 'sv');
        assert.equal('suggest' in SchemaToJson.fieldToJson(base, 0), false);
    });
});

describe('SchemaToJson.schemaToJson — conditions', () => {
    it('serialises each condition via conditionToJson', () => {
        const fieldA = { name: 'a', title: 'A', description: 'd', type: 'string' };
        const json = SchemaToJson.schemaToJson({
            name: 'S',
            fields: [fieldA],
            conditions: [{ ifCondition: { field: fieldA, fieldValue: 'x' }, thenFields: [], elseFields: [] }],
        });
        assert.equal(json.conditions.length, 1);
        assert.equal(json.conditions[0].if.field, 'a');
        assert.equal(json.conditions[0].if.fieldValue, 'x');
    });
});

describe('SchemaToJson.conditionToJson — single predicates entry', () => {
    it('collapses a one-element predicates list to a plain if', () => {
        const json = SchemaToJson.conditionToJson({
            ifCondition: { predicates: [{ field: { name: 'a' }, fieldValue: 5 }] },
            thenFields: [],
            elseFields: [],
        });
        assert.equal(json.if.field, 'a');
        assert.equal(json.if.fieldValue, 5);
    });
});

describe('JsonToSchema.fromType — literal and system names', () => {
    it("maps the literal 'String' name case-insensitively", () => {
        assert.equal(JsonToSchema.fromType({ type: 'string' }, [], ctx()), 'string');
        assert.equal(JsonToSchema.fromType({ type: 'STRING' }, [], ctx()), 'string');
    });
});

describe('JsonToSchema.fromFormat — custom types', () => {
    it('returns undefined for the hederaAccount custom type', () => {
        assert.equal(JsonToSchema.fromFormat({ type: 'hederaAccount' }, ctx()), undefined);
    });

    it('returns the format for formatted dictionary types', () => {
        assert.equal(JsonToSchema.fromFormat({ type: 'Date' }, ctx()), 'date');
    });
});

describe('JsonToSchema.fromIsRef — literal String', () => {
    it("is false for the literal 'String' regardless of case", () => {
        assert.equal(JsonToSchema.fromIsRef({ type: 'string' }, [], ctx()), false);
    });

    it('is false for the hederaAccount custom type', () => {
        assert.equal(JsonToSchema.fromIsRef({ type: 'hederaAccount' }, [], ctx()), false);
    });
});
