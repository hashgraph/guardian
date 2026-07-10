import { assert } from 'chai';
import { RunFunctionAsync } from '../../../dist/helpers/run-function-async.js';

function deferred() {
    let resolve;
    const promise = new Promise((res) => { resolve = res; });
    return { promise, resolve };
}

describe('RunFunctionAsync', () => {
    it('invokes the supplied function', async () => {
        const d = deferred();
        let called = false;
        RunFunctionAsync(async () => { called = true; d.resolve(); });
        await d.promise;
        assert.isTrue(called);
    });

    it('passes the thrown error to onErrorFunc', async () => {
        const d = deferred();
        const boom = new Error('boom');
        let received = null;
        RunFunctionAsync(
            async () => { throw boom; },
            async (error) => { received = error; d.resolve(); },
        );
        await d.promise;
        assert.equal(received, boom);
    });

    it('does not call onErrorFunc when the function resolves', async () => {
        const d = deferred();
        let errorCalled = false;
        RunFunctionAsync(
            async () => { d.resolve(); },
            async () => { errorCalled = true; },
        );
        await d.promise;
        await new Promise((res) => setImmediate(res));
        assert.isFalse(errorCalled);
    });

    it('falls back to console.error(message) when no onErrorFunc is given', async () => {
        const original = console.error;
        const d = deferred();
        let logged = null;
        console.error = (msg) => { logged = msg; d.resolve(); };
        try {
            RunFunctionAsync(async () => { throw new Error('no handler'); });
            await d.promise;
        } finally {
            console.error = original;
        }
        assert.equal(logged, 'no handler');
    });
});
