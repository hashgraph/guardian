import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';
import { Schema } from '../dist/models/schema.js';

const field = (name, over = {}) => ({
    name,
    title: name,
    description: name,
    type: 'string',
    required: false,
    isArray: false,
    isRef: false,
    readOnly: false,
    fields: null,
    conditions: null,
    ...over,
});

const ifEquals = (name, value, thenFields, elseFields = []) => ({
    ifCondition: { field: field(name), fieldValue: value },
    thenFields,
    elseFields,
});

const buildSchema = (fields, conditions) => {
    const schema = new Schema();
    schema.uuid = 'u-1';
    schema.name = 'N';
    schema.description = 'D';
    schema.contextURL = 'ctx:';
    schema.iri = '#N';
    schema.update(fields, conditions);
    return schema;
};

const reload = (document) => new Schema({
    uuid: 'u-1',
    name: 'N',
    description: 'D',
    contextURL: 'ctx:',
    iri: '#N',
    entity: 'NONE',
    status: 'DRAFT',
    document,
});

// if A == 1 then B / if B == 2 then C / if C == 3 then D else E
const chainSchema = () => buildSchema(
    [field('A'), field('B'), field('C'), field('D'), field('E')],
    [
        ifEquals('A', '1', [field('B', { required: true })]),
        ifEquals('B', '2', [field('C', { required: true })]),
        ifEquals('C', '3', [field('D', { required: true })], [field('E', { required: true })]),
    ],
);

describe('SchemaHelper.buildDocument — condition branches are not required by the schema', () => {
    it('emits no required array on either branch', () => {
        const [, , third] = chainSchema().document.allOf;
        assert.equal('required' in third.then, false);
        assert.equal('required' in third.else, false);
    });

    it('emits a plain field container for else, with no nested gate', () => {
        const [, , third] = chainSchema().document.allOf;
        assert.ok(third.else.properties.E);
        assert.equal('if' in third.else, false);
    });

    it('marks a required branch field in $comment instead', () => {
        const [, , third] = chainSchema().document.allOf;
        assert.equal(JSON.parse(third.else.properties.E.$comment).conditionRequired, true);
        assert.equal(JSON.parse(third.then.properties.D.$comment).conditionRequired, true);
    });

    it('leaves an optional branch field unmarked', () => {
        const document = buildSchema(
            [field('A'), field('B')],
            [ifEquals('A', '1', [field('B', { required: false })])],
        ).document;
        assert.equal(JSON.parse(document.allOf[0].then.properties.B.$comment).conditionRequired, undefined);
    });
});

describe('SchemaHelper.validateConditionFields', () => {
    const conditions = () => reload(chainSchema().document).conditions;

    it('accepts the then branch', () => {
        assert.deepEqual(SchemaHelper.validateConditionFields(conditions(), { A: '1', B: '2', C: '3', D: 'x' }), []);
    });

    it('accepts the else branch when the field it reads was answered', () => {
        assert.deepEqual(SchemaHelper.validateConditionFields(conditions(), { A: '1', B: '2', C: '9', E: 'x' }), []);
    });

    // The case JSON Schema cannot express: C is asked but left blank, so it is absent from
    // the document while its condition is still reachable and the else branch is active.
    it('accepts the else branch when the field it reads was asked but left blank', () => {
        // C is optional here: it is asked, the user left it empty, so the else branch of the
        // condition reading it is active. JSON Schema would forbid E, having no way to tell
        // an unanswered field from an unasked one.
        const optionalC = reload(buildSchema(
            [field('A'), field('B'), field('C'), field('D'), field('E')],
            [
                ifEquals('A', '1', [field('B', { required: true })]),
                ifEquals('B', '2', [field('C', { required: false })]),
                ifEquals('C', '3', [field('D', { required: true })], [field('E', { required: true })]),
            ],
        ).document).conditions;
        assert.deepEqual(SchemaHelper.validateConditionFields(optionalC, { A: '1', B: '2', E: 'x' }), []);
    });

    it('demands a required field of the active branch', () => {
        const errors = SchemaHelper.validateConditionFields(conditions(), { A: '1', B: '2', C: '9' });
        assert.equal(errors.length, 1);
        assert.match(errors[0], /"E" is required/);
    });

    it('rejects a field whose condition is unreachable', () => {
        const errors = SchemaHelper.validateConditionFields(conditions(), { A: '9', E: 'x' });
        assert.equal(errors.length, 1);
        assert.match(errors[0], /"E" is not allowed/);
    });

    it('demands nothing once the chain is closed', () => {
        assert.deepEqual(SchemaHelper.validateConditionFields(conditions(), { A: '9' }), []);
    });

    it('returns no errors without conditions or data', () => {
        assert.deepEqual(SchemaHelper.validateConditionFields([], { A: '1' }), []);
        assert.deepEqual(SchemaHelper.validateConditionFields(conditions(), null), []);
    });
});

