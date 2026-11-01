import assert from 'node:assert/strict';
import esmock from 'esmock';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const blockErrorCalls = [];

const { CatchErrors } = await esmock.strict(
    '../../../dist/policy-engine/helpers/decorators/catch-errors.js',
    {
        '@guardian/common/helpers/pino-logger': {
            PinoLogger: class { async error() {} async warn() {} async info() {} }
        },
        '../../../dist/policy-engine/policy-components-utils.js': {
            PolicyComponentsUtils: {
                BlockErrorFn: async (...args) => { blockErrorCalls.push(args); },
            },
        },
    }
);

const wrap = (fn) => {
    const target = { run: fn };
    const descriptor = { value: fn, configurable: true, writable: true };
    CatchErrors()(target, 'run', descriptor);
    return descriptor.value;
};

const failing = () => wrap(async function () { throw new Error('formula failed'); });

describe('@unit CatchErrors in preview', () => {
    beforeEach(() => { blockErrorCalls.length = 0; });

    it('collects the error on the preview step and follows the error link inside the preview', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const triggered = [];
        const data = { data: { id: 'd1' } };
        const thisArg = { options: {}, parent: null, blockType: 'mathBlock', triggerEvents: async (...args) => { triggered.push(args); } };
        const result = await failing().apply(thisArg, [{ user: { id: 'u' }, data, actionStatus: step }]);
        assert.equal(result, undefined);
        assert.deepEqual(step.getErrors().map((error) => error.message), ['formula failed']);
        assert.deepEqual(step.getErrors().map((error) => error.blockType), ['mathBlock']);
        assert.equal(blockErrorCalls.length, 0);
        assert.deepEqual(triggered, [['ErrorEvent', { id: 'u' }, data, step]]);
    });

    it('follows no error link during field discovery, where the error comes from placeholder values', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource({ schema: '#S', document: {}, paths: [], dependencies: {}, discovery: true });
        const triggered = [];
        const thisArg = { options: {}, parent: null, blockType: 'mathBlock', triggerEvents: async (...args) => { triggered.push(args); } };
        await failing().apply(thisArg, [{ user: {}, data: {}, actionStatus: step }]);
        assert.equal(step.getErrors().length, 1);
        assert.deepEqual(triggered, []);
    });

    it('follows no error link in a preview when the block only debugs its errors', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const triggered = [];
        const thisArg = { options: { onErrorAction: 'debug' }, parent: null, blockType: 'mathBlock', triggerEvents: async (...args) => { triggered.push(args); } };
        await failing().apply(thisArg, [{ user: {}, data: {}, actionStatus: step }]);
        assert.equal(step.getErrors().length, 1);
        assert.deepEqual(triggered, []);
    });

    it('keeps the normal error handling outside a preview', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true);
        const triggered = [];
        const thisArg = {
            options: {},
            parent: null,
            uuid: 'b-1',
            blockType: 'mathBlock',
            policyId: 'p-1',
            triggerEvents: (...args) => triggered.push(args)
        };
        await failing().apply(thisArg, [{ user: {}, data: {}, actionStatus: step }]);
        assert.equal(step.getErrors().length, 0);
        assert.equal(blockErrorCalls.length, 1);
        assert.equal(triggered[0][0], 'ErrorEvent');
    });
});
