import assert from 'node:assert/strict';
import { TimeoutError } from '../dist/errors/timeout.error.js';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

describe('TimeoutError', () => {
    it('extends Error', () => {
        const err = new TimeoutError('boom');
        assert.ok(err instanceof Error);
        assert.equal(err.message, 'boom');
    });

    it('exposes isTimeoutError=true marker', () => {
        const err = new TimeoutError('x');
        assert.equal(err.isTimeoutError, true);
    });

    it("can be distinguished from a plain Error via the marker", () => {
        const t = new TimeoutError('a');
        const e = new Error('b');
        assert.equal(t.isTimeoutError, true);
        assert.equal(e.isTimeoutError, undefined);
    });
});

describe('interfaces FormulaEngine', () => {
    afterEach(() => FormulaEngine.setMathEngine(null));

    it('throws when no math engine has been registered', () => {
        FormulaEngine.setMathEngine(null);
        assert.throws(() => FormulaEngine.evaluate('1+1', {}), /Math engine is not defined/);
    });

    it("returns 'Incorrect formula' when the engine throws", () => {
        FormulaEngine.setMathEngine({ evaluate: () => { throw new Error('bad'); } });
        assert.equal(FormulaEngine.evaluate('oops', {}), 'Incorrect formula');
    });

    it('strips leading "=" before evaluating', () => {
        let captured = '';
        FormulaEngine.setMathEngine({
            evaluate(formula) { captured = formula; return 7; },
        });
        assert.equal(FormulaEngine.evaluate('= 2 + 5', {}), 7);
        // After two .trim() and stripping leading '=', a single leading space remains.
        assert.equal(captured.trim(), '2 + 5');
    });

    it('passes the supplied scope to the math engine', () => {
        let capturedScope;
        FormulaEngine.setMathEngine({
            evaluate(_formula, scope) { capturedScope = scope; return 0; },
        });
        FormulaEngine.evaluate('a', { a: 9 });
        assert.deepEqual(capturedScope, { a: 9 });
    });
});
