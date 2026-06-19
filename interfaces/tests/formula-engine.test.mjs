import assert from 'node:assert/strict';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

// Minimal stub so we don't pull in mathjs just to test the wrapper logic.
function makeStubEngine() {
    return {
        callsTo: { evaluate: [] },
        evaluate(expr, scope) {
            this.callsTo.evaluate.push({ expr, scope });
            // toy evaluator: only handles `a + b` style numerics from scope
            const m = /^([a-z]+)\s*\+\s*([a-z]+)$/i.exec(expr);
            if (m) return scope[m[1]] + scope[m[2]];
            if (expr === 'BOOM') throw new Error('engine boom');
            // numeric literal passthrough
            if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
            return expr;
        },
    };
}

describe('FormulaEngine.setMathEngine / evaluate', () => {
    it('throws when no math engine is set', () => {
        FormulaEngine.setMathEngine(undefined);
        assert.throws(() => FormulaEngine.evaluate('1+1', {}), /Math engine is not defined/);
    });

    it('forwards trimmed expression to the underlying engine', () => {
        const stub = makeStubEngine();
        FormulaEngine.setMathEngine(stub);
        const result = FormulaEngine.evaluate('  a + b  ', { a: 2, b: 3 });
        assert.equal(result, 5);
        assert.equal(stub.callsTo.evaluate[0].expr, 'a + b');
        assert.deepEqual(stub.callsTo.evaluate[0].scope, { a: 2, b: 3 });
    });

    it('strips a leading "=" before forwarding (spreadsheet-style formulas)', () => {
        const stub = makeStubEngine();
        FormulaEngine.setMathEngine(stub);
        const result = FormulaEngine.evaluate('= 4 + 6', { /* unused */ });
        // The leading "=" must be stripped — toy engine returns the literal expression text otherwise
        // Our stub matches `a + b` form via regex and returns NaN; numeric literal "4" alone won't match,
        // so we just check the expr passed in had no leading "=".
        assert.equal(stub.callsTo.evaluate[0].expr.startsWith('='), false);
    });

    it('returns "Incorrect formula" sentinel when the engine throws', () => {
        const stub = makeStubEngine();
        FormulaEngine.setMathEngine(stub);
        const out = FormulaEngine.evaluate('BOOM', {});
        assert.equal(out, 'Incorrect formula');
    });

    it('passes the scope reference through unchanged', () => {
        const stub = makeStubEngine();
        FormulaEngine.setMathEngine(stub);
        const scope = { a: 1, b: 2 };
        FormulaEngine.evaluate('a + b', scope);
        assert.strictEqual(stub.callsTo.evaluate[0].scope, scope);
    });

    it('replacing the math engine takes effect immediately', () => {
        const stub1 = makeStubEngine();
        const stub2 = makeStubEngine();
        FormulaEngine.setMathEngine(stub1);
        FormulaEngine.evaluate('a + b', { a: 1, b: 1 });
        assert.equal(stub1.callsTo.evaluate.length, 1);
        FormulaEngine.setMathEngine(stub2);
        FormulaEngine.evaluate('a + b', { a: 5, b: 5 });
        assert.equal(stub1.callsTo.evaluate.length, 1);
        assert.equal(stub2.callsTo.evaluate.length, 1);
    });
});
