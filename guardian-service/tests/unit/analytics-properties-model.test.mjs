import assert from 'node:assert/strict';
import { PropertiesModel } from '../../dist/analytics/compare/models/properties.model.js';
import { VariableModel } from '../../dist/analytics/compare/models/variable.model.js';

const opts = (overrides = {}) => ({
    propLvl: 'All',
    keyLvl: 'Default',
    idLvl: 'All',
    ...overrides,
});

describe('PropertiesModel.createPropList', () => {
    it('returns [] for an empty object', () => {
        const list = PropertiesModel.createPropList({});
        assert.deepEqual(list, []);
    });

    it('emits AnyPropertyModel for scalar leaves', () => {
        const list = PropertiesModel.createPropList({ a: 'x', b: 1, c: true });
        assert.equal(list.length, 3);
        assert.equal(list[0].type, 'property');
        assert.equal(list[0].path, 'a');
        assert.equal(list[0].value, 'x');
        assert.equal(list[1].value, 1);
        assert.equal(list[2].value, true);
    });

    it('emits ArrayPropertyModel + recursively expands array elements', () => {
        const list = PropertiesModel.createPropList({ list: [10, 20] });
        const arrayProp = list.find((p) => p.path === 'list');
        assert.equal(arrayProp.type, 'array');
        assert.equal(arrayProp.value, 2); // length
        const elements = list.filter((p) => p.path.startsWith('list.'));
        assert.equal(elements.length, 2);
        assert.equal(elements[0].value, 10);
        assert.equal(elements[1].value, 20);
    });

    it('emits ObjectPropertyModel + recurses into object children', () => {
        const list = PropertiesModel.createPropList({ obj: { a: 1, b: 2 } });
        const objProp = list.find((p) => p.path === 'obj');
        assert.equal(objProp.type, 'object');
        assert.equal(objProp.value, true); // truthy = has keys
        const a = list.find((p) => p.path === 'obj.a');
        const b = list.find((p) => p.path === 'obj.b');
        assert.equal(a.value, 1);
        assert.equal(b.value, 2);
    });

    it('classifies any name matching /[Ss]chema/ as a SchemaPropertyModel', () => {
        const list = PropertiesModel.createPropList({ inputSchema: 'iri-1' });
        assert.equal(list[0].type, 'schema');
    });

    it('classifies any name matching /[Tt]oken/ as a TokenPropertyModel', () => {
        const list = PropertiesModel.createPropList({ tokenId: '0.0.1' });
        assert.equal(list[0].type, 'token');
    });

    it('skips undefined values', () => {
        const list = PropertiesModel.createPropList({ a: undefined, b: 1 });
        assert.equal(list.length, 1);
        assert.equal(list[0].path, 'b');
    });

    it('marks an empty-keys object with value=false', () => {
        const list = PropertiesModel.createPropList({ obj: {} });
        assert.equal(list[0].value, false);
    });
});

describe('PropertiesModel instance methods', () => {
    it('getPropList() returns a copy (not the underlying list)', () => {
        const m = new PropertiesModel({ a: 1, b: 2 });
        const list1 = m.getPropList();
        list1.push({ name: 'mutated' });
        const list2 = m.getPropList();
        assert.notEqual(list1, list2);
        assert.equal(list2.length, 2);
    });

    it('getPropList(type) filters by type', () => {
        const m = new PropertiesModel({ a: 1, list: [9] });
        const arrays = m.getPropList('array');
        assert.equal(arrays.length, 1);
        assert.equal(arrays[0].path, 'list');
    });

    it('hash() joins each property hash with a comma, skipping nulls', () => {
        const m = new PropertiesModel({ a: 1, b: 'x' });
        const h = m.hash(opts());
        assert.ok(h.includes('a:1'));
        assert.ok(h.includes('b:x'));
        assert.ok(h.includes(','));
    });

    it('toObject() returns each property serialized', () => {
        const m = new PropertiesModel({ a: 1 });
        const out = m.toObject();
        assert.equal(out.length, 1);
        assert.equal(out[0].name, 'a');
        assert.equal(out[0].value, 1);
    });

    it('handles non-object input gracefully (empty list)', () => {
        const m = new PropertiesModel(null);
        assert.deepEqual(m.toObject(), []);
        assert.equal(m.hash(opts()), '');
    });
});

describe('VariableModel', () => {
    it('exposes name as the key', () => {
        const v = new VariableModel({ name: 'maxYield', type: 'Number' });
        assert.equal(v.key, 'maxYield');
    });

    it('starts with empty weights and getWeight()=undefined', () => {
        const v = new VariableModel({ name: 'x' });
        assert.deepEqual(v.getWeights(), []);
        assert.equal(v.maxWeight(), 0);
        assert.equal(v.getWeight(), undefined);
    });

    it('update() populates two weights (group_lvl_0 and group_lvl_1)', () => {
        const v = new VariableModel({ name: 'x', type: 'Number' });
        v.update(opts());
        const weights = v.getWeights();
        assert.equal(weights.length, 2);
        assert.ok(weights[0].length > 0);
        assert.ok(weights[1].length > 0);
        assert.equal(v.maxWeight(), 2);
    });

    it('checkWeight(i) returns true for valid indexes after update()', () => {
        const v = new VariableModel({ name: 'x' });
        v.update(opts());
        assert.equal(v.checkWeight(0), true);
        assert.equal(v.checkWeight(1), true);
        assert.equal(v.checkWeight(2), false);
    });

    it('falls back to comparing names when weights are empty', () => {
        const a = new VariableModel({ name: 'foo' });
        const b = new VariableModel({ name: 'foo' });
        const c = new VariableModel({ name: 'bar' });
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equal() at index=undefined compares the strongest (index 0) weight', () => {
        const a = new VariableModel({ name: 'x', type: 'Number' });
        const b = new VariableModel({ name: 'x', type: 'Number' });
        const c = new VariableModel({ name: 'x', type: 'String' });
        a.update(opts());
        b.update(opts());
        c.update(opts());
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('toObject returns the documented {name, properties} shape', () => {
        const v = new VariableModel({ name: 'x', type: 'Number', value: 1 });
        const out = v.toObject();
        assert.equal(out.name, 'x');
        assert.ok(Array.isArray(out.properties));
    });

    it('equalKey() compares by name', () => {
        const a = new VariableModel({ name: 'x' });
        const b = new VariableModel({ name: 'x' });
        const c = new VariableModel({ name: 'y' });
        assert.equal(a.equalKey(b), true);
        assert.equal(a.equalKey(c), false);
    });
});
