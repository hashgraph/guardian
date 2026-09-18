import { assert } from 'chai';
import { RunFunctionAsync } from '../../../dist/helpers/run-function-async.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('RunFunctionAsync', () => {
    it('runs the function and discards the resolved value', async () => {
        let invoked = false;
        RunFunctionAsync(async () => {
            invoked = true;
        });
        await tick();
        assert.equal(invoked, true);
    });

    it('routes thrown errors to onErrorFunc when provided', async () => {
        let captured = null;
        RunFunctionAsync(
            async () => { throw new Error('boom'); },
            async (err) => { captured = err; },
        );
        await tick();
        await tick();
        assert.ok(captured);
        assert.equal(captured.message, 'boom');
    });

    it('falls back to console.error when no onErrorFunc is supplied', async () => {
        const original = console.error;
        let logged = null;
        console.error = (...args) => { logged = args.join(' '); };
        try {
            RunFunctionAsync(async () => { throw new Error('uncaught'); });
            await tick();
            await tick();
            assert.match(logged, /uncaught/);
        } finally {
            console.error = original;
        }
    });

    it('does not throw synchronously even if func rejects', () => {
        // Execution model: synchronous call returns void; rejection handled async.
        assert.doesNotThrow(() => {
            RunFunctionAsync(async () => { throw new Error('x'); });
        });
    });
});
