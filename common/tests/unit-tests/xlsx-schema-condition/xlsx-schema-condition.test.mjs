import assert from 'node:assert/strict';
import { XlsxSchemaConditions } from '../../../dist/xlsx/models/schema-condition.js';

const field = (name) => ({ name });

describe('XlsxSchemaConditions — single field/value form', () => {
    it('exposes the canonical SchemaCondition shape', () => {
        const c = new XlsxSchemaConditions(field('amount'), 'X');
        const out = c.toJson();
        assert.equal(out.ifCondition.field.name, 'amount');
        assert.equal(out.ifCondition.fieldValue, 'X');
        assert.deepEqual(out.thenFields, []);
        assert.deepEqual(out.elseFields, []);
    });

    it('addField(field, invert=false) appends to thenFields', () => {
        const c = new XlsxSchemaConditions(field('a'), 'X');
        c.addField({ name: 'b' }, false);
        assert.equal(c.condition.thenFields.length, 1);
        assert.equal(c.condition.elseFields.length, 0);
    });

    it('addField(field, invert=true) appends to elseFields', () => {
        const c = new XlsxSchemaConditions(field('a'), 'X');
        c.addField({ name: 'b' }, true);
        assert.equal(c.condition.elseFields.length, 1);
    });

    it('equal() returns true for the same field-name + value', () => {
        const c = new XlsxSchemaConditions(field('amount'), { x: 1 });
        assert.equal(c.equal(field('amount'), { x: 1 }), true);
    });

    it('equal() returns false when value differs (deep JSON compare)', () => {
        const c = new XlsxSchemaConditions(field('amount'), { x: 1 });
        assert.equal(c.equal(field('amount'), { x: 2 }), false);
    });

    it('equal() returns false when field name differs', () => {
        const c = new XlsxSchemaConditions(field('amount'), 'X');
        assert.equal(c.equal(field('owner'), 'X'), false);
    });

    it('equal() returns false when given a group instead of a field', () => {
        const c = new XlsxSchemaConditions(field('amount'), 'X');
        assert.equal(
            c.equal({ op: 'OR', items: [{ field: field('amount'), value: 'X' }] }),
            false,
        );
    });
});

describe('XlsxSchemaConditions — predicate group (OR / AND)', () => {
    it('captures the group op + items into ifCondition', () => {
        const c = new XlsxSchemaConditions({
            op: 'OR',
            items: [
                { field: field('a'), value: 'X' },
                { field: field('b'), value: 'Y' },
            ],
        });
        const out = c.toJson();
        assert.ok(out.ifCondition.OR);
        assert.equal(out.ifCondition.OR.length, 2);
        assert.equal(out.ifCondition.OR[0].field.name, 'a');
        assert.equal(out.ifCondition.OR[0].fieldValue, 'X');
    });

    it('captures the AND op into ifCondition.AND', () => {
        const c = new XlsxSchemaConditions({
            op: 'AND',
            items: [{ field: field('a'), value: 'X' }],
        });
        assert.ok(c.toJson().ifCondition.AND);
    });

    it('equal() matches groups regardless of input ordering', () => {
        const c = new XlsxSchemaConditions({
            op: 'OR',
            items: [
                { field: field('a'), value: 'X' },
                { field: field('b'), value: 'Y' },
            ],
        });
        const equal = c.equal({
            op: 'OR',
            items: [
                { field: field('b'), value: 'Y' },
                { field: field('a'), value: 'X' },
            ],
        });
        assert.equal(equal, true);
    });

    it('equal() returns false when ops differ', () => {
        const c = new XlsxSchemaConditions({
            op: 'OR',
            items: [{ field: field('a'), value: 'X' }],
        });
        assert.equal(
            c.equal({ op: 'AND', items: [{ field: field('a'), value: 'X' }] }),
            false,
        );
    });

    it('equal() returns false when item counts differ', () => {
        const c = new XlsxSchemaConditions({
            op: 'OR',
            items: [{ field: field('a'), value: 'X' }],
        });
        assert.equal(
            c.equal({
                op: 'OR',
                items: [
                    { field: field('a'), value: 'X' },
                    { field: field('b'), value: 'Y' },
                ],
            }),
            false,
        );
    });

    it('equal() returns false when given a single field/value instead of a group', () => {
        const c = new XlsxSchemaConditions({
            op: 'OR',
            items: [{ field: field('a'), value: 'X' }],
        });
        assert.equal(c.equal(field('a'), 'X'), false);
    });

    it('addField populates thenFields/elseFields on a group as well', () => {
        const c = new XlsxSchemaConditions({
            op: 'OR',
            items: [{ field: field('a'), value: 'X' }],
        });
        c.addField({ name: 'then-1' }, false);
        c.addField({ name: 'else-1' }, true);
        assert.equal(c.toJson().thenFields.length, 1);
        assert.equal(c.toJson().elseFields.length, 1);
    });
});
