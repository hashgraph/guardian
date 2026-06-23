import assert from 'node:assert/strict';
import { SchemaToJson, JsonToSchema, ErrorContext, JsonError, JsonErrorMessage } from '../dist/helpers/schema-json.js';

const field = (o = {}) => ({
    key: 'a',
    title: 't',
    description: '',
    type: 'String',
    required: 'None',
    isArray: false,
    availableOptions: [],
    ...o
});

const schemaJson = (fields, conditions = [], extra = {}) => ({
    name: 'S',
    description: '',
    entity: 'NONE',
    fields,
    conditions,
    ...extra
});

const ctx = () => new ErrorContext().setPath(['schema']);

const fromJson = (json, all = []) => JsonToSchema.fromJson(json, all);

describe('@unit schema-json edge — ErrorContext.setPath boundaries', () => {
    it('produces the literal string "undefined" entity for an empty path array', () => {
        const c = new ErrorContext().setPath([]);
        assert.equal(c.entity, 'undefined');
        assert.equal(c.property, undefined);
    });

    it('composes a self-prefixed property for a single bracketed segment', () => {
        const c = new ErrorContext().setPath(['[0]']);
        assert.equal(c.entity, '[0]');
        assert.equal(c.property, 'undefined[0]');
    });

    it('keeps the prior path when add() extends a multi-segment path', () => {
        const c = new ErrorContext().setPath(['schema', 'fields']).add('x');
        assert.equal(c.entity, 'schema.fields');
        assert.equal(c.property, 'x');
    });

    it('joins three plain segments with dots and keeps the last as property', () => {
        const c = new ErrorContext().setPath(['a', 'b', 'c']);
        assert.equal(c.entity, 'a.b');
        assert.equal(c.property, 'c');
    });

    it('treats a null path argument as a no-op leaving empty strings', () => {
        const c = new ErrorContext().setPath(null);
        assert.equal(c.entity, '');
        assert.equal(c.property, '');
    });

    it('resets entity/property to empty on a second setPath call', () => {
        const c = new ErrorContext().setPath(['a', 'b']);
        c.setPath(['x']);
        assert.equal(c.entity, 'x');
        assert.equal(c.property, 'x');
    });

    it('add() on a fresh context starts from an empty base path', () => {
        const c = new ErrorContext().add('only');
        assert.equal(c.entity, 'only');
        assert.equal(c.property, 'only');
    });

    it('add() does not mutate the source context', () => {
        const a = new ErrorContext().setPath(['root']);
        const b = a.add('child');
        assert.equal(a.property, 'root');
        assert.equal(b.property, 'child');
        assert.notEqual(a, b);
    });
});

describe('@unit schema-json edge — SchemaToJson.fieldToJson type resolution', () => {
    it('maps a bare string field to the literal "String" type name', () => {
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'string' }, 0).type, 'String');
    });

    it('maps number to "Number"', () => {
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'number', isRef: false }, 0).type, 'Number');
    });

    it('maps Prefix unit system to "Prefix" regardless of base type', () => {
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'string', unitSystem: 'prefix' }, 0).type, 'Prefix');
    });

    it('maps Postfix unit system to "Postfix"', () => {
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'number', unitSystem: 'postfix' }, 0).type, 'Postfix');
    });

    it('maps the hederaAccount custom type to "HederaAccount"', () => {
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'string', customType: 'hederaAccount' }, 0).type, 'HederaAccount');
    });

    it('returns an empty type string for an unrecognised field shape', () => {
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'weird' }, 0).type, '');
    });

    it('falls back to a blank key when name is missing', () => {
        assert.equal(SchemaToJson.fieldToJson({ type: 'string' }, 0).key, '');
    });
});

describe('@unit schema-json edge — SchemaToJson.getRequired precedence', () => {
    it('prefers Auto Calculate over hidden and required', () => {
        const f = SchemaToJson.fieldToJson({ name: 'a', type: 'string', autocalculate: true, hidden: true, required: true }, 0);
        assert.equal(f.required, 'Auto Calculate');
    });

    it('prefers Hidden over required', () => {
        const f = SchemaToJson.fieldToJson({ name: 'a', type: 'string', hidden: true, required: true }, 0);
        assert.equal(f.required, 'Hidden');
    });

    it('emits Required when only required is set', () => {
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'string', required: true }, 0).required, 'Required');
    });

    it('emits None when no flag is set', () => {
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'string' }, 0).required, 'None');
    });
});

