import assert from 'node:assert/strict';
import esmock from 'esmock';
import { BlockErrorActions } from '@guardian/interfaces';

const blockErrorCalls = [];
const fakePolicyComponentsUtils = {
    PolicyComponentsUtils: {
        BlockErrorFn: async (...args) => { blockErrorCalls.push(args); },
    },
};

const { CatchErrors } = await esmock.strict(
    '../../../dist/policy-engine/helpers/decorators/catch-errors.js',
    {
        '@guardian/common': { PinoLogger: class { async error() {} async warn() {} async info() {} } },
        '../../../dist/policy-engine/policy-components-utils.js': fakePolicyComponentsUtils,
    }
);

const wrap = (fn) => {
    const target = { run: fn };
    const descriptor = { value: fn, configurable: true, writable: true };
    CatchErrors()(target, 'run', descriptor);
    return descriptor.value;
};

const arg = (extra = {}) => ({ user: {}, userId: 'u-1', data: 'payload', ...extra });

describe('CatchErrors decorator', () => {
    beforeEach(() => { blockErrorCalls.length = 0; });

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

    // #1743: documentValidatorBlock (and other blocks) attach a structured
    // breakdown to the error as `error.data`, but BlockErrorFn was only ever
    // called with (blockType, message, user) - the detail was dropped at this
    // hop before it could reach the event-driven (websocket) path, even though
    // the HTTP response path rendered it fine via BlockActionError.errorObject.
    it('forwards error.data to BlockErrorFn as a fourth argument', async () => {
        const boom = Object.assign(new Error('validation failed'), { data: { type: 'x', conditions: [] } });
        const wrapped = wrap(async function () { throw boom; });
        const thisArg = { options: {}, blockType: 'documentValidatorBlock', uuid: 'u-1', policyId: 'p-1', triggerEvents() {} };
        await wrapped.apply(thisArg, [arg()]);

        assert.equal(blockErrorCalls.length, 1);
        assert.deepEqual(blockErrorCalls[0][3], { type: 'x', conditions: [] });
    });

    it('passes undefined as the fourth argument when the error carries no data', async () => {
        const wrapped = wrap(async function () { throw new Error('plain failure'); });
        const thisArg = { options: {}, blockType: 'someBlock', uuid: 'u-2', policyId: 'p-1', triggerEvents() {} };
        await wrapped.apply(thisArg, [arg()]);

        assert.equal(blockErrorCalls.length, 1);
        assert.equal(blockErrorCalls[0][3], undefined);
    });

    it('forwards error.data on the GOTO_STEP path too', async () => {
        const boom = Object.assign(new Error('validation failed'), { data: { type: 'x' } });
        const wrapped = wrap(async function () { throw boom; });
        const thisArg = {
            options: { onErrorAction: BlockErrorActions.GOTO_STEP, errorFallbackStep: '0' },
            blockType: 'documentValidatorBlock', uuid: 'u-3', policyId: 'p-1',
            triggerEvents() {}, parent: { blockType: 'x', children: [] },
        };
        await wrapped.apply(thisArg, [arg()]);

        assert.equal(blockErrorCalls.length, 1);
        assert.deepEqual(blockErrorCalls[0][3], { type: 'x' });
    });
});
