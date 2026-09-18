import assert from 'node:assert/strict';
import { FormulaData } from '../dist/validators/statistic-validator/formula.js';
import { VariableData } from '../dist/validators/statistic-validator/variables.js';
import { ScoreData } from '../dist/validators/statistic-validator/score.js';

describe('FormulaData', () => {
    const item = { id: 'f1', type: 'string', description: 'desc', formula: 'a+b', rule: { type: 'formula' } };

    it('copies declared fields from the source item', () => {
        const f = new FormulaData(item);
        assert.equal(f.id, 'f1');
        assert.equal(f.type, 'string');
        assert.equal(f.description, 'desc');
        assert.equal(f.formula, 'a+b');
        assert.deepEqual(f.rule, { type: 'formula' });
    });

    it('value is undefined until set', () => {
        const f = new FormulaData(item);
        assert.equal(f.getValue(), undefined);
    });

    it('setValue / getValue round-trip', () => {
        const f = new FormulaData(item);
        f.setValue(123);
        assert.equal(f.getValue(), 123);
    });

    it('validate compares against the stored value', () => {
        const f = new FormulaData(item);
        f.setValue('x');
        assert.equal(f.validate('x'), true);
        assert.equal(f.validate('y'), false);
    });

    it('static from maps an array of items into instances', () => {
        const arr = FormulaData.from([item, { ...item, id: 'f2' }]);
        assert.equal(arr.length, 2);
        assert.ok(arr[0] instanceof FormulaData);
        assert.equal(arr[1].id, 'f2');
    });

    it('static from returns [] for non-array input', () => {
        assert.deepEqual(FormulaData.from(undefined), []);
        assert.deepEqual(FormulaData.from(null), []);
        assert.deepEqual(FormulaData.from({}), []);
    });
});

describe('VariableData', () => {
    const item = {
        id: 'v1', schemaId: 's#1', path: 'a.b', schemaName: 'S', schemaPath: 'sp',
        fieldType: 'number', fieldRef: false, fieldArray: true,
        fieldDescription: 'd', fieldProperty: 'p', fieldPropertyName: 'pn'
    };

    it('copies declared fields from the source item', () => {
        const v = new VariableData(item);
        assert.equal(v.id, 'v1');
        assert.equal(v.schemaId, 's#1');
        assert.equal(v.path, 'a.b');
        assert.equal(v.schemaName, 'S');
        assert.equal(v.fieldType, 'number');
        assert.equal(v.fieldRef, false);
        assert.equal(v.fieldArray, true);
        assert.equal(v.fieldPropertyName, 'pn');
    });

    it('setValue records the value and an isArray flag for scalars', () => {
        const v = new VariableData(item);
        v.setValue(5);
        assert.equal(v.getValue(), 5);
        assert.equal(v.isArray, false);
    });

    it('setValue flags array values as arrays', () => {
        const v = new VariableData(item);
        v.setValue([1, 2]);
        assert.deepEqual(v.getValue(), [1, 2]);
        assert.equal(v.isArray, true);
    });

    it('validate compares against the stored value', () => {
        const v = new VariableData(item);
        v.setValue('hello');
        assert.equal(v.validate('hello'), true);
        assert.equal(v.validate('world'), false);
    });

    it('static from maps arrays and returns [] for non-arrays', () => {
        assert.equal(VariableData.from([item]).length, 1);
        assert.ok(VariableData.from([item])[0] instanceof VariableData);
        assert.deepEqual(VariableData.from(undefined), []);
    });
});

describe('ScoreData', () => {
    const options = [
        { description: 'Low', value: 1 },
        { description: 'High', value: 10 }
    ];

    it('defaults relationships and options to empty arrays when omitted', () => {
        const s = new ScoreData({ id: 's1', type: 't', description: 'd' });
        assert.deepEqual(s.relationships, []);
        assert.deepEqual(s.options, []);
    });

    it('copies provided relationships and options', () => {
        const s = new ScoreData({ id: 's1', type: 't', description: 'd', relationships: ['v1'], options });
        assert.deepEqual(s.relationships, ['v1']);
        assert.deepEqual(s.options, options);
    });

    it('setRelationships resolves relationship ids against the variable list', () => {
        const v1 = new VariableData({ id: 'v1' });
        const v2 = new VariableData({ id: 'v2' });
        const s = new ScoreData({ id: 's1', type: 't', description: 'd', relationships: ['v2'], options: [] });
        s.setRelationships([v1, v2]);
        assert.equal(s._relationships.length, 1);
        assert.equal(s._relationships[0].id, 'v2');
    });

    it('setRelationships drops ids that are not present in the variable list', () => {
        const v1 = new VariableData({ id: 'v1' });
        const s = new ScoreData({ id: 's1', type: 't', description: 'd', relationships: ['nope'], options: [] });
        s.setRelationships([v1]);
        assert.deepEqual(s._relationships, []);
    });

    it('setRelationships builds option copies with generated ids', () => {
        const s = new ScoreData({ id: 's1', type: 't', description: 'd', relationships: [], options });
        s.setRelationships([]);
        assert.equal(s._options.length, 2);
        assert.equal(s._options[0].description, 'Low');
        assert.equal(s._options[0].value, 1);
        assert.ok(typeof s._options[0].id === 'string' && s._options[0].id.length > 0);
        assert.notEqual(s._options[0].id, s._options[1].id);
    });

    it('setRelationships with a non-array yields empty relationships', () => {
        const s = new ScoreData({ id: 's1', type: 't', description: 'd', relationships: [], options });
        s.setRelationships(null);
        assert.deepEqual(s._relationships, []);
    });

    it('setValue maps an option description to its value', () => {
        const s = new ScoreData({ id: 's1', type: 't', description: 'd', relationships: [], options });
        s.setValue('High');
        assert.equal(s.value, 10);
    });

    it('setValue stores the raw value when no option description matches', () => {
        const s = new ScoreData({ id: 's1', type: 't', description: 'd', relationships: [], options });
        s.setValue('Unknown');
        assert.equal(s.value, 'Unknown');
    });

    it('getValue maps a stored value back to its option description', () => {
        const s = new ScoreData({ id: 's1', type: 't', description: 'd', relationships: [], options });
        s.setValue('Low');
        assert.equal(s.getValue(), 'Low');
    });

    it('getValue stringifies the value when no option value matches', () => {
        const s = new ScoreData({ id: 's1', type: 't', description: 'd', relationships: [], options: [] });
        s.setValue(42);
        assert.equal(s.getValue(), '42');
    });
});