describe('@unit schema-json edge — SchemaToJson optional outputs', () => {
    it('only emits unit when a unitSystem is present', () => {
        assert.equal('unit' in SchemaToJson.fieldToJson({ name: 'a', type: 'string', unit: 'kg' }, 0), false);
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'string', unitSystem: 'postfix', unit: 'kg' }, 0).unit, 'kg');
    });

    it('extracts the first examples bucket into example', () => {
        const f = SchemaToJson.fieldToJson({ name: 'a', type: 'string', examples: [['x']] }, 0);
        assert.deepEqual(f.example, ['x']);
    });

    it('omits example when examples[0] is falsy', () => {
        assert.equal('example' in SchemaToJson.fieldToJson({ name: 'a', type: 'string', examples: [null] }, 0), false);
    });

    it('emits font triple when only textColor is set, filling defaults', () => {
        const f = SchemaToJson.fieldToJson({ name: 'a', type: 'string', textColor: '#abcdef' }, 0);
        assert.equal(f.textSize, '18');
        assert.equal(f.textColor, '#abcdef');
        assert.equal(f.textBold, false);
    });

    it('prefers enum over remoteLink for the enum output', () => {
        assert.deepEqual(SchemaToJson.fieldToJson({ name: 'a', type: 'string', enum: ['x'], remoteLink: 'http://r' }, 0).enum, ['x']);
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'string', remoteLink: 'http://r' }, 0).enum, 'http://r');
    });

    it('emits expression (possibly empty) only for autocalculate fields', () => {
        assert.equal(SchemaToJson.fieldToJson({ name: 'a', type: 'string', autocalculate: true }, 0).expression, '');
        assert.equal('expression' in SchemaToJson.fieldToJson({ name: 'a', type: 'string', expression: 'x' }, 0), false);
    });
});

describe('@unit schema-json edge — SchemaToJson.schemaToJson', () => {
    it('skips readOnly fields', () => {
        const j = SchemaToJson.schemaToJson({ name: 'S', fields: [{ name: 'a', type: 'string', readOnly: true }, { name: 'b', type: 'string' }], conditions: [] });
        assert.deepEqual(j.fields.map((f) => f.key), ['b']);
    });

    it('defaults name/entity/fields/conditions for an empty schema object', () => {
        const j = SchemaToJson.schemaToJson({});
        assert.equal(j.name, '');
        assert.equal(j.entity, 'NONE');
        assert.deepEqual(j.fields, []);
        assert.deepEqual(j.conditions, []);
    });

    it('serialises conditions through conditionToJson', () => {
        const fa = { name: 'a', title: 'A', description: 'd', type: 'string' };
        const j = SchemaToJson.schemaToJson({ name: 'S', fields: [fa], conditions: [{ ifCondition: { field: fa, fieldValue: 'x' }, thenFields: [], elseFields: [] }] });
        assert.equal(j.conditions[0].if.field, 'a');
        assert.equal(j.conditions[0].if.fieldValue, 'x');
    });
});

