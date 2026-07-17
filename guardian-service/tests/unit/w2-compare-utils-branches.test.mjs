import assert from 'node:assert/strict';
import { CompareUtils } from '../../dist/analytics/compare/utils/utils.js';
import { Hash3, Sha256 } from '../../dist/analytics/compare/hash/utils.js';
import { BlockModel } from '../../dist/analytics/compare/models/block.model.js';
import { BlockToolModel } from '../../dist/analytics/compare/models/block-tool.model.js';

describe('CompareUtils.equal', () => {
    it('delegates to item.equal when present', () => {
        const a = { equal: (other) => other === 'TARGET' };
        assert.equal(CompareUtils.equal(a, 'TARGET'), true);
        assert.equal(CompareUtils.equal(a, 'OTHER'), false);
    });

    it('falls back to identity when no equal method', () => {
        assert.equal(CompareUtils.equal(5, 5), true);
        assert.equal(CompareUtils.equal(5, 6), false);
    });

    it('object identity fallback', () => {
        const x = {};
        assert.equal(CompareUtils.equal(x, x), true);
        assert.equal(CompareUtils.equal({}, {}), false);
    });
});

describe('CompareUtils.mapping', () => {
    it('appends a right-only entry for an unmatched item', () => {
        const list = [];
        CompareUtils.mapping(list, { equal: () => false });
        assert.equal(list.length, 1);
        assert.equal(list[0].left, null);
    });

    it('attaches to an existing left when equal and right empty', () => {
        const item = 'A';
        const left = { equal: (o) => o === 'A' };
        const list = [{ left, right: null }];
        CompareUtils.mapping(list, item);
        assert.equal(list[0].right, 'A');
        assert.equal(list.length, 1);
    });

    it('does not overwrite an already-filled right slot', () => {
        const left = { equal: () => true };
        const list = [{ left, right: 'OLD' }];
        CompareUtils.mapping(list, 'NEW');
        assert.equal(list[0].right, 'OLD');
        assert.equal(list.length, 2);
    });
});

describe('CompareUtils.calcRate', () => {
    it('empty list returns 100', () => {
        assert.equal(CompareUtils.calcRate([]), 100);
    });

    it('averages positive totalRates and floors', () => {
        assert.equal(CompareUtils.calcRate([{ totalRate: 50 }, { totalRate: 75 }]), 62);
    });

    it('ignores non-positive totalRates in the sum', () => {
        assert.equal(CompareUtils.calcRate([{ totalRate: 100 }, { totalRate: -1 }]), 50);
    });

    it('caps at 100', () => {
        assert.equal(CompareUtils.calcRate([{ totalRate: 200 }]), 100);
    });

    it('treats all-negative as 0 (floor of 0/n), bounded to -1 minimum', () => {
        assert.equal(CompareUtils.calcRate([{ totalRate: -5 }, { totalRate: -3 }]), 0);
    });
});

describe('CompareUtils.calcTotalRate / calcTotalRates', () => {
    it('calcTotalRate averages varargs', () => {
        assert.equal(CompareUtils.calcTotalRate(100, 50), 75);
    });

    it('calcTotalRate single value', () => {
        assert.equal(CompareUtils.calcTotalRate(80), 80);
    });

    it('calcTotalRate floors fractional result', () => {
        assert.equal(CompareUtils.calcTotalRate(100, 100, 50), 83);
    });

    it('calcTotalRates empty returns 100', () => {
        assert.equal(CompareUtils.calcTotalRates([]), 100);
    });

    it('calcTotalRates averages and floors', () => {
        assert.equal(CompareUtils.calcTotalRates([10, 20, 35]), 21);
    });
});

describe('CompareUtils.total', () => {
    it('empty returns 100', () => {
        assert.equal(CompareUtils.total([]), 100);
    });

    it('bins >99 to 100', () => {
        assert.equal(CompareUtils.total([{ totalRate: 100 }]), 100);
    });

    it('bins 51..99 to 50', () => {
        assert.equal(CompareUtils.total([{ totalRate: 60 }]), 50);
    });

    it('bins <=50 to 0', () => {
        assert.equal(CompareUtils.total([{ totalRate: 40 }]), 0);
    });

    it('mixed bins average and floor', () => {
        assert.equal(CompareUtils.total([{ totalRate: 100 }, { totalRate: 60 }, { totalRate: 10 }]), 50);
    });
});

