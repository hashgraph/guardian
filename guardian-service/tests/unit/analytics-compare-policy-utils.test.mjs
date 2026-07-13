import assert from 'node:assert/strict';
import { ComparePolicyUtils } from '../../dist/analytics/compare/utils/compare-policy-utils.js';

const stubRate = (label, kids = []) => ({
    label,
    totalRate: 0,
    children: kids,
    setChildren(c) { this.children = c; },
    getChildren() { return this.children; },
});

describe('ComparePolicyUtils.treeToArray', () => {
    it('flattens a rate tree depth-first', () => {
        const tree = stubRate('root', [
            stubRate('a', [stubRate('a-1'), stubRate('a-2')]),
            stubRate('b'),
        ]);
        const out = ComparePolicyUtils.treeToArray(tree, []);
        assert.deepEqual(out.map((r) => r.label), ['root', 'a', 'a-1', 'a-2', 'b']);
    });
});

describe('ComparePolicyUtils.rateToTable / ratesToTable', () => {
    it('rateToTable() flattens a single rate tree', () => {
        const root = stubRate('root', [stubRate('a'), stubRate('b')]);
        const out = ComparePolicyUtils.rateToTable(root);
        assert.deepEqual(out.map((r) => r.label), ['root', 'a', 'b']);
    });

    it('ratesToTable() flattens an array of rates', () => {
        const r1 = stubRate('one', [stubRate('one-a')]);
        const r2 = stubRate('two');
        const out = ComparePolicyUtils.ratesToTable([r1, r2]);
        assert.deepEqual(out.map((r) => r.label), ['one', 'one-a', 'two']);
    });
});

describe('ComparePolicyUtils.compareTree (generic)', () => {
    const fakeTree = (key, children = [], overrides = {}) => ({
        key,
        children,
        equal(other) { return other && this.key === other.key && this._content === other._content; },
        equalKey(other) { return other && this.key === other.key; },
        _content: overrides._content ?? key,
        ...overrides,
    });

    const noOpCreateRate = (a, b) => ({
        a, b,
        children: [],
        setChildren(c) { this.children = c; },
        getChildren() { return this.children; },
    });

    it('returns a single rate with empty children when both trees are null', () => {
        const r = ComparePolicyUtils.compareTree(null, null, noOpCreateRate);
        assert.equal(r.a, null);
        assert.equal(r.b, null);
    });

    it('handles left-only by recursing into the left children', () => {
        const a = fakeTree('A', [fakeTree('a1')]);
        const r = ComparePolicyUtils.compareTree(a, null, noOpCreateRate);
        assert.equal(r.children.length, 1);
    });

    it('handles right-only by recursing into the right children', () => {
        const b = fakeTree('B', [fakeTree('b1')]);
        const r = ComparePolicyUtils.compareTree(null, b, noOpCreateRate);
        assert.equal(r.children.length, 1);
    });

    it('marks FULL when trees are equal', () => {
        const a = fakeTree('X');
        const b = fakeTree('X');
        const r = ComparePolicyUtils.compareTree(a, b, noOpCreateRate);
        assert.equal(r.type, 'FULL');
    });

    it('marks PARTLY when keys match but content differs', () => {
        const a = fakeTree('X', [], { _content: 'left-content' });
        const b = fakeTree('X', [], { _content: 'right-content' });
        const r = ComparePolicyUtils.compareTree(a, b, noOpCreateRate);
        assert.equal(r.type, 'PARTLY');
    });

    it('marks LEFT_AND_RIGHT when neither equal nor equalKey match', () => {
        const a = fakeTree('A');
        const b = fakeTree('B');
        const r = ComparePolicyUtils.compareTree(a, b, noOpCreateRate);
        assert.equal(r.type, 'LEFT_AND_RIGHT');
    });
});

describe('ComparePolicyUtils.compareChildren', () => {
    it('produces a rate per merged child entry under FULL', () => {
        const child = (k) => ({
            key: k,
            children: [],
            equal(other) { return other && other.key === k; },
            equalKey(other) { return other && other.key === k; },
        });
        const a = [child('a'), child('b')];
        const b = [child('a'), child('b')];
        const noOpCreateRate = (l, r) => ({
            l, r,
            children: [],
            setChildren(c) { this.children = c; },
            getChildren() { return this.children; },
        });
        const out = ComparePolicyUtils.compareChildren('FULL', a, b, noOpCreateRate);
        assert.equal(out.length, 2);
    });

    it('produces a rate for every child under LEFT_AND_RIGHT (non-merged)', () => {
        const a = [{ key: 'a' }];
        const b = [{ key: 'b' }];
        const noOpCreateRate = (l, r) => ({
            l, r,
            children: [],
            setChildren(c) { this.children = c; },
            getChildren() { return this.children; },
        });
        const out = ComparePolicyUtils.compareChildren('OTHER', a, b, noOpCreateRate);
        assert.equal(out.length, 2);
    });
});
