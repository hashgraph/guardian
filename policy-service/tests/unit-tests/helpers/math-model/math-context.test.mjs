import 'module-alias/register.js';

import { assert } from 'chai';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
    getList,
    getString,
    getNumber,
    registerCEFunctions,
} from '../../../../dist/policy-engine/helpers/math-model/math-context.js';

function makeTestCe() {
    const ce = new ComputeEngine();
    registerCEFunctions(ce);
    return ce;
}

// ─── CE call helper ───────────────────────────────────────────────────────────
function call(ce, name, ...args) {
    return ce.box([name, ...args]).evaluate();
}
function numList(ce, nums) {
    return ce.box(['List', ...nums.map(n => ce.number(n))]);
}
function strList(ce, strs) {
    return ce.box(['List', ...strs.map(s => ce.string(s))]);
}

// ─── getList ──────────────────────────────────────────────────────────────────
describe('getList', function () {
    it('returns [] for undefined', function () {
        assert.deepEqual(getList(undefined), []);
    });

    it('returns [] for null', function () {
        assert.deepEqual(getList(null), []);
    });

    it('returns expr.ops when present', function () {
        const ops = [1, 2, 3];
        assert.strictEqual(getList({ ops }), ops);
    });

    it('collects items via expr.each() when ops is absent', function () {
        const items = [10, 20, 30];
        let i = 0;
        const mock = {
            each: () => ({
                next: () => i < items.length
                    ? { done: false, value: items[i++] }
                    : { done: true,  value: undefined }
            })
        };
        assert.deepEqual(getList(mock), [10, 20, 30]);
    });

    it('returns [] when each() returns null', function () {
        assert.deepEqual(getList({ each: () => null }), []);
    });
});

// ─── getString ────────────────────────────────────────────────────────────────
describe('getString', function () {
    it('returns null for undefined', function () {
        assert.isNull(getString(undefined));
    });

    it('returns expr.string when present', function () {
        assert.strictEqual(getString({ string: 'hello' }), 'hello');
    });

    it('returns expr.value when it is a string', function () {
        assert.strictEqual(getString({ value: 'world' }), 'world');
    });

    it('coerces numeric value to string', function () {
        assert.strictEqual(getString({ value: 5 }), '5');
    });

    it('returns expr.symbol when present', function () {
        assert.strictEqual(getString({ symbol: 'x' }), 'x');
    });

    it('returns null when no recognised field', function () {
        assert.isNull(getString({ ops: [] }));
    });

    it('string field takes precedence over value', function () {
        assert.strictEqual(getString({ string: 'from-string', value: 'from-value' }), 'from-string');
    });
});

// ─── getNumber ────────────────────────────────────────────────────────────────
describe('getNumber', function () {
    it('returns expr.value when numeric', function () {
        assert.strictEqual(getNumber({ value: 42 }), 42);
    });

    it('returns 0 for undefined', function () {
        assert.strictEqual(getNumber(undefined), 0);
    });

    it('returns 0 when value is not a number', function () {
        assert.strictEqual(getNumber({ value: 'text' }), 0);
    });

    it('returns 0 for null', function () {
        assert.strictEqual(getNumber(null), 0);
    });
});

// ─── Lookup ───────────────────────────────────────────────────────────────────
describe('Lookup (CE integration)', function () {
    let ce;
    beforeEach(function () { ce = makeTestCe(); });

    it('returns the value at the matching key position', function () {
        const result = call(ce, 'Lookup',
            numList(ce, [10, 20, 30]),
            strList(ce, ['a', 'b', 'c']),
            ce.string('b'));
        assert.strictEqual(result.value, 20);
    });

    it('returns NaN when key is not found', function () {
        const result = call(ce, 'Lookup',
            numList(ce, [10, 20]),
            strList(ce, ['a', 'b']),
            ce.string('z'));
        assert.isNaN(result.value);
    });

    it('returns 0 when matched value is not numeric', function () {
        const result = call(ce, 'Lookup',
            ce.box(['List', ce.string('not-a-number')]),
            strList(ce, ['k']),
            ce.string('k'));
        assert.isNaN(result.value);
    });

    it('matches via numeric coercion: numeric key 5 matches id "5"', function () {
        const result = call(ce, 'Lookup',
            numList(ce, [99]),
            ce.box(['List', ce.number(5)]),
            ce.string('5'));
        assert.strictEqual(result.value, 99);
    });
});