describe('SchemaHelper.isConditionReachable', () => {
    it('treats a condition on a declared field as reachable', () => {
        const conditions = reload(chainSchema().document).conditions;
        const map = SchemaHelper.buildRevealMap(conditions);
        assert.equal(SchemaHelper.isConditionReachable(conditions[0], map, () => false), true);
    });

    it('follows the revealing branch of the condition above it', () => {
        const conditions = reload(chainSchema().document).conditions;
        const map = SchemaHelper.buildRevealMap(conditions);
        // Every `if` holds: the whole chain is asked.
        assert.equal(SchemaHelper.isConditionReachable(conditions[2], map, () => true), true);
        // No `if` holds: B is never revealed, so the conditions below it are not asked.
        assert.equal(SchemaHelper.isConditionReachable(conditions[2], map, () => false), false);
    });

    it('survives a cycle', () => {
        const a = ifEquals('Y', '1', [field('X')]);
        const b = ifEquals('X', '1', [field('Y')]);
        const map = SchemaHelper.buildRevealMap([a, b]);
        assert.equal(SchemaHelper.isConditionReachable(a, map, () => true), true);
    });

    it('treats a name revealed by two conditions as always asked', () => {
        const a = ifEquals('A', '1', [field('X')]);
        const b = ifEquals('A', '2', [field('X')]);
        const c = ifEquals('X', '1', [field('Z')]);
        const map = SchemaHelper.buildRevealMap([a, b, c]);
        assert.equal(SchemaHelper.isConditionReachable(c, map, () => false), true);
    });
});

describe('SchemaHelper.parseConditions — chained else branch survives a reload', () => {
    it('still reports the else fields after a reload', () => {
        const document = chainSchema().document;
        const conditions = reload(document).conditions;
        assert.deepEqual(conditions[2].thenFields.map((f) => f.name), ['D']);
        assert.deepEqual(conditions[2].elseFields.map((f) => f.name), ['E']);
    });

    it('keeps the required flag of a gated else field', () => {
        const conditions = reload(chainSchema().document).conditions;
        assert.equal(conditions[2].elseFields[0].required, true);
    });

    it('rebuilds the same document it parsed', () => {
        const document = chainSchema().document;
        const again = reload(document);
        again.update(again.fields, again.conditions);
        assert.deepEqual(again.document.allOf, document.allOf);
    });
});

describe('Schema.parseDocument — condition fields shared with the field list', () => {
    it('points the field list and the condition at one object', () => {
        const schema = reload(buildSchema(
            [field('A'), field('B')],
            [ifEquals('A', '1', [field('B', { required: true })])],
        ).document);
        const inCondition = schema.conditions[0].thenFields[0];
        const inFields = schema.fields.find((f) => f.name === 'B');
        assert.equal(inCondition, inFields);
    });

    it('writes an edit of a condition field into properties as well as allOf', () => {
        const schema = reload(buildSchema(
            [field('A'), field('B')],
            [ifEquals('A', '1', [field('B', { required: true })])],
        ).document);
        schema.conditions[0].thenFields[0].description = 'edited';
        schema.update(schema.fields, schema.conditions);
        assert.equal(schema.document.properties.B.description, 'edited');
        assert.equal(schema.document.allOf[0].then.properties.B.description, 'edited');
    });

    it('renames a condition field in properties, leaving nothing behind', () => {
        const schema = reload(buildSchema(
            [field('A'), field('B')],
            [ifEquals('A', '1', [field('B', { required: true })])],
        ).document);
        schema.conditions[0].thenFields[0].name = 'renamed';
        schema.update(schema.fields, schema.conditions);
        assert.ok(schema.document.properties.renamed);
        assert.equal(schema.document.properties.B, undefined);
        assert.ok(schema.document.allOf[0].then.properties.renamed);
    });

    // A branch field renamed while the copies were unshared ends up in `allOf` only: the
    // schema never declares it, and `additionalProperties: false` then rejects it as soon as
    // the branch is filled in. Parsing must adopt it so the next save repairs the document.
    it('adopts a branch field that properties never declared', () => {
        const document = {
            $id: '#N',
            title: 'N',
            description: 'D',
            type: 'object',
            properties: {
                field_1: { title: 'field_1', type: 'string', $comment: '{"term":"field_1"}' },
                field_7: { title: 'field_7', description: 'DDD', type: 'string', $comment: '{"term":"field_7"}' },
            },
            required: [],
            additionalProperties: false,
            allOf: [{
                if: { properties: { field_1: { const: '2' } }, required: ['field_1'] },
                then: { properties: { field_73: false } },
                else: {
                    properties: {
                        field_73: { title: 'field_7', description: 'aElse', type: 'string', $comment: '{"term":"field_73"}' },
                    },
                },
            }],
        };
        const schema = reload(document);
        const adopted = schema.fields.find((f) => f.name === 'field_73');
        assert.ok(adopted, 'field_73 should be adopted into the field list');
        assert.equal(adopted, schema.conditions[0].elseFields[0]);

        schema.update(schema.fields, schema.conditions);
        assert.ok(schema.document.properties.field_73, 'field_73 should be declared after a save');
        assert.equal(schema.document.additionalProperties, false);
        // The pre-existing field of the same title is untouched.
        assert.equal(schema.document.properties.field_7.description, 'DDD');
    });

    it('keeps a condition field out of the top level required list', () => {
        const schema = reload(buildSchema(
            [field('A'), field('B')],
            [ifEquals('A', '1', [field('B')])],
        ).document);
        schema.conditions[0].thenFields[0].required = true;
        schema.update(schema.fields, schema.conditions);
        assert.ok(!schema.document.required.includes('B'));
        assert.equal('required' in schema.document.allOf[0].then, false);
        assert.equal(JSON.parse(schema.document.allOf[0].then.properties.B.$comment).conditionRequired, true);
    });
});