describe('CompareUtils.compareSchemas', () => {
    const schema = (cmpMap) => ({ compare: (other) => cmpMap.get(other) });

    it('returns 0 when either side empty', () => {
        assert.equal(CompareUtils.compareSchemas([], [{}]), 0);
        assert.equal(CompareUtils.compareSchemas([{}], []), 0);
        assert.equal(CompareUtils.compareSchemas(null, [{}]), 0);
    });

    it('single vs single delegates directly to compare', () => {
        const b = {};
        const a = { compare: (x) => (x === b ? 88 : 0) };
        assert.equal(CompareUtils.compareSchemas([a], [b]), 88);
    });

    it('many-to-many returns the best-min match', () => {
        const r1 = {};
        const r2 = {};
        const l1 = { compare: (x) => (x === r1 ? 90 : 10) };
        const l2 = { compare: (x) => (x === r2 ? 95 : 20) };
        const result = CompareUtils.compareSchemas([l1, l2], [r1, r2]);
        assert.equal(result, 90);
    });
});

describe('CompareUtils.createBlockModel / createToolModel', () => {
    it('builds a BlockToolModel for blockType tool', () => {
        const m = CompareUtils.createBlockModel({ blockType: 'tool', tag: 't' }, 0);
        assert.ok(m instanceof BlockToolModel);
    });

    it('builds a BlockModel with nested children', () => {
        const json = {
            blockType: 'interfaceContainerBlock',
            tag: 'root',
            children: [
                { blockType: 'buttonBlock', tag: 'c1' },
                { blockType: 'buttonBlock', tag: 'c2' },
            ],
        };
        const m = CompareUtils.createBlockModel(json, 0);
        assert.ok(m instanceof BlockModel);
        assert.equal(m.children.length, 2);
    });

    it('createToolModel always builds a BlockModel root', () => {
        const m = CompareUtils.createToolModel({ blockType: 'tool', tag: 'root', children: [{ blockType: 'buttonBlock', tag: 'x' }] }, 0);
        assert.ok(m instanceof BlockModel);
        assert.equal(m.children.length, 1);
    });

    it('block with no children array has zero children', () => {
        const m = CompareUtils.createBlockModel({ blockType: 'buttonBlock', tag: 'x' }, 0);
        assert.equal(m.children.length, 0);
    });
});

describe('CompareUtils hashes', () => {
    it('aggregateHash is deterministic for the same args', () => {
        assert.equal(CompareUtils.aggregateHash('a', 'b'), CompareUtils.aggregateHash('a', 'b'));
    });

    it('aggregateHash differs for different args', () => {
        assert.notEqual(CompareUtils.aggregateHash('a', 'b'), CompareUtils.aggregateHash('b', 'a'));
    });

    it('sha256 returns a base58 string', () => {
        const h = CompareUtils.sha256('hello');
        assert.equal(typeof h, 'string');
        assert.ok(h.length > 0);
    });

    it('sha256 deterministic', () => {
        assert.equal(CompareUtils.sha256('x'), CompareUtils.sha256('x'));
    });
});

describe('Hash3', () => {
    it('chains add/hash and returns string result', () => {
        const h = new Hash3();
        const r = h.add('a').hash('b').result();
        assert.equal(typeof r, 'string');
    });

    it('clear resets to a fresh empty-state hash', () => {
        const a = new Hash3().add('x').result();
        const b = new Hash3().add('y').clear().add('x').result();
        assert.equal(a, b);
    });

    it('coerces non-strings via String()', () => {
        const a = new Hash3().add(123).result();
        const b = new Hash3().add('123').result();
        assert.equal(a, b);
    });

    it('different input yields different hash', () => {
        assert.notEqual(new Hash3().add('a').result(), new Hash3().add('b').result());
    });

    it('static aggregate is deterministic', () => {
        assert.equal(Hash3.aggregate('a', 'b'), Hash3.aggregate('a', 'b'));
    });
});

describe('Sha256', () => {
    it('hash returns a string for input', () => {
        assert.equal(typeof Sha256.hash('data'), 'string');
    });

    it('hash tolerates empty/falsy input', () => {
        assert.equal(typeof Sha256.hash(''), 'string');
        assert.equal(typeof Sha256.hash(null), 'string');
    });

    it('base58 returns a non-empty encoded string', () => {
        const r = Sha256.base58('payload');
        assert.equal(typeof r, 'string');
        assert.ok(r.length > 0);
    });

    it('base58 deterministic for the same input', () => {
        assert.equal(Sha256.base58('p'), Sha256.base58('p'));
    });

    it('base58 returns empty string on bad input (catch branch)', () => {
        assert.equal(Sha256.base58(undefined), '');
    });
});
