import assert from 'node:assert/strict';
import { FieldModel } from '../../dist/analytics/compare/models/field.model.js';

const ALL = 'All';
const NONE = 'None';
const SIMPLE = 'Simple';
const DEFAULT = 'Default';

const opts = (overrides = {}) => ({
    propLvl: ALL,
    keyLvl: DEFAULT,
    idLvl: ALL,
    ...overrides,
});

const stringProp = (extra = {}) => ({ type: 'string', title: 'Title', description: 'Desc', ...extra });

describe('FieldModel construction basics', () => {
    it('defaults title and description to the name when absent', () => {
        const f = new FieldModel('amount', { type: 'number' }, true);
        assert.equal(f.title, 'amount');
        assert.equal(f.description, 'amount');
    });

    it('uses provided title and description', () => {
        const f = new FieldModel('amount', stringProp(), false);
        assert.equal(f.title, 'Title');
        assert.equal(f.description, 'Desc');
    });

    it('detects array type and unwraps items', () => {
        const f = new FieldModel('list', { type: 'array', items: { type: 'string' } }, false);
        assert.equal(f.isArray, true);
        assert.equal(f.type, 'string');
    });

    it('detects ref type ($ref without type)', () => {
        const f = new FieldModel('sub', { $ref: '#schema1' }, false);
        assert.equal(f.isRef, true);
        assert.equal(f.type, '#schema1');
    });

    it('non-ref with $ref AND type keeps the primitive type', () => {
        const f = new FieldModel('x', { type: 'string', $ref: '#s' }, false);
        assert.equal(f.isRef, false);
        assert.equal(f.type, 'string');
        assert.equal(f.remoteLink, '#s');
    });

    it('selects the first oneOf entry', () => {
        const f = new FieldModel('x', { oneOf: [{ type: 'string', title: 'one' }, { type: 'number' }] }, false);
        assert.equal(f.type, 'string');
        assert.equal(f.title, 'one');
    });

    it('captures format, pattern and enum for non-ref fields', () => {
        const f = new FieldModel('x', { type: 'string', format: 'date', pattern: '\\d+', enum: ['a', 'b'] }, false);
        assert.equal(f.format, 'date');
        assert.equal(f.pattern, '\\d+');
        assert.deepEqual(f.enum, ['a', 'b']);
    });

    it('readOnly flag is captured', () => {
        const f = new FieldModel('x', { type: 'string', readOnly: true }, false);
        assert.equal(f.readOnly, true);
    });

    it('order is -1 and index null when no comment order', () => {
        const f = new FieldModel('x', { type: 'string' }, false);
        assert.equal(f.order, -1);
        assert.equal(f.index, null);
    });
});

describe('FieldModel.parseFieldComment via $comment', () => {
    it('extracts unit/unitSystem/customType/property from JSON $comment', () => {
        const comment = JSON.stringify({ unit: 'kg', unitSystem: 'metric', customType: 'geo', property: 'p1' });
        const f = new FieldModel('x', { type: 'string', $comment: comment }, false);
        assert.equal(f.unit, 'kg');
        assert.equal(f.unitSystem, 'metric');
        assert.equal(f.customType, 'geo');
        assert.equal(f.property, 'p1');
    });

    it('sets order/index from orderPosition in comment', () => {
        const comment = JSON.stringify({ orderPosition: 5 });
        const f = new FieldModel('x', { type: 'string', $comment: comment }, false);
        assert.equal(f.order, 5);
        assert.equal(f.index, 5);
    });

    it('negative orderPosition keeps order -1', () => {
        const comment = JSON.stringify({ orderPosition: -3 });
        const f = new FieldModel('x', { type: 'string', $comment: comment }, false);
        assert.equal(f.order, -1);
    });

    it('malformed comment is ignored gracefully', () => {
        const f = new FieldModel('x', { type: 'string', $comment: 'not-json{' }, false);
        assert.equal(f.unit, null);
        assert.equal(f.order, -1);
    });
});

describe('FieldModel.getPropList', () => {
    it('includes name/title/description/type/required/multiple/readOnly/order', () => {
        const f = new FieldModel('amount', stringProp(), true);
        const names = f.getPropList().map((p) => p.name);
        for (const n of ['name', 'title', 'description', 'required', 'multiple', 'type', 'readOnly', 'order']) {
            assert.ok(names.includes(n), `expected ${n}`);
        }
    });

    it('emits enum array property plus indexed entries', () => {
        const f = new FieldModel('x', { type: 'string', enum: ['a', 'b'] }, false);
        const list = f.getPropList();
        const enumProp = list.find((p) => p.name === 'enum');
        assert.ok(enumProp);
        assert.equal(enumProp.value, 2);
        const idx0 = list.find((p) => p.path === 'enum.0');
        const idx1 = list.find((p) => p.path === 'enum.1');
        assert.equal(idx0.value, 'a');
        assert.equal(idx1.value, 'b');
    });

    it('empty enum yields array prop with 0 and no index entries', () => {
        const f = new FieldModel('x', { type: 'string', enum: [] }, false);
        const list = f.getPropList();
        const enumProp = list.find((p) => p.name === 'enum');
        assert.equal(enumProp.value, 0);
        assert.equal(list.filter((p) => p.path && p.path.startsWith('enum.')).length, 0);
    });

    it('type emitted as a UUID-typed property', () => {
        const f = new FieldModel('x', { type: 'string' }, false);
        const typeProp = f.getPropList().find((p) => p.name === 'type');
        assert.equal(typeProp.type, 'uuid');
    });

    it('skips unit/unitSystem/customType/format/pattern when absent', () => {
        const f = new FieldModel('x', { type: 'string' }, false);
        const names = f.getPropList().map((p) => p.name);
        assert.equal(names.includes('unit'), false);
        assert.equal(names.includes('format'), false);
        assert.equal(names.includes('pattern'), false);
    });
});

