import assert from 'node:assert/strict';
import { SchemaToJson } from '../dist/helpers/schema-json.js';

const baseField = (overrides = {}) => ({
    name: 'f',
    type: null,
    format: null,
    pattern: null,
    isRef: false,
    isArray: false,
    isUpdatable: false,
    customType: null,
    unitSystem: null,
    examples: null,
    default: null,
    ...overrides,
});

describe('SchemaToJson.fieldToJson', () => {
    it('serialises a basic Number field with required="None" by default', () => {
        const json = SchemaToJson.fieldToJson(baseField({ type: 'number', name: 'qty', title: 'Qty' }), 0);
        assert.equal(json.key, 'qty');
        assert.equal(json.title, 'Qty');
        assert.equal(json.type, 'Number');
        assert.equal(json.required, 'None');
        assert.equal(json.isArray, false);
    });

    it('marks required="Required" for a required field', () => {
        const json = SchemaToJson.fieldToJson(baseField({ type: 'string', required: true }), 0);
        assert.equal(json.required, 'Required');
    });

    it('marks required="Hidden" when the field is hidden', () => {
        const json = SchemaToJson.fieldToJson(baseField({ type: 'string', hidden: true }), 0);
        assert.equal(json.required, 'Hidden');
    });

    it('marks required="Auto Calculate" when autocalculate=true', () => {
        const json = SchemaToJson.fieldToJson(
            baseField({ type: 'string', autocalculate: true, expression: 'a+b' }),
            0,
        );
        assert.equal(json.required, 'Auto Calculate');
        assert.equal(json.expression, 'a+b');
    });

    it("falls back to type='String' for an unrecognised string field", () => {
        const json = SchemaToJson.fieldToJson(baseField({ type: 'string' }), 0);
        assert.equal(json.type, 'String');
    });

    it("emits type='HederaAccount' when customType is hederaAccount", () => {
        const json = SchemaToJson.fieldToJson(baseField({ type: 'string', customType: 'hederaAccount' }), 0);
        assert.equal(json.type, 'HederaAccount');
    });

    it("emits type='Prefix' / 'Postfix' for unitSystem fields", () => {
        const a = SchemaToJson.fieldToJson(baseField({ type: 'number', unitSystem: 'prefix' }), 0);
        const b = SchemaToJson.fieldToJson(baseField({ type: 'number', unitSystem: 'postfix' }), 0);
        assert.equal(a.type, 'Prefix');
        assert.equal(b.type, 'Postfix');
    });

    it('emits enum array when field.enum is set', () => {
        const json = SchemaToJson.fieldToJson(
            baseField({ type: 'string', enum: ['A', 'B'] }),
            0,
        );
        assert.deepEqual(json.enum, ['A', 'B']);
    });

    it('emits availableOptions when present', () => {
        const json = SchemaToJson.fieldToJson(
            baseField({ type: 'string', availableOptions: ['X', 'Y'] }),
            0,
        );
        assert.deepEqual(json.availableOptions, ['X', 'Y']);
    });

    it('emits font defaults when textColor/textSize/textBold are present', () => {
        const json = SchemaToJson.fieldToJson(
            baseField({ type: 'string', textColor: '#fff' }),
            0,
        );
        // size defaults to '18' when only color set; bold defaults to false.
        assert.equal(json.textColor, '#fff');
        assert.equal(json.textSize, '18');
        assert.equal(json.textBold, false);
    });

    it('emits unit only when unitSystem is set', () => {
        const a = SchemaToJson.fieldToJson(
            baseField({ type: 'number', unitSystem: 'prefix', unit: 'm' }),
            0,
        );
        assert.equal(a.unit, 'm');

        const b = SchemaToJson.fieldToJson(baseField({ type: 'number', unit: 'm' }), 0);
        assert.equal(b.unit, undefined);
    });

    it('includes example only when examples[0] is non-empty', () => {
        const a = SchemaToJson.fieldToJson(baseField({ type: 'string', examples: ['hello'] }), 0);
        assert.equal(a.example, 'hello');

        const b = SchemaToJson.fieldToJson(baseField({ type: 'string', examples: [] }), 0);
        assert.equal(b.example, undefined);
    });
});

describe('SchemaToJson.schemaToJson', () => {
    it('serialises name / description / entity', () => {
        const json = SchemaToJson.schemaToJson({
            name: 'My',
            description: 'desc',
            entity: 'VC',
            fields: [],
            conditions: [],
        });
        assert.equal(json.name, 'My');
        assert.equal(json.description, 'desc');
        assert.equal(json.entity, 'VC');
    });

    it("falls back to entity='NONE' when not supplied", () => {
        const json = SchemaToJson.schemaToJson({
            fields: [], conditions: [],
        });
        assert.equal(json.entity, 'NONE');
    });

    it('skips readOnly fields', () => {
        const json = SchemaToJson.schemaToJson({
            name: 'My', entity: 'NONE',
            fields: [
                baseField({ name: 'a', type: 'string' }),
                baseField({ name: 'b', type: 'string', readOnly: true }),
            ],
            conditions: [],
        });
        assert.equal(json.fields.length, 1);
        assert.equal(json.fields[0].key, 'a');
    });
});