describe('@unit schema-json edge — SchemaToJson.conditionToJson branches', () => {
    it('produces OR for an ANY_OF predicate list', () => {
        const j = SchemaToJson.conditionToJson({ ifCondition: { op: 'ANY_OF', predicates: [{ field: { name: 'a' }, fieldValue: 1 }, { field: { name: 'b' }, fieldValue: 2 }] }, thenFields: [], elseFields: [] });
        assert.deepEqual(j.if.OR, [{ field: 'a', fieldValue: 1 }, { field: 'b', fieldValue: 2 }]);
    });

    it('defaults a multi-predicate list to AND', () => {
        const j = SchemaToJson.conditionToJson({ ifCondition: { predicates: [{ field: { name: 'a' }, fieldValue: 1 }, { field: { name: 'b' }, fieldValue: 2 }] }, thenFields: [], elseFields: [] });
        assert.ok(j.if.AND);
        assert.equal(j.if.AND.length, 2);
    });

    it('LATENT: multi-AND entries use key "value" not "fieldValue"', () => {
        const j = SchemaToJson.conditionToJson({ ifCondition: { AND: [{ field: { name: 'a' }, fieldValue: 1 }, { field: { name: 'b' }, fieldValue: 2 }] }, thenFields: [], elseFields: [] });
        assert.deepEqual(j.if.AND, [{ field: 'a', value: 1 }, { field: 'b', value: 2 }]);
    });

    it('multi-OR entries use key "fieldValue"', () => {
        const j = SchemaToJson.conditionToJson({ ifCondition: { OR: [{ field: { name: 'a' }, fieldValue: 1 }, { field: { name: 'b' }, fieldValue: 2 }] }, thenFields: [], elseFields: [] });
        assert.deepEqual(j.if.OR, [{ field: 'a', fieldValue: 1 }, { field: 'b', fieldValue: 2 }]);
    });

    it('collapses a one-element AND to a plain if', () => {
        const j = SchemaToJson.conditionToJson({ ifCondition: { AND: [{ field: { name: 'a' }, fieldValue: 7 }] }, thenFields: [], elseFields: [] });
        assert.equal(j.if.field, 'a');
        assert.equal(j.if.fieldValue, 7);
    });

    it('returns an empty if for an empty ifCondition object', () => {
        const j = SchemaToJson.conditionToJson({ ifCondition: {}, thenFields: [], elseFields: [] });
        assert.deepEqual(j.if, {});
    });

    it('returns an empty if when ifCondition is undefined', () => {
        const j = SchemaToJson.conditionToJson({ thenFields: [], elseFields: [] });
        assert.deepEqual(j.if, {});
    });

    it('serialises thenFields and elseFields', () => {
        const fa = { name: 'a', title: 'A', description: 'd', type: 'string' };
        const j = SchemaToJson.conditionToJson({ ifCondition: { field: fa, fieldValue: 1 }, thenFields: [fa], elseFields: [fa] });
        assert.equal(j.then.length, 1);
        assert.equal(j.else.length, 1);
        assert.equal(j.then[0].key, 'a');
    });

    it('drops AND predicates with an undefined field name', () => {
        const j = SchemaToJson.conditionToJson({ ifCondition: { AND: [{ field: { name: 'a' }, fieldValue: 1 }, { fieldValue: 2 }] }, thenFields: [], elseFields: [] });
        assert.equal(j.if.AND.length, 1);
        assert.equal(j.if.AND[0].field, 'a');
    });
});

describe('@unit schema-json edge — JsonToSchema.fromJson happy paths', () => {
    it('round-trips a minimal NONE schema with one string field', () => {
        const r = fromJson(schemaJson([field({ key: 'a' })]));
        assert.equal(r.name, 'S');
        assert.equal(r.entity, 'NONE');
        assert.equal(r.fields.length, 1);
        assert.equal(r.fields[0].name, 'a');
        assert.equal(r.fields[0].type, 'string');
    });

    it('appends VC default read-only fields after user fields', () => {
        const r = fromJson(schemaJson([field({ key: 'a' })], [], { entity: 'VC' }));
        const names = r.fields.map((f) => f.name);
        assert.ok(names.includes('policyId'));
        assert.ok(names.includes('ref'));
        assert.ok(names.includes('guardianVersion'));
    });

    it('adds no default fields for a NONE schema', () => {
        const r = fromJson(schemaJson([field({ key: 'a' })]));
        assert.equal(r.fields.length, 1);
    });

    it('coerces a string "true" isArray into a boolean', () => {
        const r = fromJson(schemaJson([field({ isArray: 'true' })]));
        assert.equal(r.fields[0].isArray, true);
    });

    it('maps required string "Required" to required=true', () => {
        const r = fromJson(schemaJson([field({ required: 'Required' })]));
        assert.equal(r.fields[0].required, true);
        assert.equal(r.fields[0].hidden, false);
        assert.equal(r.fields[0].autocalculate, false);
    });

    it('maps required string "Hidden" to hidden=true', () => {
        const r = fromJson(schemaJson([field({ required: 'Hidden' })]));
        assert.equal(r.fields[0].hidden, true);
    });

    it('preserves field order via the order property', () => {
        const r = fromJson(schemaJson([field({ key: 'a' }), field({ key: 'b' })]));
        assert.equal(r.fields[0].order, 0);
        assert.equal(r.fields[1].order, 1);
    });
});

