import assert from 'node:assert/strict';
import { RootRate } from '../../dist/analytics/compare/rates/root-rate.js';
import { ObjectRate } from '../../dist/analytics/compare/rates/object-rate.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

const prop = (name, value) => ({
    name,
    path: name,
    lvl: 1,
    value,
    equal(other) { return this.value === other.value; },
    ignore() { return false; },
    getPropList() { return []; },
    toObject() { return { name, value }; },
});

const obj = (overrides = {}) => ({
    getPropList() { return overrides.props || []; },
    toObject() { return overrides.shape || {}; },
    ...overrides,
});

describe('RootRate', () => {
    it('starts with totalRate=100 and PARTLY status', () => {
        const r = new RootRate();
        assert.equal(r.totalRate, 100);
        assert.equal(r.left, null);
        assert.equal(r.right, null);
    });

    it('roundtrips children via setChildren/getChildren', () => {
        const r = new RootRate();
        const kids = [{ totalRate: 70 }, { totalRate: 80 }];
        r.setChildren(kids);
        assert.equal(r.getChildren(), kids);
    });

    it('total() folds in children', () => {
        const r = new RootRate();
        r.setChildren([
            { total: () => 100 },
            { total: () => 50 },
        ]);
        // (100 + 100 + 50) / 3 = 83
        assert.equal(r.total(), 83);
    });
});

describe('ObjectRate construction', () => {
    it('marks both-present pair at 100%', () => {
        const r = new ObjectRate(obj(), obj());
        assert.equal(r.totalRate, 100);
    });

    it('marks left-only pair with totalRate=-1', () => {
        const r = new ObjectRate(obj(), null);
        assert.equal(r.totalRate, -1);
    });

    it('marks right-only pair with totalRate=-1', () => {
        const r = new ObjectRate(null, obj());
        assert.equal(r.totalRate, -1);
    });

    it('propertiesRate starts at -1', () => {
        const r = new ObjectRate(obj(), obj());
        assert.equal(r.propertiesRate, -1);
    });
});

describe('ObjectRate.calc', () => {
    it('100% for two objects with identical prop lists', () => {
        const a = obj({ props: [prop('a', 1), prop('b', 2)] });
        const b = obj({ props: [prop('a', 1), prop('b', 2)] });
        const r = new ObjectRate(a, b);
        r.calc(opts);
        assert.equal(r.propertiesRate, 100);
        assert.equal(r.totalRate, 100);
    });

    it('halves the rate when half the props differ', () => {
        const a = obj({ props: [prop('a', 1), prop('b', 2)] });
        const b = obj({ props: [prop('a', 1), prop('b', 9)] });
        const r = new ObjectRate(a, b);
        r.calc(opts);
        assert.equal(r.propertiesRate, 50);
        assert.equal(r.totalRate, 50);
    });

    it('skips computation when only one side is present', () => {
        const r = new ObjectRate(obj({ props: [prop('a', 1)] }), null);
        r.calc(opts);
        assert.equal(r.totalRate, -1);
    });
});

describe('ObjectRate.getSubRate / getRateValue', () => {
    it('getSubRate returns the inner properties rates regardless of name', () => {
        const r = new ObjectRate(obj(), obj());
        r.calc(opts);
        assert.equal(r.getSubRate('any'), r.properties);
    });

    it('getRateValue("properties") returns propertiesRate', () => {
        const a = obj({ props: [prop('a', 1)] });
        const b = obj({ props: [prop('a', 1)] });
        const r = new ObjectRate(a, b);
        r.calc(opts);
        assert.equal(r.getRateValue('properties'), r.propertiesRate);
    });

    it('getRateValue(other) returns totalRate', () => {
        const a = obj({ props: [prop('a', 1)] });
        const b = obj({ props: [prop('a', 1)] });
        const r = new ObjectRate(a, b);
        r.calc(opts);
        assert.equal(r.getRateValue('whatever'), r.totalRate);
    });
});
