import assert from 'node:assert/strict';
import { SchemaDocumentModel } from '../../dist/analytics/compare/models/schema-document.model.js';

const opts = (overrides = {}) => ({ propLvl: 'All', keyLvl: 'Default', idLvl: 'All', ...overrides });

const doc = (props, extra = {}) => ({
    properties: props,
    ...extra,
});

describe('SchemaDocumentModel.from', () => {
    it('builds a model from a document with $defs', () => {
        const m = SchemaDocumentModel.from(doc({ a: { type: 'string' } }));
        assert.ok(m instanceof SchemaDocumentModel);
        assert.equal(m.fields.length, 1);
    });

    it('tolerates a falsy document', () => {
        const m = SchemaDocumentModel.from(undefined);
        assert.deepEqual(m.fields, []);
    });
});

describe('SchemaDocumentModel.getField', () => {
    it('returns null for empty path', () => {
        const m = SchemaDocumentModel.from(doc({ a: { type: 'string' } }));
        assert.equal(m.getField(''), null);
    });

    it('finds a top-level field by name', () => {
        const m = SchemaDocumentModel.from(doc({ amount: { type: 'number' } }));
        const f = m.getField('amount');
        assert.ok(f);
        assert.equal(f.name, 'amount');
    });

    it('returns null for an unknown field', () => {
        const m = SchemaDocumentModel.from(doc({ amount: { type: 'number' } }));
        assert.equal(m.getField('nope'), null);
    });

    it('descends into ref sub-schema via dotted path', () => {
        const document = doc(
            { sub: { $ref: '#child' } },
            { $defs: { '#child': { properties: { leaf: { type: 'string' } } } } }
        );
        const m = SchemaDocumentModel.from(document);
        const f = m.getField('sub.leaf');
        assert.ok(f);
        assert.equal(f.name, 'leaf');
    });
});

describe('SchemaDocumentModel field ordering', () => {
    it('sorts fields by order ascending after update', () => {
        const document = doc({
            a: { type: 'string', $comment: JSON.stringify({ orderPosition: 2 }) },
            b: { type: 'string', $comment: JSON.stringify({ orderPosition: 1 }) },
        });
        const m = SchemaDocumentModel.from(document);
        const names = m.fields.map((f) => f.name);
        assert.deepEqual(names, ['b', 'a']);
    });
});

describe('SchemaDocumentModel.update / hash', () => {
    it('hash empty before update', () => {
        const m = SchemaDocumentModel.from(doc({ a: { type: 'string' } }));
        assert.equal(m.hash(opts()), '');
    });

    it('update produces a non-empty hash', () => {
        const m = SchemaDocumentModel.from(doc({ a: { type: 'string' } }));
        m.update(opts());
        assert.ok(m.hash(opts()).length > 0);
    });

    it('documents with different fields hash differently', () => {
        const a = SchemaDocumentModel.from(doc({ x: { type: 'string', title: 'X' } }));
        const b = SchemaDocumentModel.from(doc({ y: { type: 'number', title: 'Y' } }));
        a.update(opts());
        b.update(opts());
        assert.notEqual(a.hash(opts()), b.hash(opts()));
    });

    it('empty document hashes to empty string after update (no fields)', () => {
        const m = SchemaDocumentModel.from(doc({}));
        m.update(opts());
        assert.equal(typeof m.hash(opts()), 'string');
    });
});

describe('SchemaDocumentModel.compare early returns', () => {
    it('returns 0 when comparing against falsy', () => {
        const m = SchemaDocumentModel.from(doc({ a: { type: 'string' } }));
        assert.equal(m.compare(null), 0);
    });

    it('returns 0 when this model has no fields', () => {
        const empty = SchemaDocumentModel.from(doc({}));
        const other = SchemaDocumentModel.from(doc({ a: { type: 'string' } }));
        assert.equal(empty.compare(other), 0);
    });
});

describe('SchemaDocumentModel condition parsing branches', () => {
    it('captures an if {field const} -> then branch', () => {
        const document = doc(
            { kind: { type: 'string' }, extra: { type: 'string' } },
            {
                allOf: [{
                    if: { properties: { kind: { const: 'A' } } },
                    then: { properties: { extra: { type: 'string' } } },
                }],
            }
        );
        const m = SchemaDocumentModel.from(document);
        assert.equal(m.conditions.length, 1);
    });

    it('skips an allOf entry without an if clause', () => {
        const document = doc(
            { kind: { type: 'string' } },
            { allOf: [{ then: { properties: {} } }] }
        );
        const m = SchemaDocumentModel.from(document);
        assert.equal(m.conditions.length, 0);
    });

    it('skips a condition referencing an unknown if-field', () => {
        const document = doc(
            { kind: { type: 'string' } },
            { allOf: [{ if: { properties: { unknown: { const: 1 } } }, then: { properties: {} } }] }
        );
        const m = SchemaDocumentModel.from(document);
        assert.equal(m.conditions.length, 0);
    });

    it('builds an OR condition from anyOf predicates', () => {
        const document = doc(
            { a: { type: 'string' }, b: { type: 'string' } },
            {
                allOf: [{
                    if: { anyOf: [{ properties: { a: { const: '1' } } }, { properties: { b: { const: '2' } } }] },
                    then: { properties: {} },
                }],
            }
        );
        const m = SchemaDocumentModel.from(document);
        assert.equal(m.conditions.length, 1);
        assert.equal(m.conditions[0].operator, 'OR');
    });

    it('builds an AND condition from allOf predicates', () => {
        const document = doc(
            { a: { type: 'string' }, b: { type: 'string' } },
            {
                allOf: [{
                    if: { allOf: [{ properties: { a: { const: '1' } } }, { properties: { b: { const: '2' } } }] },
                    then: { properties: {} },
                }],
            }
        );
        const m = SchemaDocumentModel.from(document);
        assert.equal(m.conditions.length, 1);
        assert.equal(m.conditions[0].operator, 'AND');
    });
});
