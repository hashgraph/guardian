import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.parseProperty — oneOf', () => {
    it('reads type information from the first oneOf entry', () => {
        const field = SchemaHelper.parseProperty('f', { oneOf: [{ type: 'string' }] });
        assert.equal(field.type, 'string');
        assert.equal(field.isArray, false);
    });

    it('keeps the outer title and description over the oneOf entry', () => {
        const field = SchemaHelper.parseProperty('f', { title: 'Outer', oneOf: [{ type: 'string', title: 'Inner' }] });
        assert.equal(field.title, 'Outer');
    });

    it('falls back to the oneOf entry title when the outer one is missing', () => {
        const field = SchemaHelper.parseProperty('f', { oneOf: [{ type: 'string', title: 'Inner' }] });
        assert.equal(field.title, 'Inner');
    });
});

describe('SchemaHelper.parseField — font fragments', () => {
    const prop = (comment) => ({ title: 'T', type: 'string', $comment: JSON.stringify(comment) });

    it('builds font from textSize alone', () => {
        const field = SchemaHelper.parseField('f', prop({ term: 'f', textSize: '14px' }), false, 'url');
        assert.deepEqual(field.font, { size: '14px' });
    });

    it('builds font from textBold alone', () => {
        const field = SchemaHelper.parseField('f', prop({ term: 'f', textBold: true }), false, 'url');
        assert.deepEqual(field.font, { bold: true });
    });

    it('builds font from textColor alone', () => {
        const field = SchemaHelper.parseField('f', prop({ term: 'f', textColor: '#fff' }), false, 'url');
        assert.deepEqual(field.font, { color: '#fff' });
    });

    it('merges all three font fragments', () => {
        const field = SchemaHelper.parseField('f', prop({ term: 'f', textColor: '#fff', textSize: '14px', textBold: true }), false, 'url');
        assert.deepEqual(field.font, { color: '#fff', size: '14px', bold: true });
    });
});

describe('SchemaHelper.buildFieldComment — optional keys', () => {
    const base = { isRef: false };

    it('serialises property, customType and availableOptions when present', () => {
        const json = JSON.parse(SchemaHelper.buildFieldComment({ ...base, property: 'p', customType: 'ct', availableOptions: ['a'] }, 'f', 'url'));
        assert.equal(json.property, 'p');
        assert.equal(json.customType, 'ct');
        assert.deepEqual(json.availableOptions, ['a']);
    });

    it('serialises text styling keys when present', () => {
        const json = JSON.parse(SchemaHelper.buildFieldComment({ ...base, textColor: '#fff', textSize: '12px', textBold: true }, 'f', 'url'));
        assert.equal(json.textColor, '#fff');
        assert.equal(json.textSize, '12px');
        assert.equal(json.textBold, true);
    });

    it('serialises suggest and autocalculate when present', () => {
        const json = JSON.parse(SchemaHelper.buildFieldComment({ ...base, suggest: 'sg', autocalculate: true, expression: 'a+b' }, 'f', 'url'));
        assert.equal(json.suggest, 'sg');
        assert.equal(json.autocalculate, true);
        assert.equal(json.expression, 'a+b');
    });

    it('records orderPosition only for non-negative integers', () => {
        const withOrder = JSON.parse(SchemaHelper.buildFieldComment(base, 'f', 'url', 2));
        const withoutOrder = JSON.parse(SchemaHelper.buildFieldComment(base, 'f', 'url', -1));
        assert.equal(withOrder.orderPosition, 2);
        assert.equal('orderPosition' in withoutOrder, false);
    });

    it('omits all optional keys for a bare field', () => {
        const json = JSON.parse(SchemaHelper.buildFieldComment(base, 'f', 'url'));
        assert.deepEqual(Object.keys(json), ['term', '@id']);
    });
});

describe('SchemaHelper.updateVersion — string document', () => {
    it('parses a stringified document before re-versioning', () => {
        const comment = JSON.stringify({ term: 'u&1.0.0', '@id': 'ctx:#u&1.0.0', previousVersion: '1.0.0' });
        const data = {
            document: JSON.stringify({ $id: '#u&1.0.0', $comment: comment }),
            uuid: 'u',
            contextURL: 'ctx:',
        };
        const result = SchemaHelper.updateVersion(data, '2.0.0');
        assert.equal(result.version, '2.0.0');
        assert.equal(typeof result.document, 'object');
        assert.equal(result.document.$id, '#u&2.0.0');
    });
});

describe('SchemaHelper.getContext — error path', () => {
    it('returns null when the item cannot be read', () => {
        assert.equal(SchemaHelper.getContext(null), null);
    });
});