describe('@unit schema-json edge — JsonToSchema.fromJson error paths', () => {
    it('LATENT: a field without an availableOptions array crashes fromJson', () => {
        assert.throws(
            () => fromJson(schemaJson([{ key: 'a', title: 't', description: '', type: 'String', required: 'None', isArray: false }])),
            /Cannot read properties of undefined/
        );
    });

    it('rejects a missing field key as a required string', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ key: undefined })])),
            /Invalid format for variable .*"key".* schema\.fields\[0\]/
        );
    });

    it('rejects an empty-string field key', () => {
        assert.throws(() => fromJson(schemaJson([field({ key: '' })])), /"key"/);
    });

    it('rejects duplicate field keys as non-unique', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ key: 'dup' }), field({ key: 'dup' })])),
            /must be unique/
        );
    });

    it('rejects an unknown entity value', () => {
        assert.throws(
            () => fromJson(schemaJson([field()], [], { entity: 'XX' })),
            /Value must be one of \[NONE, VC, EVC\]/
        );
    });

    it('rejects an unknown field type', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ type: 'Nope' })])),
            /Value of a primitive type or a sub-schema reference is required/
        );
    });

    it('rejects an empty schema name', () => {
        assert.throws(() => fromJson(schemaJson([field()], [], { name: '' })), /"name"/);
    });

    it('rejects a non-string description', () => {
        assert.throws(() => fromJson(schemaJson([field()], [], { description: 123 })), /"description"/);
    });

    it('rejects a non-string field title', () => {
        assert.throws(() => fromJson(schemaJson([field({ title: 123 })])), /"title": 123/);
    });

    it('rejects a non-array fields value', () => {
        assert.throws(
            () => fromJson({ name: 'S', description: '', entity: 'NONE', fields: 'x', conditions: [] }),
            /"fields": "x".*Value of type array is required/
        );
    });

    it('rejects a non-array conditions value', () => {
        assert.throws(
            () => fromJson(schemaJson([field()], 'x')),
            /"conditions": "x".*Value of type array is required/
        );
    });

    it('rejects a non-boolean isArray value', () => {
        assert.throws(() => fromJson(schemaJson([field({ isArray: 'maybe' })])), /boolean is required/);
    });

    it('truncates long offending values in the error message', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ type: 'ThisIsAVeryLongInvalidTypeNameThatExceeds' })])),
            /"type": "ThisIsAVeryLongInva\.\.\./
        );
    });
});

describe('@unit schema-json edge — privacy / EVC handling', () => {
    it('rejects a private flag on a non-EVC schema', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ private: true })])),
            /Invalid property type for variable "private"/
        );
    });

    it('accepts a private flag on an EVC schema', () => {
        const r = fromJson(schemaJson([field({ private: true })], [], { entity: 'EVC' }));
        assert.equal(r.fields[0].isPrivate, true);
    });

    it('coerces private "false" string on an EVC schema', () => {
        const r = fromJson(schemaJson([field({ private: 'false' })], [], { entity: 'EVC' }));
        assert.equal(r.fields[0].isPrivate, false);
    });

    it('rejects a non-boolean private value on an EVC schema', () => {
        assert.throws(() => fromJson(schemaJson([field({ private: 'maybe' })], [], { entity: 'EVC' })), /boolean is required/);
    });
});

describe('@unit schema-json edge — font (Help Text) handling', () => {
    it('fills font defaults for a Help Text field with no overrides', () => {
        const r = fromJson(schemaJson([field({ type: 'Help Text' })]));
        assert.equal(r.fields[0].textSize, '18');
        assert.equal(r.fields[0].textColor, '#000000');
        assert.equal(r.fields[0].textBold, false);
        assert.equal(r.fields[0].type, 'null');
    });

    it('parses a px-suffixed text size for a Help Text field', () => {
        const r = fromJson(schemaJson([field({ type: 'Help Text', textSize: '24px' })]));
        assert.equal(r.fields[0].textSize, '24');
    });

    it('rejects an out-of-range Help Text size', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ type: 'Help Text', textSize: '999' })])),
            /between 0 and 70/
        );
    });

    it('rejects an invalid Help Text colour', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ type: 'Help Text', textColor: 'red' })])),
            /Rgb color definition in format #xxxxxx/
        );
    });

    it('accepts a 3-digit hex colour for Help Text', () => {
        const r = fromJson(schemaJson([field({ type: 'Help Text', textColor: '#abc' })]));
        assert.equal(r.fields[0].textColor, '#abc');
    });

    it('rejects textSize on a non-Help-Text field', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ textSize: '20' })])),
            /Invalid property type for variable "textSize"/
        );
    });

    it('rejects textColor on a non-Help-Text field', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ textColor: '#abcdef' })])),
            /Invalid property type for variable "textColor"/
        );
    });
});

