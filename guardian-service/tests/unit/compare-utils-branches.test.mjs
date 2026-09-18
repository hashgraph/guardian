import assert from 'node:assert/strict';
import { CompareUtils } from '../../dist/analytics/compare/utils/utils.js';
import { CSV } from '../../dist/analytics/compare/table/csv.js';

describe('CompareUtils.equal', () => {
    it('delegates to .equal when present', () => {
        const a = { equal: (o) => o === 'match' };
        assert.equal(CompareUtils.equal(a, 'match'), true);
        assert.equal(CompareUtils.equal(a, 'no'), false);
    });
    it('uses strict equality for primitives', () => {
        assert.equal(CompareUtils.equal(5, 5), true);
        assert.equal(CompareUtils.equal('x', 'y'), false);
    });
});

describe('CompareUtils.mapping', () => {
    it('matches an unpaired left and assigns right', () => {
        const left = { equal: (o) => o.id === 1 };
        const list = [{ left, right: null }];
        CompareUtils.mapping(list, { id: 1 });
        assert.equal(list[0].right.id, 1);
    });
    it('pushes a new row when nothing matches', () => {
        const list = [{ left: { equal: () => false }, right: null }];
        CompareUtils.mapping(list, { id: 9 });
        assert.equal(list.length, 2);
        assert.equal(list[1].left, null);
        assert.equal(list[1].right.id, 9);
    });
    it('skips rows that already have a right', () => {
        const left = { equal: () => true };
        const list = [{ left, right: { id: 'taken' } }];
        CompareUtils.mapping(list, { id: 'new' });
        assert.equal(list.length, 2);
        assert.equal(list[0].right.id, 'taken');
    });
});

describe('CompareUtils.calcRate', () => {
    it('returns 100 for empty list', () => {
        assert.equal(CompareUtils.calcRate([]), 100);
    });
    it('averages positive totalRate values, ignoring non-positive', () => {
        const out = CompareUtils.calcRate([{ totalRate: 100 }, { totalRate: -5 }, { totalRate: 50 }]);
        assert.equal(out, Math.floor(150 / 3));
    });
    it('clamps result to a maximum of 100', () => {
        const out = CompareUtils.calcRate([{ totalRate: 100 }, { totalRate: 100 }]);
        assert.equal(out, 100);
    });
    it('returns 0 when all rates are non-positive', () => {
        assert.equal(CompareUtils.calcRate([{ totalRate: 0 }, { totalRate: -1 }]), 0);
    });
});

describe('CompareUtils.calcTotalRate / calcTotalRates', () => {
    it('calcTotalRate averages variadic args', () => {
        assert.equal(CompareUtils.calcTotalRate(10, 20, 30), 20);
    });
    it('calcTotalRate floors the average', () => {
        assert.equal(CompareUtils.calcTotalRate(10, 11), 10);
    });
    it('calcTotalRates returns 100 for empty', () => {
        assert.equal(CompareUtils.calcTotalRates([]), 100);
    });
    it('calcTotalRates floors the average', () => {
        assert.equal(CompareUtils.calcTotalRates([10, 11, 12]), 11);
    });
});

describe('CompareUtils.total (bucketed)', () => {
    it('returns 100 for empty', () => {
        assert.equal(CompareUtils.total([]), 100);
    });
    it('buckets >99 as 100', () => {
        assert.equal(CompareUtils.total([{ totalRate: 100 }]), 100);
    });
    it('buckets 51..99 as 50', () => {
        assert.equal(CompareUtils.total([{ totalRate: 75 }]), 50);
    });
    it('buckets <=50 as 0', () => {
        assert.equal(CompareUtils.total([{ totalRate: 50 }]), 0);
    });
    it('averages mixed buckets', () => {
        assert.equal(CompareUtils.total([{ totalRate: 100 }, { totalRate: 0 }]), 50);
    });
});

describe('CompareUtils.compareSchemas', () => {
    it('returns 0 when either side empty', () => {
        assert.equal(CompareUtils.compareSchemas([], [{}]), 0);
        assert.equal(CompareUtils.compareSchemas(null, null), 0);
    });
    it('directly compares single-vs-single', () => {
        const s1 = { compare: () => 88 };
        const s2 = {};
        assert.equal(CompareUtils.compareSchemas([s1], [s2]), 88);
    });
    it('returns best-min for many-vs-many high match', () => {
        const mk = (v) => ({ compare: () => v });
        const out = CompareUtils.compareSchemas([mk(90), mk(80)], [mk(90), mk(70)]);
        assert.equal(typeof out, 'number');
        assert.ok(out <= 100);
    });
    it('returns -1 when every pair is near-fully unmatched', () => {
        const mk = () => ({ compare: () => -1 });
        const out = CompareUtils.compareSchemas([mk(), mk()], [mk(), mk()]);
        assert.equal(out, -1);
    });
    it('returns -3 for the just-over-100 band', () => {
        const mk = () => ({ compare: () => -3 });
        const out = CompareUtils.compareSchemas([mk(), mk()], [mk(), mk()]);
        assert.equal(out, -3);
    });
});

describe('CompareUtils.objectToCsv / convertToCsvRecursive', () => {
    it('serialises a flat object to rows with header', () => {
        const csv = CompareUtils.objectToCsv({ a: 1, b: 'x' });
        const text = csv.result();
        assert.ok(text.includes('Index'));
        assert.ok(text.includes('Key'));
    });
    it('handles arrays with array type marker', () => {
        const csv = new CSV().add('Index').add('Key').add('Value').add('Type').addLine();
        CompareUtils.convertToCsvRecursive(csv, [1, 2]);
        assert.ok(csv.result().includes('array'));
    });
    it('handles primitive values with typeof', () => {
        const csv = new CSV().add('Index').add('Key').add('Value').add('Type').addLine();
        CompareUtils.convertToCsvRecursive(csv, 42, '0', 'num');
        assert.ok(csv.result().includes('number'));
    });
    it('handles null as a primitive object branch', () => {
        const csv = new CSV().add('h').addLine();
        CompareUtils.convertToCsvRecursive(csv, null, '0', 'n');
        assert.ok(csv.result().includes('object'));
    });
    it('recurses nested objects and arrays', () => {
        const csv = CompareUtils.objectToCsv({ list: [{ k: 'v' }], n: 3 });
        const text = csv.result();
        assert.ok(text.includes('array'));
        assert.ok(text.includes('object') || text.includes('string'));
    });
});

describe('CompareUtils.createBlockModel / createToolModel', () => {
    it('creates a tool model for blockType tool', () => {
        const m = CompareUtils.createBlockModel({ blockType: 'tool' }, 0);
        assert.ok(m);
    });
    it('creates a nested block model with children', () => {
        const m = CompareUtils.createBlockModel({
            blockType: 'container',
            children: [{ blockType: 'leaf' }],
        }, 0);
        assert.ok(m);
    });
    it('createToolModel wraps a block with children', () => {
        const m = CompareUtils.createToolModel({ blockType: 'root', children: [{ blockType: 'x' }] }, 0);
        assert.ok(m);
    });
    it('createBlockModel tolerates missing children', () => {
        const m = CompareUtils.createBlockModel({ blockType: 'x' }, 1);
        assert.ok(m);
    });
});