describe('SchemaHelper.updateObjectContext', () => {
    const schema = () => ({
        type: 'Main',
        contextURL: 'ctx:',
        fields: [
            { name: 'sub', isRef: true, context: { type: 'Sub', context: ['ctx:'] }, fields: [] },
            { name: 'geo', isRef: true, context: { type: 'GeoJSON', context: ['geo-ctx'] }, fields: [] },
            { name: 'obj', isRef: false },
        ],
    });

    it('stamps the root type and context', () => {
        const json = SchemaHelper.updateObjectContext(schema(), { sub: null, plain: 1 });
        assert.equal(json.type, 'Main');
        assert.deepEqual(json['@context'], ['ctx:']);
    });

    it('rewrites ref sub-objects with their schema type and context', () => {
        const json = SchemaHelper.updateObjectContext(schema(), { sub: { type: 'Old', '@context': 'old' } });
        assert.equal(json.sub.type, 'Sub');
        assert.deepEqual(json.sub['@context'], ['ctx:']);
    });

    it('keeps the geometry type for GeoJSON refs and only replaces the context', () => {
        const json = SchemaHelper.updateObjectContext(schema(), { geo: { type: 'Point', '@context': 'x' } });
        assert.equal(json.geo.type, 'Point');
        assert.deepEqual(json.geo['@context'], ['geo-ctx']);
    });

    it('strips type and context from plain nested objects', () => {
        const json = SchemaHelper.updateObjectContext(schema(), { obj: { type: 'T', '@context': 'y', keep: 1 } });
        assert.equal('type' in json.obj, false);
        assert.equal('@context' in json.obj, false);
        assert.equal(json.obj.keep, 1);
    });

    it('rewrites each element of an array-valued ref field', () => {
        const json = SchemaHelper.updateObjectContext(schema(), { sub: [{ a: 1 }, { a: 2 }] });
        assert.equal(json.sub[0].type, 'Sub');
        assert.equal(json.sub[1].type, 'Sub');
    });

    it('leaves primitive values untouched', () => {
        const json = SchemaHelper.updateObjectContext(schema(), { sub: 'just-a-string', plain: 5 });
        assert.equal(json.sub, 'just-a-string');
        assert.equal(json.plain, 5);
    });
});

describe('SchemaHelper.checkErrors', () => {
    it('wraps schema-level errors with a schema target', () => {
        const errors = SchemaHelper.checkErrors({ errors: [{ code: 'E1' }] });
        assert.deepEqual(errors, [{ target: { type: 'schema' }, code: 'E1' }]);
    });

    it('wraps field errors with the field name', () => {
        const errors = SchemaHelper.checkErrors({ fields: [{ name: 'a', errors: [{ code: 'E2' }] }] });
        assert.deepEqual(errors[0].target, { type: 'field', field: 'a' });
    });

    it('normalises a single-field ifCondition to mode IF', () => {
        const errors = SchemaHelper.checkErrors({
            conditions: [{ errors: [{ code: 'E3' }], ifCondition: { field: { name: 'a' }, fieldValue: 1 } }],
        });
        assert.equal(errors[0].target.mode, 'IF');
        assert.equal(errors[0].target.field, 'a');
        assert.equal(errors[0].target.fieldValue, 1);
        assert.equal(errors[0].target.index, 0);
    });

    it('normalises AND conditions with predicates', () => {
        const errors = SchemaHelper.checkErrors({
            conditions: [{
                errors: [{ code: 'E4' }],
                ifCondition: { AND: [{ field: { name: 'a' }, fieldValue: 1 }, { field: { name: 'b' }, fieldValue: 2 }] },
            }],
        });
        assert.equal(errors[0].target.mode, 'AND');
        assert.deepEqual(errors[0].target.predicates, [
            { field: 'a', fieldValue: 1 },
            { field: 'b', fieldValue: 2 },
        ]);
    });

    it('normalises OR conditions and filters nameless predicates', () => {
        const errors = SchemaHelper.checkErrors({
            conditions: [{
                errors: [{ code: 'E5' }],
                ifCondition: { OR: [{ field: { name: 'a' }, fieldValue: 1 }, { field: {}, fieldValue: 2 }] },
            }],
        });
        assert.equal(errors[0].target.mode, 'OR');
        assert.deepEqual(errors[0].target.predicates, [{ field: 'a', fieldValue: 1 }]);
    });

    it('maps a predicates list with op ANY_OF to OR', () => {
        const errors = SchemaHelper.checkErrors({
            conditions: [{
                errors: [{ code: 'E6' }],
                ifCondition: { op: 'ANY_OF', predicates: [{ field: { name: 'a' }, value: 1 }, { field: { name: 'b' }, value: 2 }] },
            }],
        });
        assert.equal(errors[0].target.mode, 'OR');
        assert.deepEqual(errors[0].target.predicates, [{ field: 'a', value: 1 }, { field: 'b', value: 2 }]);
    });

    it('maps a predicates list without op to AND', () => {
        const errors = SchemaHelper.checkErrors({
            conditions: [{
                errors: [{ code: 'E7' }],
                ifCondition: { predicates: [{ field: { name: 'a' }, value: 1 }, { field: { name: 'b' }, value: 2 }] },
            }],
        });
        assert.equal(errors[0].target.mode, 'AND');
    });

    it('collapses a single-entry predicates list to mode IF', () => {
        const errors = SchemaHelper.checkErrors({
            conditions: [{
                errors: [{ code: 'E8' }],
                ifCondition: { predicates: [{ field: { name: 'a' }, value: 9 }] },
            }],
        });
        assert.equal(errors[0].target.mode, 'IF');
        assert.equal(errors[0].target.field, 'a');
        assert.equal(errors[0].target.fieldValue, 9);
    });

    it('falls back to mode IF with raw fields for an unrecognised ifCondition', () => {
        const errors = SchemaHelper.checkErrors({
            conditions: [{ errors: [{ code: 'E9' }], ifCondition: {} }],
        });
        assert.equal(errors[0].target.mode, 'IF');
        assert.equal(errors[0].target.field, undefined);
    });

    it('returns [] when nothing carries errors', () => {
        assert.deepEqual(SchemaHelper.checkErrors({ fields: [{ name: 'a' }], conditions: [{}] }), []);
    });
});
