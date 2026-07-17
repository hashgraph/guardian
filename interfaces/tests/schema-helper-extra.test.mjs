import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.buildField — scalars', () => {
    it('uses title/description and emits a $comment', () => {
        const r = SchemaHelper.buildField(
            { title: 'T', description: 'D', type: 'string', isArray: false, isRef: false },
            'x', 'ctx', 0,
        );
        assert.equal(r.title, 'T');
        assert.equal(r.description, 'D');
        assert.equal(r.type, 'string');
        assert.equal(r.readOnly, false);
        assert.ok(r.$comment.includes('"term":"x"'));
    });

    it('falls back to the field name for title/description', () => {
        const r = SchemaHelper.buildField({ type: 'string', isArray: false, isRef: false }, 'fallback', 'ctx');
        assert.equal(r.title, 'fallback');
        assert.equal(r.description, 'fallback');
    });

    it('marks readOnly fields', () => {
        const r = SchemaHelper.buildField({ type: 'string', isArray: false, isRef: false, readOnly: true }, 'x', 'ctx');
        assert.equal(r.readOnly, true);
    });

    it('passes through examples and default', () => {
        const r = SchemaHelper.buildField(
            { type: 'string', isArray: false, isRef: false, examples: ['e1'], default: 'dd' },
            'x', 'ctx',
        );
        assert.deepEqual(r.examples, ['e1']);
        assert.equal(r.default, 'dd');
    });

    it('emits enum / format / pattern when present', () => {
        const r = SchemaHelper.buildField(
            { type: 'string', isArray: false, isRef: false, enum: ['a', 'b'], format: 'email', pattern: '^x' },
            'x', 'ctx',
        );
        assert.deepEqual(r.enum, ['a', 'b']);
        assert.equal(r.format, 'email');
        assert.equal(r.pattern, '^x');
    });

    it('orderPosition is recorded in the comment', () => {
        const r = SchemaHelper.buildField({ type: 'string', isArray: false, isRef: false }, 'x', 'ctx', 7);
        assert.ok(r.$comment.includes('"orderPosition":7'));
    });
});

describe('SchemaHelper.buildField — arrays', () => {
    it('wraps scalar in items for array fields', () => {
        const r = SchemaHelper.buildField(
            { type: 'string', isArray: true, isRef: false, enum: ['a'] }, 'y', 'ctx',
        );
        assert.equal(r.type, 'array');
        assert.equal(r.items.type, 'string');
        assert.deepEqual(r.items.enum, ['a']);
        assert.equal(r.items.format, undefined);
    });
});

describe('SchemaHelper.buildField — references', () => {
    it('emits $ref at the property level for non-array refs', () => {
        const r = SchemaHelper.buildField({ type: '#Foo', isArray: false, isRef: true }, 'z', 'ctx');
        assert.equal(r.$ref, '#Foo');
        assert.equal(r.type, undefined);
    });

    it('emits $ref inside items for array refs', () => {
        const r = SchemaHelper.buildField({ type: '#Foo', isArray: true, isRef: true }, 'z', 'ctx');
        assert.equal(r.type, 'array');
        assert.equal(r.items.$ref, '#Foo');
    });

    it('remoteLink becomes $ref for non-ref fields', () => {
        const r = SchemaHelper.buildField(
            { type: 'string', isArray: false, isRef: false, remoteLink: '#remote' }, 'z', 'ctx',
        );
        assert.equal(r.$ref, '#remote');
        assert.equal(r.type, 'string');
    });
});

describe('SchemaHelper.parseConditions', () => {
    const fields = () => [{ name: 'sel', type: 'string' }, { name: 'extra', type: 'string' }];
    const doc = () => ({
        allOf: [{
            if: { properties: { sel: { const: 'yes' } } },
            then: { properties: { extra: { type: 'string', $comment: JSON.stringify({ term: 'extra', '@id': 'ctx' }) } } },
            else: { properties: {} },
        }],
    });

    it('returns [] for a null document', () => {
        assert.deepEqual(SchemaHelper.parseConditions(null, 'ctx', [], new Map()), []);
    });

    it('returns [] when there is no allOf/anyOf', () => {
        assert.deepEqual(SchemaHelper.parseConditions({ properties: {} }, 'ctx', [], new Map()), []);
    });

    it('parses a single-property if into an ifCondition predicate', () => {
        const r = SchemaHelper.parseConditions(doc(), 'ctx', fields(), new Map());
        assert.equal(r.length, 1);
        assert.equal(r[0].ifCondition.field.name, 'sel');
        assert.equal(r[0].ifCondition.fieldValue, 'yes');
    });

    it('collects the then-branch fields', () => {
        const r = SchemaHelper.parseConditions(doc(), 'ctx', fields(), new Map());
        assert.deepEqual(r[0].thenFields.map((f) => f.name), ['extra']);
    });

    it('skips nodes without an if clause', () => {
        const d = { allOf: [{ then: { properties: {} } }] };
        assert.deepEqual(SchemaHelper.parseConditions(d, 'ctx', fields(), new Map()), []);
    });

    it('reads conditions from anyOf as well as allOf', () => {
        const d = {
            anyOf: [{
                if: { properties: { sel: { const: 'maybe' } } },
                then: { properties: {} },
                else: { properties: {} },
            }],
        };
        const r = SchemaHelper.parseConditions(d, 'ctx', fields(), new Map());
        assert.equal(r.length, 1);
        assert.equal(r[0].ifCondition.fieldValue, 'maybe');
    });
});
