import { assert } from 'chai';
import { Expression } from '../../../dist/xlsx/models/expression.js';

describe('Expression constructor', () => {
    it('captures name and formulae verbatim', () => {
        const e = new Expression('B7', 'A1+A2');
        assert.equal(e.name, 'B7');
        assert.equal(e.formulae, 'A1+A2');
    });

    it('starts with empty symbols/functions/ranges', () => {
        const e = new Expression('B1', '0');
        assert.equal(e.symbols.size, 0);
        assert.equal(e.functions.size, 0);
        assert.equal(e.ranges.size, 0);
    });
});

describe('Expression.parse — symbols', () => {
    it('collects all referenced symbols', () => {
        const e = new Expression('C1', 'A1 + B2 - C3');
        e.parse();
        assert.includeMembers([...e.symbols], ['A1', 'B2', 'C3']);
    });

    it('deduplicates repeated symbols', () => {
        const e = new Expression('C1', 'A1 + A1 + A1');
        e.parse();
        const syms = [...e.symbols];
        assert.equal(syms.filter((s) => s === 'A1').length, 1);
    });

    it('records no symbols for a pure literal expression', () => {
        const e = new Expression('C1', '1 + 2');
        e.parse();
        assert.equal(e.symbols.size, 0);
    });
});

describe('Expression.parse — functions', () => {
    it('records function calls and their formulae', () => {
        const e = new Expression('C1', 'SUM(A1, A2)');
        e.parse();
        const sum = e.functions.get('SUM');
        assert.isArray(sum);
        assert.equal(sum.length, 1);
    });

    it('captures multiple invocations of the same function', () => {
        const e = new Expression('C1', 'MAX(A1, A2) + MAX(B1, B2)');
        e.parse();
        const maxes = e.functions.get('MAX');
        assert.equal(maxes.length, 2);
    });

    it('descends into function arguments to collect their symbols', () => {
        const e = new Expression('C1', 'SUM(A1, B2)');
        e.parse();
        assert.isTrue(e.symbols.has('A1'));
        assert.isTrue(e.symbols.has('B2'));
    });
});

describe('Expression.parse — ranges', () => {
    it('expands a vertical range into the column cells', () => {
        const e = new Expression('C1', 'SUM(A1:A4)');
        e.parse();
        const cells = e.ranges.get('A1_A4');
        assert.deepEqual(cells, ['A1', 'A2', 'A3', 'A4']);
    });

    it('rewrites a range node into a SymbolNode (start_end) in the transformed expression', () => {
        const e = new Expression('C1', 'SUM(A1:A4)');
        e.parse();
        // The transformed string should reference the synthesised symbol "A1_A4"
        assert.match(e.transformed, /A1_A4/);
    });

    it('handles a reversed range (A5:A2) as the same symbol', () => {
        const e = new Expression('C1', 'SUM(A5:A2)');
        e.parse();
        const cells = e.ranges.get('A5_A2');
        assert.deepEqual(cells, ['A2', 'A3', 'A4', 'A5']);
    });

    it('throws "Invalid range" when start and end columns differ', () => {
        const e = new Expression('C1', 'SUM(A1:B4)');
        assert.throws(() => e.parse(), /Invalid range/);
    });
});

describe('Expression.parse — transformed', () => {
    it('preserves a literal expression', () => {
        const e = new Expression('C1', '1 + 2');
        e.parse();
        // mathjs may insert/normalize whitespace, so just check the operator + operands are present
        assert.match(e.transformed, /1\s*\+\s*2/);
    });
});