describe('FieldModel.calcBaseWeight + getWeight', () => {
    it('getWeight undefined before update', () => {
        const f = new FieldModel('x', stringProp(), false);
        assert.equal(f.getWeight(), undefined);
    });

    it('produces weights after update; getWeight returns top weight', () => {
        const f = new FieldModel('x', stringProp(), false);
        f.update(opts());
        assert.ok(typeof f.getWeight() === 'string');
        assert.ok(f.getWeights().length > 0);
        assert.equal(f.maxWeight(), f.getWeights().length);
    });

    it('propLvl=None yields only the name-based weight slot', () => {
        const f = new FieldModel('x', stringProp(), false);
        f.update(opts({ propLvl: NONE }));
        assert.equal(f.getWeights().length, 1);
    });

    it('checkWeight reflects available weight slots', () => {
        const f = new FieldModel('x', stringProp(), false);
        f.update(opts());
        assert.equal(f.checkWeight(0), true);
        assert.equal(f.checkWeight(999), false);
    });

    it('identical fields produce identical top weight', () => {
        const a = new FieldModel('x', stringProp(), false);
        const b = new FieldModel('x', stringProp(), false);
        a.update(opts());
        b.update(opts());
        assert.equal(a.getWeight(), b.getWeight());
    });

    it('different descriptions produce different deep weights', () => {
        const a = new FieldModel('x', stringProp({ description: 'AAA' }), false);
        const b = new FieldModel('x', stringProp({ description: 'BBB' }), false);
        a.update(opts());
        b.update(opts());
        assert.notEqual(a.getWeight(), b.getWeight());
    });
});

describe('FieldModel.equal', () => {
    it('falls back to name comparison when no weights computed', () => {
        const a = new FieldModel('x', stringProp(), false);
        const b = new FieldModel('x', stringProp(), false);
        assert.equal(a.equal(b), true);
        const c = new FieldModel('y', stringProp(), false);
        assert.equal(a.equal(c), false);
    });

    it('compares top weight at iteration 0', () => {
        const a = new FieldModel('x', stringProp(), false);
        const b = new FieldModel('x', stringProp(), false);
        a.update(opts());
        b.update(opts());
        assert.equal(a.equal(b, 0), true);
    });
});

describe('FieldModel.equalKey', () => {
    it('field keys are null so any two fields share a key', () => {
        const a = new FieldModel('x', stringProp(), false);
        const b = new FieldModel('y', stringProp(), false);
        assert.equal(a.equalKey(b), true);
    });
});

describe('FieldModel.toObject', () => {
    it('round-trips the documented field shape', () => {
        const f = new FieldModel('amount', stringProp({ format: 'date' }), true);
        const o = f.toObject();
        assert.equal(o.name, 'amount');
        assert.equal(o.title, 'Title');
        assert.equal(o.format, 'date');
        assert.equal(o.required, true);
        assert.equal(o.order, -1);
    });
});

describe('FieldModel.getField + sub-schema', () => {
    it('returns self for a name match with no dot', () => {
        const f = new FieldModel('amount', stringProp(), false);
        assert.equal(f.getField('amount'), f);
    });

    it('returns null for a non-matching name', () => {
        const f = new FieldModel('amount', stringProp(), false);
        assert.equal(f.getField('other'), null);
    });

    it('returns null for empty path', () => {
        const f = new FieldModel('amount', stringProp(), false);
        assert.equal(f.getField(''), null);
    });

    it('descends into sub-schema for dotted paths', () => {
        const parent = new FieldModel('a', { $ref: '#s' }, false);
        const child = new FieldModel('b', stringProp(), false);
        parent.setSubSchema({ fields: [child], update: () => {}, getField: (p) => (p === 'b' ? child : null) });
        assert.equal(parent.getField('a.b'), child);
    });

    it('children getter is empty without sub-schema', () => {
        const f = new FieldModel('a', stringProp(), false);
        assert.deepEqual(f.children, []);
    });

    it('children getter returns sub-schema fields', () => {
        const child = new FieldModel('b', stringProp(), false);
        const f = new FieldModel('a', { $ref: '#s' }, false);
        f.setSubSchema({ fields: [child], update: () => {} });
        assert.deepEqual(f.children, [child]);
    });
});

describe('FieldModel.setCondition + condition getter', () => {
    it('condition is undefined until set', () => {
        const f = new FieldModel('a', stringProp(), false);
        assert.equal(f.condition, undefined);
    });

    it('returns the set condition', () => {
        const f = new FieldModel('a', stringProp(), false);
        f.setCondition('cond-x');
        assert.equal(f.condition, 'cond-x');
    });

    it('key getter is always null', () => {
        const f = new FieldModel('a', stringProp(), false);
        assert.equal(f.key, null);
    });
});