describe('@unit schema-json edge — enum / expression / examples', () => {
    it('parses an enum array for an Enum-typed field', () => {
        const r = fromJson(schemaJson([field({ type: 'Enum', enum: ['x', 'y'] })]));
        assert.deepEqual(r.fields[0].enum, ['x', 'y']);
        assert.equal(r.fields[0].remoteLink, undefined);
    });

    it('treats a string enum as a remote link', () => {
        const r = fromJson(schemaJson([field({ type: 'Enum', enum: 'http://list' })]));
        assert.equal(r.fields[0].enum, undefined);
        assert.equal(r.fields[0].remoteLink, 'http://list');
    });

    it('rejects an enum on a non-Enum field type', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ enum: ['x'] })])),
            /Invalid property type for variable "enum"/
        );
    });

    it('rejects a non-string enum array entry', () => {
        assert.throws(() => fromJson(schemaJson([field({ type: 'Enum', enum: [1] })])), /string is required/);
    });

    it('requires an expression for an Auto Calculate field', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ required: 'Auto Calculate' })])),
            /"expression".*string is required/
        );
    });

    it('keeps the expression for an Auto Calculate field', () => {
        const r = fromJson(schemaJson([field({ required: 'Auto Calculate', expression: '1+1' })]));
        assert.equal(r.fields[0].expression, '1+1');
        assert.equal(r.fields[0].autocalculate, true);
    });

    it('rejects an expression on a non-autocalculate field', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ expression: '1+1' })])),
            /Invalid property type for variable "expression"/
        );
    });

    it('rejects a non-array example on an isArray field', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ isArray: true, example: 'notarr' })])),
            /Value of type array is required/
        );
    });

    it('rejects an array example on a non-array field with the NOT_ARRAY message', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ isArray: false, example: [1] })])),
            /Value of type non-array is required/
        );
    });

    it('rejects an object example on a non-array field with the NOT_OBJECT message', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ isArray: false, example: { a: 1 } })])),
            /Value of type non-object is required/
        );
    });

    it('accepts a scalar example on a non-array field', () => {
        const r = fromJson(schemaJson([field({ isArray: false, example: 'v' })]));
        assert.deepEqual(r.fields[0].examples, ['v']);
    });
});

describe('@unit schema-json edge — sub-schema reference resolution', () => {
    const sub = { iri: '#SubA', fields: [{ name: 'x', type: 'string' }] };

    it('resolves a sub-schema iri as the field type', () => {
        assert.equal(JsonToSchema.fromType({ type: '#SubA' }, [sub], ctx()), '#SubA');
    });

    it('marks a sub-schema iri field as a reference', () => {
        assert.equal(JsonToSchema.fromIsRef({ type: '#SubA' }, [sub], ctx()), true);
    });

    it('deep-copies sub-schema fields into the resolved field', () => {
        const r = fromJson(schemaJson([field({ key: 'a', type: '#SubA' })]), [sub]);
        assert.deepEqual(r.fields[0].fields.map((f) => f.name), ['x']);
        assert.equal(r.fields[0].isRef, true);
        assert.equal(r.fields[0].type, '#SubA');
    });

    it('does not share the sub-schema field array (copy, not alias)', () => {
        const r = fromJson(schemaJson([field({ key: 'a', type: '#SubA' })]), [sub]);
        assert.notEqual(r.fields[0].fields, sub.fields);
    });

    it('rejects a sub-schema iri that is absent from the all[] list', () => {
        assert.throws(() => fromJson(schemaJson([field({ key: 'a', type: '#Missing' })]), [sub]), /sub-schema reference/);
    });
});

describe('@unit schema-json edge — static type helpers', () => {
    it('matches type names case-insensitively in fromType', () => {
        assert.equal(JsonToSchema.fromType({ type: 'string' }, [], ctx()), 'string');
        assert.equal(JsonToSchema.fromType({ type: 'STRING' }, [], ctx()), 'string');
        assert.equal(JsonToSchema.fromType({ type: 'number' }, [], ctx()), 'number');
    });

    it('LATENT: fromIsRef returns false for GeoJSON (FieldTypes wins over SystemFieldTypes)', () => {
        assert.equal(JsonToSchema.fromIsRef({ type: 'GeoJSON' }, [], ctx()), false);
    });

    it('fromFormat returns the format for a Date field and undefined for plain types', () => {
        assert.equal(JsonToSchema.fromFormat({ type: 'Date' }, ctx()), 'date');
        assert.equal(JsonToSchema.fromFormat({ type: 'String' }, ctx()), undefined);
    });

    it('fromFormat returns undefined for the hederaAccount custom type', () => {
        assert.equal(JsonToSchema.fromFormat({ type: 'hederaAccount' }, ctx()), undefined);
    });
});

