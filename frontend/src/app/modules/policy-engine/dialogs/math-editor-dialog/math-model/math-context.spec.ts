import { ComputeEngine } from '@cortex-js/compute-engine';
import { getList, getString, getNumber, registerCEFunctions } from './math-context';

function makeTestCe(): ComputeEngine {
    const ce = new ComputeEngine();
    registerCEFunctions(ce);
    return ce;
}

// ─── getList ──────────────────────────────────────────────────────────────────
describe('getList', () => {
    it('returns [] for undefined', () => {
        expect(getList(undefined)).toEqual([]);
    });

    it('returns [] for null', () => {
        expect(getList(null)).toEqual([]);
    });

    it('returns expr.ops when present', () => {
        const ops = [1, 2, 3];
        expect(getList({ ops })).toBe(ops);
    });

    it('collects items via expr.each() when ops is absent', () => {
        const items = [10, 20, 30];
        let i = 0;
        const mock = {
            each: () => ({
                next: () => i < items.length
                    ? { done: false as const, value: items[i++] }
                    : { done: true  as const, value: undefined }
            })
        };
        expect(getList(mock)).toEqual([10, 20, 30]);
    });

    it('returns [] when each() returns null', () => {
        expect(getList({ each: () => null })).toEqual([]);
    });
});

// ─── getString ────────────────────────────────────────────────────────────────
describe('getString', () => {
    it('returns null for undefined', () => {
        expect(getString(undefined)).toBeNull();
    });

    it('returns expr.string when present', () => {
        expect(getString({ string: 'hello' })).toBe('hello');
    });

    it('returns expr.value when it is a string', () => {
        expect(getString({ value: 'world' })).toBe('world');
    });

    it('coerces numeric value to string', () => {
        expect(getString({ value: 5 })).toBe('5');
    });

    it('returns expr.symbol when present', () => {
        expect(getString({ symbol: 'x' })).toBe('x');
    });

    it('returns null when no recognised field', () => {
        expect(getString({ ops: [] })).toBeNull();
    });

    it('string field takes precedence over value', () => {
        expect(getString({ string: 'from-string', value: 'from-value' })).toBe('from-string');
    });
});

// ─── getNumber ────────────────────────────────────────────────────────────────
describe('getNumber', () => {
    it('returns expr.value when numeric', () => {
        expect(getNumber({ value: 42 })).toBe(42);
    });

    it('returns 0 for undefined', () => {
        expect(getNumber(undefined)).toBe(0);
    });

    it('returns 0 when value is not a number', () => {
        expect(getNumber({ value: 'text' })).toBe(0);
    });

    it('returns 0 for null', () => {
        expect(getNumber(null)).toBe(0);
    });
});

// ─── CE integration helpers ───────────────────────────────────────────────────
function numList(ce: ComputeEngine, nums: number[]) {
    return ce.box(['List', ...nums.map(n => ce.number(n))]);
}
function strList(ce: ComputeEngine, strs: string[]) {
    return ce.box(['List', ...strs.map(s => ce.string(s))]);
}
function call(ce: ComputeEngine, name: string, ...args: any[]) {
    return ce.box([name, ...args]).evaluate();
}

// ─── Lookup ───────────────────────────────────────────────────────────────────
describe('Lookup (CE integration)', () => {
    let ce: ComputeEngine;
    beforeEach(() => { ce = makeTestCe(); });

    it('returns the value at the matching key position', () => {
        const result = call(ce, 'Lookup',
            numList(ce, [10, 20, 30]),
            strList(ce, ['a', 'b', 'c']),
            ce.string('b'));
        expect(result.value).toBe(20);
    });

    it('returns NaN when key is not found', () => {
        const result = call(ce, 'Lookup',
            numList(ce, [10, 20]),
            strList(ce, ['a', 'b']),
            ce.string('z'));
        expect(Number.isNaN(result.value as number)).toBeTrue();
    });

    it('returns 0 when matched value is not numeric', () => {
        const result = call(ce, 'Lookup',
            ce.box(['List', ce.string('not-a-number')]),
            strList(ce, ['k']),
            ce.string('k'));
        expect(result.value).toBe(0);
    });

    it('matches via numeric coercion: key 5 matches id "5"', () => {
        const result = call(ce, 'Lookup',
            numList(ce, [99]),
            ce.box(['List', ce.number(5)]),
            ce.string('5'));
        expect(result.value).toBe(99);
    });
});

