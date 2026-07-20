import assert from 'node:assert/strict';
import { RateMap, RateKeyMap } from '../../dist/analytics/compare/utils/rate-map.js';

const eqByKey = (key) => ({ key, equal(o) { return o?.key === key; } });

describe('RateMap', () => {
    it('starts empty', () => {
        const rm = new RateMap();
        assert.deepEqual(rm.getList(), []);
    });

    it('addLeft pushes a {left, right:null} entry', () => {
        const rm = new RateMap();
        const l = eqByKey('a');
        rm.addLeft(l);
        const [row] = rm.getList();
        assert.equal(row.left, l);
        assert.equal(row.right, null);
    });

    it('addRight pairs with an existing left when CompareUtils.mapping matches', () => {
        const rm = new RateMap();
        const l = eqByKey('match');
        const r = eqByKey('match');
        rm.addLeft(l);
        rm.addRight(r);
        const list = rm.getList();
        assert.equal(list.length, 1);
        assert.equal(list[0].right, r);
    });

    it('addRight appends a {left:null, right} entry when nothing matches', () => {
        const rm = new RateMap();
        rm.addLeft(eqByKey('a'));
        rm.addRight(eqByKey('b'));
        const list = rm.getList();
        assert.equal(list.length, 2);
        assert.equal(list[1].left, null);
        assert.equal(list[1].right.key, 'b');
    });

    it('push() and unshift() add items to the back/front', () => {
        const rm = new RateMap();
        rm.push({ left: 'a', right: null });
        rm.push({ left: 'b', right: null });
        rm.unshift({ left: 'c', right: null });
        const list = rm.getList();
        assert.deepEqual(list.map((r) => r.left), ['c', 'a', 'b']);
    });

    it('sort() reorders the underlying list with a compareFn', () => {
        const rm = new RateMap();
        rm.push({ left: 'b', right: null });
        rm.push({ left: 'a', right: null });
        rm.push({ left: 'c', right: null });
        rm.sort((a, b) => (a.left < b.left ? -1 : 1));
        const list = rm.getList();
        assert.deepEqual(list.map((r) => r.left), ['a', 'b', 'c']);
    });
});

describe('RateKeyMap', () => {
    it('starts empty', () => {
        const m = new RateKeyMap();
        assert.deepEqual(m.getList(), []);
    });

    it('addLeft creates a new entry with the supplied key', () => {
        const m = new RateKeyMap();
        m.addLeft('k1', { v: 1 });
        const [row] = m.getList();
        assert.deepEqual(row.left, { v: 1 });
        assert.equal(row.right, null);
    });

    it('addRight attaches to an existing left entry under the same key', () => {
        const m = new RateKeyMap();
        m.addLeft('k1', { v: 'left' });
        m.addRight('k1', { v: 'right' });
        const [row] = m.getList();
        assert.deepEqual(row.left, { v: 'left' });
        assert.deepEqual(row.right, { v: 'right' });
    });

    it('addRight creates a new {left:null, right} entry when key is unknown', () => {
        const m = new RateKeyMap();
        m.addRight('orphan', { v: 9 });
        const [row] = m.getList();
        assert.equal(row.left, null);
        assert.deepEqual(row.right, { v: 9 });
    });

    it('preserves insertion order across multiple keys', () => {
        const m = new RateKeyMap();
        m.addLeft('a', 1);
        m.addLeft('b', 2);
        m.addRight('c', 3);
        const list = m.getList();
        assert.equal(list.length, 3);
        assert.equal(list[0].left, 1);
        assert.equal(list[1].left, 2);
        assert.equal(list[2].right, 3);
    });

    it('unshift inserts the key at the front of the order', () => {
        const m = new RateKeyMap();
        m.addLeft('a', 1);
        m.unshift('z', { left: 'first', right: null });
        const list = m.getList();
        assert.equal(list[0].left, 'first');
        assert.equal(list[1].left, 1);
    });

    it('push appends an arbitrary IRateMap entry under a new key', () => {
        const m = new RateKeyMap();
        m.push('k1', { left: 'L', right: 'R' });
        const list = m.getList();
        assert.equal(list.length, 1);
        assert.equal(list[0].left, 'L');
        assert.equal(list[0].right, 'R');
    });

    it('sort() reorders by the keys array', () => {
        const m = new RateKeyMap();
        m.addLeft('b', 2);
        m.addLeft('a', 1);
        m.addLeft('c', 3);
        m.sort();
        const list = m.getList();
        assert.deepEqual(list.map((r) => r.left), [1, 2, 3]);
    });
});