describe('@unit schema-json edge — conditions', () => {
    it('resolves a plain if condition against an existing field', () => {
        const r = fromJson(schemaJson([field({ key: 'a' })], [{ if: { field: 'a', fieldValue: 'x' }, then: [field({ key: 'b' })], else: [] }]));
        assert.equal(r.conditions.length, 1);
        assert.equal(r.conditions[0].ifCondition.field.name, 'a');
        assert.deepEqual(r.conditions[0].thenFields.map((f) => f.name), ['b']);
    });

    it('rejects an if reference to a missing field', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ key: 'a' })], [{ if: { field: 'zzz', fieldValue: 'x' }, then: [field({ key: 'b' })], else: [] }])),
            /Value must be a reference to an existing field/
        );
    });

    it('rejects a condition with empty then and else branches', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ key: 'a' })], [{ if: { field: 'a', fieldValue: 'x' }, then: [], else: [] }])),
            /Empty "then" or "else" branches/
        );
    });

    it('rejects an empty AND array in a condition if', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ key: 'a' })], [{ if: { AND: [] }, then: [field({ key: 'b' })], else: [] }])),
            /Value of type array is required/
        );
    });

    it('rejects an empty OR array in a condition if', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ key: 'a' })], [{ if: { OR: [] }, then: [field({ key: 'b' })], else: [] }])),
            /Value of type array is required/
        );
    });

    it('rejects a non-array then branch', () => {
        assert.throws(
            () => fromJson(schemaJson([field({ key: 'a' })], [{ if: { field: 'a' }, then: 'nope', else: [] }])),
            /"then": "nope".*Value of type array is required/
        );
    });

    it('resolves a multi-predicate AND condition into AND entries', () => {
        const r = fromJson(schemaJson([field({ key: 'a' }), field({ key: 'b' })], [{ if: { AND: [{ field: 'a', fieldValue: 1 }, { field: 'b', fieldValue: 2 }] }, then: [field({ key: 'c' })], else: [] }]));
        assert.deepEqual(r.conditions[0].ifCondition.AND.map((p) => p.field.name), ['a', 'b']);
    });

    it('resolves a multi-predicate OR condition into OR entries', () => {
        const r = fromJson(schemaJson([field({ key: 'a' }), field({ key: 'b' })], [{ if: { OR: [{ field: 'a', fieldValue: 1 }, { field: 'b', fieldValue: 2 }] }, then: [field({ key: 'c' })], else: [] }]));
        assert.deepEqual(r.conditions[0].ifCondition.OR.map((p) => p.field.name), ['a', 'b']);
    });

    it('collapses a single-element AND condition to a plain field if', () => {
        const r = fromJson(schemaJson([field({ key: 'a' })], [{ if: { AND: [{ field: 'a', fieldValue: 9 }] }, then: [field({ key: 'b' })], else: [] }]));
        assert.equal(r.conditions[0].ifCondition.field.name, 'a');
        assert.equal(r.conditions[0].ifCondition.fieldValue, 9);
    });

    it('uses a fresh uniqueness set per condition so branch keys can reuse top-level names', () => {
        const r = fromJson(schemaJson([field({ key: 'a' })], [{ if: { field: 'a' }, then: [field({ key: 'a' })], else: [] }]));
        assert.equal(r.conditions[0].thenFields[0].name, 'a');
    });
});

describe('@unit schema-json edge — enums and messages', () => {
    it('exposes documented JsonError templates', () => {
        assert.match(JsonError.INVALID_FORMAT, /\$\{prop\}/);
        assert.match(JsonError.UNIQUE, /must be unique/);
        assert.match(JsonError.THEN_ELSE, /then.*else/);
    });

    it('exposes documented JsonErrorMessage strings', () => {
        assert.equal(JsonErrorMessage.STRING, 'Value of type string is required.');
        assert.equal(JsonErrorMessage.ARRAY, 'Value of type array is required.');
        assert.match(JsonErrorMessage.REQUIRED_ENTITY, /NONE, VC, EVC/);
    });
});
