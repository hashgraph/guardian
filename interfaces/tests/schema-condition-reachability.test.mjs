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

describe('SchemaHelper.buildDocument — reachability gate on the else branch', () => {
    it('gates the else branch of a condition that reads a revealed field', () => {
        const [, , third] = chainSchema().document.allOf;
        // `else` becomes { if: <C present>, then: <else fields>, else: <forbid> }
        assert.deepEqual(third.else.if, { properties: { C: {} }, required: ['C'] });
        assert.deepEqual(third.else.then.required, ['E']);
    });

    it('does not demand the else fields while the field it reads is absent', () => {
        const [, , third] = chainSchema().document.allOf;
        assert.ok(!Array.isArray(third.else.required));
        assert.deepEqual(third.else.else, { properties: { D: false, E: false } });
    });

    it('leaves a condition on an ordinary field untouched', () => {
        const document = buildSchema(
            [field('A'), field('B'), field('C')],
            [ifEquals('A', '1', [field('B', { required: true })], [field('C', { required: true })])],
        ).document;
        const [only] = document.allOf;
        assert.equal(only.else.if, undefined);
        assert.deepEqual(only.else.required, ['C']);
    });

    it('gates on every revealed field an AND reads', () => {
        const document = buildSchema(
            [field('A'), field('B'), field('C'), field('X'), field('Y')],
            [
                ifEquals('A', '1', [field('B'), field('C')]),
                {
                    ifCondition: {
                        AND: [
                            { field: field('B'), fieldValue: '2' },
                            { field: field('C'), fieldValue: '3' },
                        ],
                    },
                    thenFields: [field('X', { required: true })],
                    elseFields: [field('Y', { required: true })],
                },
            ],
        ).document;
        assert.deepEqual(document.allOf[1].else.if, {
            allOf: [
                { properties: { B: {} }, required: ['B'] },
                { properties: { C: {} }, required: ['C'] },
            ],
        });
    });

    it('leaves an OR alone while one of the fields it reads is ordinary', () => {
        const document = buildSchema(
            [field('A'), field('B'), field('X'), field('Y')],
            [
                ifEquals('A', '1', [field('B')]),
                {
                    ifCondition: {
                        OR: [
                            { field: field('A'), fieldValue: '7' },
                            { field: field('B'), fieldValue: '2' },
                        ],
                    },
                    thenFields: [field('X', { required: true })],
                    elseFields: [field('Y', { required: true })],
                },
            ],
        ).document;
        assert.equal(document.allOf[1].else.if, undefined);
        assert.deepEqual(document.allOf[1].else.required, ['Y']);
    });
});

describe('SchemaHelper.unwrapConditionElse', () => {
    it('returns the else body of a gated branch', () => {
        const body = { properties: { E: { type: 'string' } }, required: ['E'] };
        const gated = { if: { required: ['C'] }, then: body, else: { properties: { E: false } } };
        assert.equal(SchemaHelper.unwrapConditionElse(gated), body);
    });

    it('returns a plain branch unchanged', () => {
        const plain = { properties: { C: { type: 'string' } }, required: ['C'] };
        assert.equal(SchemaHelper.unwrapConditionElse(plain), plain);
    });

    it('passes through nothing', () => {
        assert.equal(SchemaHelper.unwrapConditionElse(undefined), undefined);
        assert.equal(SchemaHelper.unwrapConditionElse(null), null);
    });
});

describe('SchemaHelper.parseConditions — gated else branch', () => {
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

    it('keeps a condition field out of the top level required list', () => {
        const schema = reload(buildSchema(
            [field('A'), field('B')],
            [ifEquals('A', '1', [field('B')])],
        ).document);
        schema.conditions[0].thenFields[0].required = true;
        schema.update(schema.fields, schema.conditions);
        assert.ok(!schema.document.required.includes('B'));
        assert.deepEqual(schema.document.allOf[0].then.required, ['B']);
    });
});
