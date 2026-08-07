import assert from 'node:assert/strict';
import { FieldsRate } from '../../dist/analytics/compare/rates/fields-rate.js';

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

const fakeField = (overrides = {}) => ({
    index: 0,
    name: 'amount',
    path: 'amount',
    title: 'Amount',
    description: 'desc',
    type: 'number',
    format: null,
    required: false,
    getPropList() { return overrides.props || [
        prop('name', 'name', 'amount'),
        prop('type', 'type', 'number'),
    ]; },
    toObject() { return {}; },
    ...overrides,
});

describe('FieldsRate construction', () => {
    it('marks both-present as 100% (FULL)', () => {
        const r = new FieldsRate(fakeField(), fakeField());
        assert.equal(r.totalRate, 100);
    });

    it('marks left-only with totalRate=-1', () => {
        const r = new FieldsRate(fakeField(), null);
        assert.equal(r.totalRate, -1);
    });

    it('marks right-only with totalRate=-1', () => {
        const r = new FieldsRate(null, fakeField());
        assert.equal(r.totalRate, -1);
    });

    it('indexRate and propertiesRate start at -1', () => {
        const r = new FieldsRate(fakeField(), fakeField());
        assert.equal(r.indexRate, -1);
        assert.equal(r.propertiesRate, -1);
    });
});

describe('FieldsRate.calc', () => {
    it('marks indexRate=100 when both fields share the same index', () => {
        const a = fakeField({ index: 1 });
        const b = fakeField({ index: 1 });
        const r = new FieldsRate(a, b);
        r.calc(opts);
        assert.equal(r.indexRate, 100);
    });

    it('marks indexRate=0 when indexes differ', () => {
        const a = fakeField({ index: 1 });
        const b = fakeField({ index: 2 });
        const r = new FieldsRate(a, b);
        r.calc(opts);
        assert.equal(r.indexRate, 0);
    });

    it('computes propertiesRate=100 when every prop matches', () => {
        const props = [
            prop('name', 'name', 'amount'),
            prop('type', 'type', 'number'),
        ];
        const a = fakeField({ props });
        const b = fakeField({ props });
        const r = new FieldsRate(a, b);
        r.calc(opts);
        assert.equal(r.propertiesRate, 100);
        assert.equal(r.totalRate, 100);
    });

    it('floors propertiesRate when half the props differ', () => {
        const a = fakeField({ props: [
            prop('name', 'name', 'a'),
            prop('type', 'type', 'X'),
        ]});
        const b = fakeField({ props: [
            prop('name', 'name', 'a'),
            prop('type', 'type', 'Y'),
        ]});
        const r = new FieldsRate(a, b);
        r.calc(opts);
        assert.equal(r.propertiesRate, 50);
        assert.equal(r.totalRate, 50);
    });

    it('skips index/props rates when only one side is present', () => {
        const r = new FieldsRate(fakeField(), null);
        r.calc(opts);
        assert.equal(r.indexRate, -1);
        assert.equal(r.propertiesRate, -1);
    });

    it('sorts the canonical properties (name/title/description/required/type/...) first', () => {
        // Provide an out-of-order prop list — calc() reorders into the well-known order.
        const props = [
            prop('extra', 'extra', 1),
            prop('type', 'type', 'number'),
            prop('name', 'name', 'amount'),
        ];
        const a = fakeField({ props });
        const b = fakeField({ props });
        const r = new FieldsRate(a, b);
        r.calc(opts);
        const names = r.properties.map((p) => p.name);
        // 'name' should come before 'type' even though it was last in the input.
        assert.ok(names.indexOf('name') < names.indexOf('type'));
    });
});

describe('FieldsRate.setChildren / getChildren', () => {
    it('setChildren stores its argument under .fields', () => {
        const r = new FieldsRate(fakeField(), fakeField());
        const kids = [{ totalRate: 90 }, { totalRate: 80 }];
        r.setChildren(kids);
        assert.equal(r.fields, kids);
        assert.equal(r.getChildren(), kids);
    });
});

describe('FieldsRate.getRateValue', () => {
    it('returns indexRate for "index"', () => {
        const r = new FieldsRate(fakeField({ index: 1 }), fakeField({ index: 1 }));
        r.calc(opts);
        assert.equal(r.getRateValue('index'), 100);
    });

    it('returns propertiesRate for "properties"', () => {
        const r = new FieldsRate(fakeField(), fakeField());
        r.calc(opts);
        assert.equal(r.getRateValue('properties'), r.propertiesRate);
    });

    it('falls back to totalRate for any other name', () => {
        const r = new FieldsRate(fakeField(), fakeField());
        r.calc(opts);
        assert.equal(r.getRateValue('something'), r.totalRate);
    });
});

describe('FieldsRate.getSubRate', () => {
    it('returns the properties array', () => {
        const r = new FieldsRate(fakeField(), fakeField());
        r.calc(opts);
        assert.equal(r.getSubRate(), r.properties);
    });
});
