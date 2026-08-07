import assert from 'node:assert/strict';
import { CSV } from '../../dist/analytics/compare/table/csv.js';
import { CompareUtils } from '../../dist/analytics/compare/utils/utils.js';

describe('analytics CSV', () => {
    it('starts with the documented data-uri header and no separator', () => {
        const csv = new CSV();
        assert.equal(csv.result(), 'data:text/csv;charset=utf-8;');
    });

    it('quotes values and inserts comma separators between cells', () => {
        const csv = new CSV();
        csv.add('a').add('b').add('c');
        assert.ok(csv.result().endsWith('"a","b","c"'));
    });

    it('emits empty quotes for undefined cells', () => {
        const csv = new CSV();
        csv.add(undefined).add('x');
        assert.ok(csv.result().endsWith('"",\"x"'));
    });

    it('addLine() appends CRLF and resets the separator', () => {
        const csv = new CSV();
        csv.add('a').addLine().add('b');
        const result = csv.result();
        assert.ok(/"a"\r\n"b"$/.test(result));
    });

    it('clear() resets the buffer back to the empty state', () => {
        const csv = new CSV();
        csv.add('x').addLine().add('y');
        csv.clear();
        assert.equal(csv.result(), 'data:text/csv;charset=utf-8;');
    });

    it('chains fluently — every method returns this', () => {
        const csv = new CSV();
        const chained = csv.add('a').addLine().add('b');
        assert.equal(chained, csv);
    });
});

describe('CompareUtils.calcRate', () => {
    it('returns 100 for an empty array', () => {
        assert.equal(CompareUtils.calcRate([]), 100);
    });

    it('averages totalRate across positive entries', () => {
        const rates = [{ totalRate: 80 }, { totalRate: 60 }, { totalRate: 40 }];
        assert.equal(CompareUtils.calcRate(rates), 60);
    });

    it('treats negative totalRate as 0 (clamping behavior)', () => {
        const rates = [{ totalRate: -5 }, { totalRate: 100 }];
        assert.equal(CompareUtils.calcRate(rates), 50);
    });

    it('floors the average', () => {
        const rates = [{ totalRate: 1 }, { totalRate: 2 }, { totalRate: 2 }];
        assert.equal(CompareUtils.calcRate(rates), 1);
    });

    it('caps the result at 100', () => {
        const rates = [{ totalRate: 999 }];
        assert.equal(CompareUtils.calcRate(rates), 100);
    });
});

describe('CompareUtils.calcTotalRate / calcTotalRates', () => {
    it('calcTotalRate floors the sum/count of variadic args', () => {
        assert.equal(CompareUtils.calcTotalRate(10, 20, 30), 20);
        assert.equal(CompareUtils.calcTotalRate(33, 33), 33);
    });

    it('calcTotalRates returns 100 for an empty array', () => {
        assert.equal(CompareUtils.calcTotalRates([]), 100);
    });

    it('calcTotalRates floors the average', () => {
        assert.equal(CompareUtils.calcTotalRates([10, 20, 30]), 20);
        assert.equal(CompareUtils.calcTotalRates([1, 2]), 1);
    });
});

describe('CompareUtils.total (bucketed averaging)', () => {
    it('returns 100 for an empty input', () => {
        assert.equal(CompareUtils.total([]), 100);
    });

    it('buckets each rate as 100 (>99), 50 (>50), or 0 (otherwise)', () => {
        const rates = [
            { totalRate: 100 }, // 100
            { totalRate: 75 },  // 50
            { totalRate: 30 },  // 0
            { totalRate: 51 },  // 50
        ];
        // (100 + 50 + 0 + 50) / 4 = 50
        assert.equal(CompareUtils.total(rates), 50);
    });

    it('returns 0 when every rate falls in the lowest bucket', () => {
        assert.equal(CompareUtils.total([{ totalRate: 0 }, { totalRate: 10 }]), 0);
    });
});

describe('CompareUtils.mapping', () => {
    const eqByName = { equal(other) { return other?.name === this.name; } };

    it('matches an unpaired left entry by .equal() and pairs it with the new item', () => {
        const left = { ...eqByName, name: 'a' };
        const list = [{ left, right: null }];
        const newItem = { ...eqByName, name: 'a' };
        CompareUtils.mapping(list, newItem);
        assert.equal(list.length, 1);
        assert.equal(list[0].right, newItem);
    });

    it('appends a new {left:null, right:item} entry when nothing matches', () => {
        const list = [];
        const item = { ...eqByName, name: 'unique' };
        CompareUtils.mapping(list, item);
        assert.equal(list.length, 1);
        assert.equal(list[0].left, null);
        assert.equal(list[0].right, item);
    });

    it('skips entries that are already paired (right is set)', () => {
        const left = { ...eqByName, name: 'a' };
        const right = { ...eqByName, name: 'a' };
        const list = [{ left, right }];
        const newItem = { ...eqByName, name: 'a' };
        CompareUtils.mapping(list, newItem);
        assert.equal(list.length, 2);
        assert.equal(list[1].left, null);
        assert.equal(list[1].right, newItem);
    });
});

describe('CompareUtils.aggregateHash', () => {
    it('returns a deterministic non-empty string', () => {
        const a = CompareUtils.aggregateHash('one', 'two', 'three');
        const b = CompareUtils.aggregateHash('one', 'two', 'three');
        assert.equal(a, b);
        assert.equal(typeof a, 'string');
        assert.ok(a.length > 0);
    });

    it('produces a different hash when an input differs', () => {
        const a = CompareUtils.aggregateHash('x', 'y');
        const b = CompareUtils.aggregateHash('x', 'z');
        assert.notEqual(a, b);
    });
});

describe('CompareUtils.sha256', () => {
    it('returns a deterministic non-empty string for the same input', () => {
        const a = CompareUtils.sha256('hello');
        const b = CompareUtils.sha256('hello');
        assert.equal(a, b);
        assert.ok(a.length > 0);
    });

    it('produces different hashes for different inputs', () => {
        assert.notEqual(CompareUtils.sha256('a'), CompareUtils.sha256('b'));
    });
});

describe('CompareUtils.tableToCsv', () => {
    it('writes only labelled columns and skips columns with no label', () => {
        const csv = new CSV();
        const table = {
            columns: [
                { name: 'a', label: 'A' },
                { name: 'b', label: '' },          // skipped
                { name: 'c', label: 'C' },
            ],
            report: [
                { a: '1', b: '2', c: '3' },
                { a: '4', b: '5', c: '6' },
            ],
        };
        CompareUtils.tableToCsv(csv, table);
        const out = csv.result();
        assert.ok(out.includes('"A","C"'));
        assert.ok(out.includes('"1","3"'));
        assert.ok(out.includes('"4","6"'));
        assert.ok(!out.includes('"2"'));
    });
});

describe('CompareUtils.objectToCsv', () => {
    it('emits the header row first', () => {
        const csv = CompareUtils.objectToCsv({});
        const out = csv.result();
        assert.ok(out.includes('"Index","Key","Value","Type"'));
    });

    it('records each scalar value with its type', () => {
        const csv = CompareUtils.objectToCsv({ a: 1, b: 'x', c: true });
        const out = csv.result();
        assert.ok(out.includes('"a"'));
        assert.ok(out.includes('"x"'));
        assert.ok(out.includes('"number"'));
        assert.ok(out.includes('"string"'));
        assert.ok(out.includes('"boolean"'));
    });
});
