import assert from 'node:assert/strict';
import { Rate } from '../../dist/analytics/compare/rates/rate.js';

const model = (label, totalRate = -1) => ({
    label,
    totalRate,
    toObject: () => ({ kind: label }),
});

describe('Rate (base class) construction', () => {
    it('exposes the documented TOTAL_RATE constant', () => {
        assert.equal(Rate.TOTAL_RATE, 'total');
    });

    it('starts with type=NONE and totalRate=-1', () => {
        const r = new Rate(model('a'), model('b'));
        // Status.NONE is internal — verify via the toObject() result.
        const obj = r.toObject();
        assert.equal(obj.totalRate, -1);
    });

    it('stores left and right references unchanged', () => {
        const left = model('a');
        const right = model('b');
        const r = new Rate(left, right);
        assert.equal(r.left, left);
        assert.equal(r.right, right);
    });
});

describe('Rate.toObject', () => {
    it('embeds .toObject() of left and right under items[0..1]', () => {
        const r = new Rate(model('L'), model('R'));
        const obj = r.toObject();
        assert.deepEqual(obj.items[0], { kind: 'L' });
        assert.deepEqual(obj.items[1], { kind: 'R' });
    });

    it('tolerates a missing left or right (items entry becomes undefined)', () => {
        const left = model('only-L');
        const r = new Rate(left, undefined);
        const obj = r.toObject();
        assert.deepEqual(obj.items[0], { kind: 'only-L' });
        assert.equal(obj.items[1], undefined);
    });
});

describe('Rate default behavior of overrideable methods', () => {
    it('getChildren() returns an empty array', () => {
        const r = new Rate(model('a'), model('b'));
        assert.deepEqual(r.getChildren(), []);
    });

    it('getSubRate() returns null for any name', () => {
        const r = new Rate(model('a'), model('b'));
        assert.equal(r.getSubRate('any'), null);
    });

    it('setChildren() is a no-op (does not throw)', () => {
        const r = new Rate(model('a'), model('b'));
        assert.doesNotThrow(() => r.setChildren([{ totalRate: 10 }]));
        assert.deepEqual(r.getChildren(), []);
    });

    it('calc() is a no-op (does not throw)', () => {
        const r = new Rate(model('a'), model('b'));
        assert.doesNotThrow(() => r.calc({}));
    });

    it('getRateValue() returns totalRate regardless of name', () => {
        const r = new Rate(model('a'), model('b'));
        r.totalRate = 42;
        assert.equal(r.getRateValue('properties'), 42);
        assert.equal(r.getRateValue('anything'), 42);
    });
});

describe('Rate.total', () => {
    it('returns its own totalRate when there are no children', () => {
        const r = new Rate(model('a'), model('b'));
        r.totalRate = 80;
        assert.equal(r.total(), 80);
    });

    it('floors the average of own + each child.total()', () => {
        const r = new Rate(model('a'), model('b'));
        r.totalRate = 60;
        // simulate children by overriding getChildren()
        r.getChildren = () => [
            { total: () => 100 },
            { total: () => 70 },
            { total: () => 30 },
        ];
        // (60 + 100 + 70 + 30) / 4 = 65
        assert.equal(r.total(), 65);
    });
});
