import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const commentJson = (overrides) => JSON.stringify(overrides);

describe('SchemaHelper.parseField (full meta extraction)', () => {
    it('hydrates a non-ref field with unit/customType/font fields from $comment', () => {
        const prop = {
            type: 'number',
            $comment: commentJson({
                unit: 'kg',
                unitSystem: 'metric',
                customType: 'enum',
                textColor: '#fff',
                textSize: 14,
                textBold: true,
                hidden: true,
                expression: 'a+b',
                orderPosition: 3,
                availableOptions: ['A', 'B'],
                isPrivate: true,
                suggest: 'hint',
                autocalculate: true,
                isUpdatable: true,
                property: 'foo.bar',
            }),
        };
        const field = SchemaHelper.parseField('weight', prop, true, 'https://x');
        assert.equal(field.name, 'weight');
        assert.equal(field.required, true);
        assert.equal(field.unit, 'kg');
        assert.equal(field.unitSystem, 'metric');
        assert.equal(field.customType, 'enum');
        assert.equal(field.textColor, '#fff');
        assert.equal(field.textSize, 14);
        assert.equal(field.textBold, true);
        assert.equal(field.hidden, true);
        assert.equal(field.expression, 'a+b');
        assert.equal(field.order, 3);
        assert.deepEqual(field.availableOptions, ['A', 'B']);
        assert.equal(field.isPrivate, true);
        assert.equal(field.suggest, 'hint');
        assert.equal(field.autocalculate, true);
        assert.equal(field.isUpdatable, true);
        assert.equal(field.property, 'foo.bar');
        assert.deepEqual(field.font, { color: '#fff', size: 14, bold: true });
    });

    it('skips font building when no text* attrs are present', () => {
        const prop = { type: 'string', $comment: commentJson({}) };
        const field = SchemaHelper.parseField('name', prop, false, 'https://x');
        assert.equal(field.font, undefined);
    });

    it('records context for ref fields and skips unit/font assignments', () => {
        const prop = { $ref: '#child', $comment: commentJson({}) };
        const field = SchemaHelper.parseField('child', prop, false, 'https://ctx');
        assert.equal(field.isRef, true);
        // parseRef strips the leading '#' off the type segment when reading from a string.
        assert.deepEqual(field.context, { type: 'child', context: ['https://ctx'] });
        // The non-ref branch sets `unit` to null when missing; for ref fields
        // the unit assignment is skipped — but `parseProperty` initialises unit
        // to null, so the residual value is null.
        assert.equal(field.unit, null);
        assert.equal(field.font, undefined);
    });

    it('coerces order to -1 when orderPosition is missing or zero/falsy', () => {
        const prop = { type: 'string', $comment: commentJson({}) };
        const field = SchemaHelper.parseField('a', prop, false, '');
        assert.equal(field.order, -1);

        const prop2 = { type: 'string', $comment: commentJson({ orderPosition: 0 }) };
        const f2 = SchemaHelper.parseField('a', prop2, false, '');
        assert.equal(f2.order, -1);
    });

    it('coerces hidden / autocalculate to boolean using !!', () => {
        const prop = { type: 'string', $comment: commentJson({ hidden: 'truthy', autocalculate: 1 }) };
        const field = SchemaHelper.parseField('a', prop, false, '');
        assert.equal(field.hidden, true);
        assert.equal(field.autocalculate, true);
    });

    it('returns property/customType as null when missing in $comment', () => {
        const prop = { type: 'string', $comment: commentJson({}) };
        const field = SchemaHelper.parseField('a', prop, false, '');
        assert.equal(field.property, null);
        assert.equal(field.customType, null);
    });
});
