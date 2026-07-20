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

describe('SchemaToJson.fieldToJson — type mapping', () => {
    const cases = [
        ['Date', { type: 'string', format: 'date' }],
        ['DateTime', { type: 'string', format: 'date-time' }],
        ['Time', { type: 'string', format: 'time' }],
        ['Email', { type: 'string', format: 'email' }],
        ['URL', { type: 'string', format: 'url' }],
        ['Boolean', { type: 'boolean' }],
        ['Integer', { type: 'integer' }],
        ['Enum', { type: 'string', customType: 'enum' }],
        ['GeoJSON', { type: '#GeoJSON', isRef: true, customType: 'geo' }],
    ];
    for (const [expected, props] of cases) {
        it(`maps ${JSON.stringify(props)} to type=${expected}`, () => {
            assert.equal(SchemaToJson.fieldToJson(baseField(props), 0).type, expected);
        });
    }

    it('propagates isArray, property, pattern and isUpdatable', () => {
        const json = SchemaToJson.fieldToJson(
            baseField({ type: 'string', isArray: true, property: 'p1', pattern: '^z', isUpdatable: true }),
            0,
        );
        assert.equal(json.isArray, true);
        assert.equal(json.property, 'p1');
        assert.equal(json.pattern, '^z');
        assert.equal(json.isUpdatable, true);
    });
});

describe('SchemaToJson.conditionToJson', () => {
    const f = (n) => baseField({ name: n, type: 'string' });

    it('serialises a single field predicate plus then/else fields', () => {
        const json = SchemaToJson.conditionToJson({
            ifCondition: { field: { name: 'sel' }, fieldValue: 'yes' },
            thenFields: [f('a')],
            elseFields: [f('b')],
        });
        assert.equal(json.if.field, 'sel');
        assert.equal(json.if.fieldValue, 'yes');
        assert.deepEqual(json.then.map((x) => x.key), ['a']);
        assert.deepEqual(json.else.map((x) => x.key), ['b']);
    });

    it('serialises a multi-clause AND condition', () => {
        const json = SchemaToJson.conditionToJson({
            ifCondition: { AND: [{ field: { name: 'x' }, fieldValue: 1 }, { field: { name: 'y' }, fieldValue: 2 }] },
            thenFields: [],
            elseFields: [],
        });
        assert.deepEqual(json.if.AND, [{ field: 'x', value: 1 }, { field: 'y', value: 2 }]);
    });

    it('serialises a multi-clause OR condition', () => {
        const json = SchemaToJson.conditionToJson({
            ifCondition: { OR: [{ field: { name: 'x' }, fieldValue: 1 }, { field: { name: 'y' }, fieldValue: 2 }] },
            thenFields: [],
            elseFields: [],
        });
        assert.deepEqual(json.if.OR, [{ field: 'x', fieldValue: 1 }, { field: 'y', fieldValue: 2 }]);
    });

    it('flattens a single-element AND to a plain field predicate', () => {
        const json = SchemaToJson.conditionToJson({
            ifCondition: { AND: [{ field: { name: 'x' }, fieldValue: 1 }] },
            thenFields: [],
            elseFields: [],
        });
        assert.equal(json.if.field, 'x');
        assert.equal(json.if.fieldValue, 1);
        assert.equal(json.if.AND, undefined);
    });

    it('flattens a single-element OR to a plain field predicate', () => {
        const json = SchemaToJson.conditionToJson({
            ifCondition: { OR: [{ field: { name: 'z' }, fieldValue: 9 }] },
            thenFields: [],
            elseFields: [],
        });
        assert.equal(json.if.field, 'z');
        assert.equal(json.if.fieldValue, 9);
    });

    it('serialises a predicates array with ANY_OF as OR', () => {
        const json = SchemaToJson.conditionToJson({
            ifCondition: {
                op: 'ANY_OF',
                predicates: [{ field: { name: 'x' }, fieldValue: 1 }, { field: { name: 'y' }, fieldValue: 2 }],
            },
            thenFields: [],
            elseFields: [],
        });
        assert.deepEqual(json.if.OR, [{ field: 'x', fieldValue: 1 }, { field: 'y', fieldValue: 2 }]);
    });

    it('serialises a predicates array without op as AND', () => {
        const json = SchemaToJson.conditionToJson({
            ifCondition: {
                predicates: [{ field: { name: 'x' }, fieldValue: 1 }, { field: { name: 'y' }, fieldValue: 2 }],
            },
            thenFields: [],
            elseFields: [],
        });
        assert.deepEqual(json.if.AND, [{ field: 'x', fieldValue: 1 }, { field: 'y', fieldValue: 2 }]);
    });

    it('returns an empty if object for an empty condition', () => {
        const json = SchemaToJson.conditionToJson({ ifCondition: {}, thenFields: [], elseFields: [] });
        assert.deepEqual(json.if, {});
        assert.deepEqual(json.then, []);
        assert.deepEqual(json.else, []);
    });

    it('tolerates missing then/else arrays', () => {
        const json = SchemaToJson.conditionToJson({ ifCondition: { field: { name: 'x' }, fieldValue: 1 } });
        assert.deepEqual(json.then, []);
        assert.deepEqual(json.else, []);
    });
});
