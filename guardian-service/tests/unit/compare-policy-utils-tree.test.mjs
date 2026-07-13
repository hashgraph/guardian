import assert from 'node:assert/strict';
import { ComparePolicyUtils } from '../../dist/analytics/compare/utils/compare-policy-utils.js';
import { Status } from '../../dist/analytics/compare/types/index.js';

const node = (key, children = [], opts = {}) => ({
    key,
    children,
    getChildren: () => children,
    equal: opts.equal ?? ((o) => !!o && o.key === key),
    equalKey: opts.equalKey ?? ((o) => !!o && o.key === key),
});

const makeRate = () => {
    let kids = [];
    return {
        type: null,
        setChildren: function (c) { kids = c; },
        getChildren: () => kids,
    };
};

describe('ComparePolicyUtils.treeToArray', () => {
    it('flattens a tree depth-first', () => {
        const tree = node('root', [node('a', [node('a1')]), node('b')]);
        const out = ComparePolicyUtils.treeToArray(tree, []);
        assert.deepEqual(out.map((n) => n.key), ['root', 'a', 'a1', 'b']);
    });
    it('returns single element for a leaf', () => {
        const out = ComparePolicyUtils.treeToArray(node('leaf'), []);
        assert.equal(out.length, 1);
    });
    it('appends into the provided result array', () => {
        const acc = [{ key: 'pre' }];
        const out = ComparePolicyUtils.treeToArray(node('x'), acc);
        assert.equal(out[0].key, 'pre');
        assert.equal(out[1].key, 'x');
    });
});

describe('ComparePolicyUtils._rateToTable / rateToTable / ratesToTable', () => {
    const rnode = (key, children = []) => ({ key, getChildren: () => children });
    it('rateToTable flattens a single rate tree', () => {
        const r = rnode('r', [rnode('c1'), rnode('c2', [rnode('c2a')])]);
        const table = ComparePolicyUtils.rateToTable(r);
        assert.deepEqual(table.map((x) => x.key), ['r', 'c1', 'c2', 'c2a']);
    });
    it('ratesToTable flattens a list of rate trees', () => {
        const table = ComparePolicyUtils.ratesToTable([rnode('a', [rnode('a1')]), rnode('b')]);
        assert.deepEqual(table.map((x) => x.key), ['a', 'a1', 'b']);
    });
    it('ratesToTable returns empty for empty input', () => {
        assert.deepEqual(ComparePolicyUtils.ratesToTable([]), []);
    });
    it('_rateToTable pushes into given table', () => {
        const table = [];
        ComparePolicyUtils._rateToTable(rnode('only'), table);
        assert.equal(table.length, 1);
        assert.equal(table[0].key, 'only');
    });
});

describe('ComparePolicyUtils.compareTree status branches', () => {
    it('marks FULL when both equal', () => {
        const createRate = () => makeRate();
        const t1 = node('s', [], { equal: () => true });
        const t2 = node('s');
        const rate = ComparePolicyUtils.compareTree(t1, t2, createRate);
        assert.equal(rate.type, Status.FULL);
    });
    it('marks PARTLY when keys equal but not fully equal', () => {
        const createRate = () => makeRate();
        const t1 = node('s', [], { equal: () => false, equalKey: () => true });
        const t2 = node('s');
        const rate = ComparePolicyUtils.compareTree(t1, t2, createRate);
        assert.equal(rate.type, Status.PARTLY);
    });
    it('marks LEFT_AND_RIGHT when neither equal nor key-equal', () => {
        const createRate = () => makeRate();
        const t1 = node('a', [], { equal: () => false, equalKey: () => false });
        const t2 = node('b');
        const rate = ComparePolicyUtils.compareTree(t1, t2, createRate);
        assert.equal(rate.type, Status.LEFT_AND_RIGHT);
    });
    it('marks LEFT when right is missing', () => {
        const createRate = () => makeRate();
        const rate = ComparePolicyUtils.compareTree(node('a'), null, createRate);
        assert.equal(rate.type, Status.LEFT);
    });
    it('marks RIGHT when left is missing', () => {
        const createRate = () => makeRate();
        const rate = ComparePolicyUtils.compareTree(null, node('b'), createRate);
        assert.equal(rate.type, Status.RIGHT);
    });
    it('returns bare rate when both trees missing', () => {
        const createRate = () => makeRate();
        const rate = ComparePolicyUtils.compareTree(null, null, createRate);
        assert.equal(rate.type, null);
    });
    it('recurses children on FULL match', () => {
        const createRate = () => makeRate();
        const t1 = node('s', [node('c', [], { equal: () => true })], { equal: () => true });
        const t2 = node('s', [node('c')]);
        const rate = ComparePolicyUtils.compareTree(t1, t2, createRate);
        assert.equal(rate.getChildren().length, 1);
    });
});

describe('ComparePolicyUtils.compareChildren', () => {
    it('FULL uses 1:1 index pairing', () => {
        const createRate = () => makeRate();
        const c1 = [node('a', [], { equal: () => true })];
        const c2 = [node('a')];
        const out = ComparePolicyUtils.compareChildren(Status.FULL, c1, c2, createRate);
        assert.equal(out.length, 1);
        assert.equal(out[0].type, Status.FULL);
    });
    it('non-FULL non-PARTLY status uses notMerge (left only)', () => {
        const createRate = () => makeRate();
        const out = ComparePolicyUtils.compareChildren(Status.LEFT, [node('a')], null, createRate);
        assert.equal(out.length, 1);
        assert.equal(out[0].type, Status.LEFT);
    });
    it('returns empty when both child lists null via notMerge', () => {
        const createRate = () => makeRate();
        const out = ComparePolicyUtils.compareChildren(Status.RIGHT, null, null, createRate);
        assert.equal(out.length, 0);
    });
});