// ─── LookupTwo ────────────────────────────────────────────────────────────────
describe('LookupTwo (CE integration)', function () {
    let ce;
    beforeEach(function () { ce = makeTestCe(); });

    it('returns value when both keys match', function () {
        const result = call(ce, 'LookupTwo',
            numList(ce, [10, 20, 30]),
            strList(ce, ['a', 'a', 'b']), ce.string('a'),
            strList(ce, ['x', 'y', 'y']), ce.string('y'));
        assert.strictEqual(result.value, 20);
    });

    it('returns NaN when first key matches but second does not', function () {
        const result = call(ce, 'LookupTwo',
            numList(ce, [10, 20]),
            strList(ce, ['a', 'a']), ce.string('a'),
            strList(ce, ['x', 'x']), ce.string('y'));
        assert.isNaN(result.value);
    });

    it('returns NaN when array lengths differ', function () {
        const result = call(ce, 'LookupTwo',
            numList(ce, [10, 20]),
            strList(ce, ['a']),       ce.string('a'),
            strList(ce, ['x', 'y']), ce.string('x'));
        assert.isNaN(result.value);
    });
});

// ─── LookupMin ────────────────────────────────────────────────────────────────
describe('LookupMin (CE integration)', function () {
    let ce;
    beforeEach(function () { ce = makeTestCe(); });

    it('returns the value whose sortKey is smallest', function () {
        // values [10,20,30], all keys 'a', sortKeys [3,1,2] → min sort=1 at index 1 → value 20
        const result = call(ce, 'LookupMin',
            numList(ce, [10, 20, 30]),
            strList(ce, ['a', 'a', 'a']),
            ce.string('a'),
            numList(ce, [3, 1, 2]));
        assert.strictEqual(result.value, 20);
    });

    it('returns NaN when no key matches', function () {
        const result = call(ce, 'LookupMin',
            numList(ce, [10]),
            strList(ce, ['a']),
            ce.string('z'),
            numList(ce, [1]));
        assert.isNaN(result.value);
    });
});

// ─── LookupMax ────────────────────────────────────────────────────────────────
describe('LookupMax (CE integration)', function () {
    let ce;
    beforeEach(function () { ce = makeTestCe(); });

    it('returns the value whose sortKey is largest', function () {
        // values [10,20,30], all keys 'a', sortKeys [3,1,2] → max sort=3 at index 0 → value 10
        const result = call(ce, 'LookupMax',
            numList(ce, [10, 20, 30]),
            strList(ce, ['a', 'a', 'a']),
            ce.string('a'),
            numList(ce, [3, 1, 2]));
        assert.strictEqual(result.value, 10);
    });

    it('returns NaN when no key matches', function () {
        const result = call(ce, 'LookupMax',
            numList(ce, [10]),
            strList(ce, ['a']),
            ce.string('z'),
            numList(ce, [1]));
        assert.isNaN(result.value);
    });
});

// ─── EqualString ─────────────────────────────────────────────────────────────
describe('EqualString (CE integration)', function () {
    let ce;
    beforeEach(function () { ce = makeTestCe(); });

    it('returns 1 for equal strings', function () {
        assert.strictEqual(call(ce, 'EqualString', ce.string('hello'), ce.string('hello')).value, 1);
    });

    it('returns 0 for unequal strings', function () {
        assert.strictEqual(call(ce, 'EqualString', ce.string('foo'), ce.string('bar')).value, 0);
    });

    it('coerces numeric 5 to "5" — matches string "5"', function () {
        assert.strictEqual(call(ce, 'EqualString', ce.number(5), ce.string('5')).value, 1);
    });

    it('returns 0 when one operand has no string representation', function () {
        // An empty List has no string/value/symbol → getString returns null
        assert.strictEqual(call(ce, 'EqualString', ce.box(['List']), ce.string('a')).value, 0);
    });
});
