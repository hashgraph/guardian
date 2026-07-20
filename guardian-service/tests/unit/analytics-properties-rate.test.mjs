import assert from 'node:assert/strict';
import { PropertiesRate } from '../../dist/analytics/compare/rates/properties-rate.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

const prop = (name, path, value, overrides = {}) => ({
    name,
    path,
    lvl: 1,
    value,
    ignored: false,
    equal(other) { return this.value === other.value; },
    ignore() { return this.ignored; },
    getPropList() { return overrides.subProps || []; },
    toObject() { return { name: this.name, path: this.path, value: this.value }; },
    ...overrides,
});

describe('PropertiesRate construction', () => {
    it('captures both sides and copies name/path/lvl from the left when present', () => {
        const a = prop('amt', 'a.amt', 1);
        const b = prop('amt', 'a.amt', 2);
        const r = new PropertiesRate(a, b);
        assert.equal(r.left, a);
        assert.equal(r.right, b);
        assert.equal(r.name, 'amt');
        assert.equal(r.path, 'a.amt');
        assert.equal(r.lvl, 1);
    });

    it('falls back to the right side when left is missing', () => {
        const b = prop('amt', 'a.amt', 2);
        const r = new PropertiesRate(null, b);
        assert.equal(r.name, 'amt');
        assert.equal(r.path, 'a.amt');
    });

    it('totalRate and propertiesRate start at -1', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), prop('a', 'a', 1));
        assert.equal(r.totalRate, -1);
        assert.equal(r.propertiesRate, -1);
    });
});

describe('PropertiesRate.calc — basic comparison', () => {
    it('marks identical leaves as 100% (FULL)', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), prop('a', 'a', 1));
        r.calc(opts);
        assert.equal(r.totalRate, 100);
    });

    it('marks differing leaves as 0% (PARTLY)', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), prop('a', 'a', 2));
        r.calc(opts);
        assert.equal(r.totalRate, 0);
    });

    it('a left-only ignored property is treated as 100%', () => {
        const left = prop('a', 'a', 1, { ignored: true });
        const r = new PropertiesRate(left, null);
        r.calc(opts);
        assert.equal(r.totalRate, 100);
        assert.equal(r.propertiesRate, 100);
    });

    it('a right-only ignored property is treated as 100%', () => {
        const right = prop('a', 'a', 1, { ignored: true });
        const r = new PropertiesRate(null, right);
        r.calc(opts);
        assert.equal(r.totalRate, 100);
        assert.equal(r.propertiesRate, 100);
    });

    it('a left-only non-ignored property keeps totalRate at -1', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), null);
        r.calc(opts);
        assert.equal(r.totalRate, -1);
    });

    it('an ignored value that equals the other side stays at 100', () => {
        const left = prop('a', 'a', 1, { ignored: true });
        const right = prop('a', 'a', 1);
        const r = new PropertiesRate(left, right);
        r.calc(opts);
        assert.equal(r.totalRate, 100);
        assert.equal(r.propertiesRate, 100);
    });
});

describe('PropertiesRate.calc — with sub-properties', () => {
    it('averages child rates into propertiesRate, then averages with self', () => {
        const childA1 = prop('c', 'a.c', 'X');
        const childA2 = prop('c', 'a.c', 'X'); // matches
        const childB1 = prop('d', 'a.d', 'Y');
        const childB2 = prop('d', 'a.d', 'Z'); // differs
        const left = prop('a', 'a', 'top', { subProps: [childA1, childB1] });
        const right = prop('a', 'a', 'top', { subProps: [childA2, childB2] });
        const r = new PropertiesRate(left, right);
        r.calc(opts);
        // selfRate=100 (top values equal), child rates are [100, 0] → propertiesRate=50
        // totalRate = floor((100 + 50)/2) = 75
        assert.equal(r.propertiesRate, 50);
        assert.equal(r.totalRate, 75);
    });

    it('falls through propertiesRate=totalRate when there are no sub-props', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), prop('a', 'a', 1));
        r.calc(opts);
        assert.equal(r.propertiesRate, r.totalRate);
    });
});

describe('PropertiesRate.toObject / total / getSubRate / getRateValue', () => {
    it('toObject includes name/path/lvl + serialized items', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), prop('a', 'a', 1));
        r.calc(opts);
        const o = r.toObject();
        assert.equal(o.name, 'a');
        assert.equal(o.path, 'a');
        assert.equal(o.lvl, 1);
        assert.equal(o.totalRate, 100);
        assert.equal(o.items.length, 2);
    });

    it('toObject tolerates a missing side (items entry undefined)', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), null);
        const o = r.toObject();
        assert.equal(o.items[0].name, 'a');
        assert.equal(o.items[1], undefined);
    });

    it('getSubRate() returns the child rates', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), prop('a', 'a', 1));
        r.calc(opts);
        assert.deepEqual(r.getSubRate(), r.properties);
    });

    it('getRateValue() returns totalRate regardless of name', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), prop('a', 'a', 2));
        r.calc(opts);
        assert.equal(r.getRateValue('properties'), r.totalRate);
        assert.equal(r.getRateValue('whatever'), r.totalRate);
    });

    it('total() returns totalRate (no recursion)', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), prop('a', 'a', 1));
        r.calc(opts);
        assert.equal(r.total(), r.totalRate);
    });

    it('setChildren()/getChildren() are no-ops at this rate level', () => {
        const r = new PropertiesRate(prop('a', 'a', 1), prop('a', 'a', 1));
        assert.doesNotThrow(() => r.setChildren([{ totalRate: 5 }]));
        assert.deepEqual(r.getChildren(), []);
    });
});
