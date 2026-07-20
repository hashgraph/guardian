import assert from 'node:assert/strict';
import { CatchErrors } from '../../../dist/policy-engine/helpers/decorators/catch-errors.js';
import { BlockErrorActions } from '@guardian/interfaces';

const wrap = (fn) => {
    const target = { run: fn };
    const descriptor = { value: fn, configurable: true, writable: true };
    CatchErrors()(target, 'run', descriptor);
    return descriptor.value;
};

const arg = (extra = {}) => ({ user: {}, userId: 'u-1', data: 'payload', ...extra });

describe('CatchErrors decorator', () => {
    it('replaces the method with a different (wrapped) function', () => {
        const fn = async function () { return 1; };
        const wrapped = wrap(fn);
        assert.notEqual(wrapped, fn);
        assert.equal(typeof wrapped, 'function');
    });

    it('passes through the return value when the method succeeds', async () => {
        const wrapped = wrap(async function () { return 42; });
        const result = await wrapped.apply({ options: {} }, [arg()]);
        assert.equal(result, 42);
    });

    it('forwards this and the arguments to the wrapped method', async () => {
        const wrapped = wrap(async function (payload) {
            return { tag: this.tag, got: payload.data };
        });
        const result = await wrapped.apply({ tag: 'T1', options: {} }, [arg()]);
        assert.deepEqual(result, { tag: 'T1', got: 'payload' });
    });

    it('routes errors to debugError when onErrorAction is DEBUG and swallows the result', async () => {
        const boom = new Error('boom');
        const wrapped = wrap(async function () { throw boom; });
        let captured = null;
        const thisArg = {
            options: { onErrorAction: BlockErrorActions.DEBUG },
            debugError(err) { captured = err; },
        };
        const result = await wrapped.apply(thisArg, [arg()]);
        assert.equal(result, undefined);
        assert.equal(captured, boom);
    });
});
