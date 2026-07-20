import assert from 'node:assert/strict';
import { Expression } from '../../../dist/xlsx/models/expression.js';

describe('Expression construction', () => {
    it('captures name + formulae and starts with empty symbol/function/range maps', () => {
        const e = new Expression('SUM_A1_B2', 'A1+B2');
        assert.equal(e.name, 'SUM_A1_B2');
        assert.equal(e.formulae, 'A1+B2');
        assert.equal(e.symbols.size, 0);
        assert.equal(e.functions.size, 0);
        assert.equal(e.ranges.size, 0);
        assert.equal(e.transformed, undefined);
    });
});

describe('Expression.parse — symbols', () => {
    it('collects symbol-only formulae into the symbols Set', () => {
        const e = new Expression('eq', 'A1');
        e.parse();
        assert.deepEqual(Array.from(e.symbols).sort(), ['A1']);
    });

    it('collects every operand from a binary operator expression', () => {
        const e = new Expression('eq', 'A1+B2');
        e.parse();
        assert.deepEqual(Array.from(e.symbols).sort(), ['A1', 'B2']);
    });

    it('walks both sides of a chained operator expression', () => {
        const e = new Expression('eq', 'A1+B2-C3');
        e.parse();
        assert.deepEqual(Array.from(e.symbols).sort(), ['A1', 'B2', 'C3']);
    });
});

describe('Expression.parse — functions', () => {
    it('records the called function name and source template', () => {
        const e = new Expression('eq', 'add(A1, B2)');
        e.parse();
        assert.ok(e.functions.has('add'));
        const templates = e.functions.get('add');
        assert.equal(templates.length, 1);
        assert.ok(templates[0].includes('A1') && templates[0].includes('B2'));
    });

    it('walks function arguments and adds them to symbols', () => {
        const e = new Expression('eq', 'sum(A1, B2)');
        e.parse();
        assert.ok(e.symbols.has('A1'));
        assert.ok(e.symbols.has('B2'));
    });

    it('aggregates multiple invocations of the same function name', () => {
        const e = new Expression('eq', 'add(A1, B2) + add(C1, C2)');
        e.parse();
        assert.equal(e.functions.get('add').length, 2);
    });
});

describe('Expression.parse — ranges', () => {
    it('expands a vertical range A1:A3 into discrete cells', () => {
        const e = new Expression('eq', 'sum(A1:A3)');
        e.parse();
        assert.ok(e.ranges.has('A1_A3'));
        assert.deepEqual(e.ranges.get('A1_A3'), ['A1', 'A2', 'A3']);
    });

    it('orders cells from min to max row regardless of input order', () => {
        const e = new Expression('eq', 'sum(B5:B2)');
        e.parse();
        const key = Array.from(e.ranges.keys())[0];
        const cells = e.ranges.get(key);
        // mathjs.RangeNode preserves the input order in the key, but the
        // expanded list is always min->max.
        assert.deepEqual(cells, ['B2', 'B3', 'B4', 'B5']);
    });

    it('throws "Invalid range" when columns differ', () => {
        const e = new Expression('eq', 'sum(A1:B3)');
        assert.throws(() => e.parse(), /Invalid range/);
    });
});

describe('Expression.parse — transformed', () => {
    it('rewrites range nodes to symbol nodes (start_end)', () => {
        const e = new Expression('eq', 'sum(A1:A3)');
        e.parse();
        assert.ok(typeof e.transformed === 'string');
        assert.ok(e.transformed.includes('A1_A3'));
        assert.ok(!e.transformed.includes(':'));
    });

    it('leaves a non-range formula textually equivalent', () => {
        const e = new Expression('eq', 'A1 + B2');
        e.parse();
        // mathjs may normalise spacing — check the cells survive.
        assert.ok(e.transformed.includes('A1'));
        assert.ok(e.transformed.includes('B2'));
        assert.ok(!e.transformed.includes(':'));
    });
});