// ─── LookupTwo ────────────────────────────────────────────────────────────────
describe('LookupTwo (CE integration)', () => {
    let ce: ComputeEngine;
    beforeEach(() => { ce = makeTestCe(); });

    it('returns value when both keys match', () => {
        const result = call(ce, 'LookupTwo',
            numList(ce, [10, 20, 30]),
            strList(ce, ['a', 'a', 'b']), ce.string('a'),
            strList(ce, ['x', 'y', 'y']), ce.string('y'));
        expect(result.value).toBe(20);
    });

    it('returns NaN when first key matches but second does not', () => {
        const result = call(ce, 'LookupTwo',
            numList(ce, [10, 20]),
            strList(ce, ['a', 'a']), ce.string('a'),
            strList(ce, ['x', 'x']), ce.string('y'));
        expect(Number.isNaN(result.value as number)).toBeTrue();
    });

    it('returns NaN when value and key array lengths differ', () => {
        const result = call(ce, 'LookupTwo',
            numList(ce, [10, 20]),
            strList(ce, ['a']),       ce.string('a'),
            strList(ce, ['x', 'y']), ce.string('x'));
        expect(Number.isNaN(result.value as number)).toBeTrue();
    });
});

// ─── LookupMin ────────────────────────────────────────────────────────────────
describe('LookupMin (CE integration)', () => {
    let ce: ComputeEngine;
    beforeEach(() => { ce = makeTestCe(); });

    it('returns the value whose sortKey is smallest', () => {
        // values [10,20,30], all keys 'a', sortKeys [3,1,2] → min sort=1 at index 1 → value 20
        const result = call(ce, 'LookupMin',
            numList(ce, [10, 20, 30]),
            strList(ce, ['a', 'a', 'a']),
            ce.string('a'),
            numList(ce, [3, 1, 2]));
        expect(result.value).toBe(20);
    });

    it('returns NaN when no key matches', () => {
        const result = call(ce, 'LookupMin',
            numList(ce, [10]),
            strList(ce, ['a']),
            ce.string('z'),
            numList(ce, [1]));
        expect(Number.isNaN(result.value as number)).toBeTrue();
    });
});

// ─── LookupMax ────────────────────────────────────────────────────────────────
describe('LookupMax (CE integration)', () => {
    let ce: ComputeEngine;
    beforeEach(() => { ce = makeTestCe(); });

    it('returns the value whose sortKey is largest', () => {
        // values [10,20,30], all keys 'a', sortKeys [3,1,2] → max sort=3 at index 0 → value 10
        const result = call(ce, 'LookupMax',
            numList(ce, [10, 20, 30]),
            strList(ce, ['a', 'a', 'a']),
            ce.string('a'),
            numList(ce, [3, 1, 2]));
        expect(result.value).toBe(10);
    });

    it('returns NaN when no key matches', () => {
        const result = call(ce, 'LookupMax',
            numList(ce, [10]),
            strList(ce, ['a']),
            ce.string('z'),
            numList(ce, [1]));
        expect(Number.isNaN(result.value as number)).toBeTrue();
    });
});

// ─── EqualString ─────────────────────────────────────────────────────────────
describe('EqualString (CE integration)', () => {
    let ce: ComputeEngine;
    beforeEach(() => { ce = makeTestCe(); });

    it('returns 1 for equal strings', () => {
        expect(call(ce, 'EqualString', ce.string('hello'), ce.string('hello')).value).toBe(1);
    });

    it('returns 0 for unequal strings', () => {
        expect(call(ce, 'EqualString', ce.string('foo'), ce.string('bar')).value).toBe(0);
    });

    it('coerces numeric 5 to "5" and matches string "5"', () => {
        expect(call(ce, 'EqualString', ce.number(5), ce.string('5')).value).toBe(1);
    });

    it('returns 0 when one side has no string representation', () => {
        // An empty List has no string/value/symbol → getString returns null
        expect(call(ce, 'EqualString', ce.box(['List']), ce.string('a')).value).toBe(0);
    });
});
