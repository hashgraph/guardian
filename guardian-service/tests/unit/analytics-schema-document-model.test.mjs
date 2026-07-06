import assert from 'node:assert/strict';
import { SchemaDocumentModel } from '../../dist/analytics/compare/models/schema-document.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

const stringField = (overrides = {}) => ({ type: 'string', title: 'A title', description: 'A desc', ...overrides });

describe('SchemaDocumentModel construction', () => {
    it('returns no fields for an undefined/empty document', () => {
        const m = new SchemaDocumentModel(undefined, {}, new Map());
        assert.deepEqual(m.fields, []);
        assert.deepEqual(m.conditions, []);
    });

    it('parses every property into a FieldModel and skips @context/type', () => {
        const m = SchemaDocumentModel.from({
            properties: {
                '@context': { type: 'string' },
                type: { type: 'string' },
                amount: stringField(),
                owner: stringField(),
            },
        });
        const names = m.fields.map((f) => f.name);
        assert.equal(names.length, 2);
        assert.ok(names.includes('amount'));
        assert.ok(names.includes('owner'));
        assert.ok(!names.includes('@context'));
        assert.ok(!names.includes('type'));
    });

    it('marks "required" fields based on the document.required array', () => {
        const m = SchemaDocumentModel.from({
            properties: { amount: stringField(), owner: stringField() },
            required: ['amount'],
        });
        const amount = m.fields.find((f) => f.name === 'amount');
        const owner = m.fields.find((f) => f.name === 'owner');
        assert.equal(amount.required, true);
        assert.equal(owner.required, false);
    });
});

describe('SchemaDocumentModel.from + sub-schema caching', () => {
    it('inlines a $ref sub-schema and caches it across uses', () => {
        const document = {
            properties: {
                inner: { $ref: '#/$defs/Inner' },
                otherInner: { $ref: '#/$defs/Inner' },
            },
            $defs: {
                '#/$defs/Inner': {
                    properties: { x: stringField() },
                },
            },
        };
        const m = SchemaDocumentModel.from(document);
        const innerField = m.fields.find((f) => f.name === 'inner');
        const otherField = m.fields.find((f) => f.name === 'otherInner');
        assert.ok(innerField.children.length > 0);
        assert.ok(otherField.children.length > 0);
        assert.equal(innerField.children[0].name, 'x');
    });
});

describe('SchemaDocumentModel.parseConditions (via constructor)', () => {
    it('captures a simple "if {field=const}" branch', () => {
        const m = SchemaDocumentModel.from({
            properties: { kind: stringField(), amount: stringField() },
            allOf: [
                {
                    if: { properties: { kind: { const: 'mint' } } },
                    then: { properties: { amount: stringField() }, required: ['amount'] },
                },
            ],
        });
        assert.equal(m.conditions.length, 1);
        assert.equal(m.conditions[0].fieldValue, 'mint');
        assert.equal(m.conditions[0].name, 'kind');
    });

    it('captures an anyOf-based predicate condition', () => {
        const m = SchemaDocumentModel.from({
            properties: { kind: stringField(), tier: stringField(), amount: stringField() },
            allOf: [
                {
                    if: {
                        anyOf: [
                            { properties: { kind: { const: 'A' } } },
                            { properties: { tier: { const: 'gold' } } },
                        ],
                    },
                    then: { properties: { amount: stringField() } },
                },
            ],
        });
        assert.equal(m.conditions.length, 1);
        assert.equal(m.conditions[0].operator, 'OR');
        assert.equal(m.conditions[0].predicates.length, 2);
    });

    it('captures an allOf-based predicate condition', () => {
        const m = SchemaDocumentModel.from({
            properties: { kind: stringField(), tier: stringField(), amount: stringField() },
            allOf: [
                {
                    if: {
                        allOf: [
                            { properties: { kind: { const: 'A' } } },
                            { properties: { tier: { const: 'gold' } } },
                        ],
                    },
                    then: { properties: { amount: stringField() } },
                },
            ],
        });
        assert.equal(m.conditions.length, 1);
        assert.equal(m.conditions[0].operator, 'AND');
    });

    it('skips an allOf entry that has no .if clause', () => {
        const m = SchemaDocumentModel.from({
            properties: { a: stringField() },
            allOf: [{ then: { properties: { b: stringField() } } }],
        });
        assert.equal(m.conditions.length, 0);
    });

    it('skips a condition whose if-field is unknown', () => {
        const m = SchemaDocumentModel.from({
            properties: { a: stringField() },
            allOf: [
                {
                    if: { properties: { unknown: { const: 'X' } } },
                    then: { properties: {} },
                },
            ],
        });
        assert.equal(m.conditions.length, 0);
    });
});

describe('SchemaDocumentModel.update + hash', () => {
    it('hash() is empty before update()', () => {
        const m = SchemaDocumentModel.from({ properties: { a: stringField() } });
        assert.equal(m.hash(opts), '');
    });

    it('update() populates a non-empty hash', () => {
        const m = SchemaDocumentModel.from({ properties: { a: stringField(), b: stringField() } });
        m.update(opts);
        assert.ok(m.hash(opts).length > 0);
    });

    it('two identical documents produce the same hash', () => {
        const json = { properties: { a: stringField(), b: stringField() } };
        const m1 = SchemaDocumentModel.from(json);
        const m2 = SchemaDocumentModel.from(json);
        m1.update(opts); m2.update(opts);
        assert.equal(m1.hash(opts), m2.hash(opts));
    });
});

describe('SchemaDocumentModel.getField', () => {
    it('returns null for an empty path', () => {
        const m = SchemaDocumentModel.from({ properties: { a: stringField() } });
        assert.equal(m.getField(''), null);
    });
});
