import { ComputeEngine } from '@cortex-js/compute-engine';
import { getList, getString, getNumber, MathContext, registerCEFunctions } from './math-context';
import { DocumentMap } from './document-map';
import { FieldLink } from './field-link';
import { MathFormula } from './math-formula';

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

    it('returns 0 when key is not found', () => {
        const result = call(ce, 'Lookup',
            numList(ce, [10, 20]),
            strList(ce, ['a', 'b']),
            ce.string('z'));
        expect(result.value).toBe(0);
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

    it('returns 0 when first key matches but second does not', () => {
        const result = call(ce, 'LookupTwo',
            numList(ce, [10, 20]),
            strList(ce, ['a', 'a']), ce.string('a'),
            strList(ce, ['x', 'x']), ce.string('y'));
        expect(result.value).toBe(0);
    });

    it('returns 0 when value and key array lengths differ', () => {
        const result = call(ce, 'LookupTwo',
            numList(ce, [10, 20]),
            strList(ce, ['a']),       ce.string('a'),
            strList(ce, ['x', 'y']), ce.string('x'));
        expect(result.value).toBe(0);
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

    it('returns 0 when no key matches', () => {
        const result = call(ce, 'LookupMin',
            numList(ce, [10]),
            strList(ce, ['a']),
            ce.string('z'),
            numList(ce, [1]));
        expect(result.value).toBe(0);
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

    it('returns 0 when no key matches', () => {
        const result = call(ce, 'LookupMax',
            numList(ce, [10]),
            strList(ce, ['a']),
            ce.string('z'),
            numList(ce, [1]));
        expect(result.value).toBe(0);
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

describe('MathContext Table columns', () => {
    function link(name: string, path: string): FieldLink {
        const item = new FieldLink(name, path);
        item.schema = 'schema';
        item.update();
        return item;
    }

    function formula(name: string, body: string): MathFormula {
        const item = new MathFormula(name, body);
        item.update();
        return item;
    }

    function documents(document: any): DocumentMap {
        const result = new DocumentMap();
        result.addDocument({ schema: 'schema', document });
        return result;
    }

    function table(): any {
        return {
            type: 'table',
            columnKeys: ['year', 'area.total', 'factor', 'device'],
            columnNames: ['Year', 'Area', 'Factor', 'Device'],
            rows: [
                { year: '2020', 'area.total': '10', factor: '2', device: 'A' },
                { year: '2021', 'area.total': 'n/a', factor: '3', device: 'B' },
                { year: '2024', 'area.total': '50', factor: '2', device: 'C' }
            ]
        };
    }

    it('sums a declared column and reports numeric replacements', () => {
        const context = new MathContext([
            link('area', 'siteTable.area.total'),
            formula('total', '\\sum{\\operatorname{area}}')
        ]);

        const result = context.setDocument(documents({ siteTable: table() }));

        expect(result.scope.total).toBe(60);
        expect(result.scope.area).toEqual(['10', 'n/a', '50']);
        expect(context.getWarnings()).toEqual([
            'Table column "Area" replaced 1 nonnumeric cells with 0.'
        ]);
    });

    it('returns numbers and text from Table-only Lookup', () => {
        const context = new MathContext([
            link('area', 'siteTable.area.total'),
            link('year', 'siteTable.year'),
            link('device', 'siteTable.device'),
            formula('combined', '\\mathrm{Lookup}\\left(\\operatorname{area},\\operatorname{year},\\text{2020}\\right) + \\mathrm{Lookup}\\left(\\operatorname{area},\\operatorname{year},\\text{2024}\\right)'),
            formula('selected', '\\mathrm{Lookup}\\left(\\operatorname{device},\\operatorname{year},\\text{2021}\\right)')
        ]);

        const result = context.setDocument(documents({ siteTable: table() }));

        expect(result.scope.combined).toBe(60);
        expect(result.scope.selected).toBe('B');
        expect(context.getWarnings()).toEqual([]);
    });

    it('uses numeric Table values through At without losing row alignment', () => {
        const context = new MathContext([
            link('area', 'siteTable.area.total'),
            link('factor', 'siteTable.factor'),
            formula(
                'total',
                '\\sum_{i=1}^{\\operatorname{Length}\\left(\\operatorname{area}\\right)} '
                + '\\operatorname{At}\\left(\\operatorname{area},i\\right) '
                + '\\cdot \\operatorname{At}\\left(\\operatorname{factor},i\\right)'
            )
        ]);

        const result = context.setDocument(documents({ siteTable: table() }));

        expect(result.scope.total).toBe(120);
        expect(result.scope.area.length).toBe(3);
        expect(context.getWarnings()).toEqual([
            'Table column "Area" replaced 1 nonnumeric cells with 0.'
        ]);
    });

    it('uses Table columns inside function formulas', () => {
        const context = new MathContext([
            link('area', 'siteTable.area.total'),
            link('year', 'siteTable.year'),
            formula('scaled(k)', 'k \\cdot \\sum{\\operatorname{area}}'),
            formula('pick(y)', '\\mathrm{Lookup}\\left(\\operatorname{area},\\operatorname{year},y\\right)')
        ]);

        context.setDocument(documents({ siteTable: table() }));
        const formulas = context.getContext().formulas;

        expect(formulas.scaled(2)).toBe(120);
        expect(formulas.pick('2024')).toBe(50);
        expect(context.getWarnings()).toEqual([
            'Table column "Area" replaced 1 nonnumeric cells with 0.'
        ]);
    });

    it('keeps ordinary formula behavior when a Table column is present', () => {
        const context = new MathContext([
            link('year', 'siteTable.year'),
            link('ordinary', 'ordinary'),
            link('keys', 'keys'),
            formula('total', '\\sum{\\operatorname{ordinary}}'),
            formula('matched', '\\mathrm{Lookup}\\left(\\operatorname{ordinary},\\operatorname{keys},\\text{b}\\right)')
        ]);

        const result = context.setDocument(documents({
            siteTable: table(),
            ordinary: [4, 5],
            keys: ['a', 'b']
        }));

        expect(result.scope.total).toBe(9);
        expect(result.scope.matched).toBe(5);
        expect(context.getWarnings()).toEqual([]);
    });

    it('rejects a declared column above the shared row limit', () => {
        const context = new MathContext([link('area', 'siteTable.area.total')]);
        const value = table();
        value.rows = Array.from({ length: 10001 }, (_, index) => ({
            'area.total': String(index)
        }));

        expect(() => context.setDocument(documents({ siteTable: value }))).toThrowError(
            /Table column "Area" has 10001 rows; General formulas are limited to 10000/
        );
    });
});
