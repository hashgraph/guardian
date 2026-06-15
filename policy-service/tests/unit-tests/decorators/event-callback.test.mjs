import assert from 'node:assert/strict';
import { ActionCallback } from '../../../dist/policy-engine/helpers/decorators/event-callback.js';

const apply = (config, target, propertyKey, fn) => {
    target[propertyKey] = fn;
    const descriptor = { value: fn, writable: true, configurable: true, enumerable: true };
    ActionCallback(config)(target, propertyKey, descriptor);
};

describe('ActionCallback decorator', () => {
    it('initialises target.actions and target.outputActions when missing', () => {
        const target = {};
        apply({}, target, 'noop', async () => null);
        assert.ok(Array.isArray(target.actions));
        assert.ok(Array.isArray(target.outputActions));
        assert.equal(target.actions.length, 0);
        assert.equal(target.outputActions.length, 0);
    });

    it('registers a [type, proxiedFn] entry on target.actions when type is given', async () => {
        const target = {};
        let called = 0;
        apply({ type: 'RunEvent' }, target, 'run', async function () { called++; return 'ok'; });
        assert.equal(target.actions.length, 1);
        const [registeredType, proxiedFn] = target.actions[0];
        assert.equal(registeredType, 'RunEvent');
        const result = await proxiedFn.apply({}, []);
        assert.equal(result, 'ok');
        assert.equal(called, 1);
    });

    it('appends a single output type to target.outputActions', () => {
        const target = {};
        apply({ output: 'OutA' }, target, 'a', async () => null);
        assert.deepEqual(target.outputActions, ['OutA']);
    });

    it('appends each output in an array, deduplicated', () => {
        const target = {};
        apply({ output: ['OutA', 'OutB', 'OutA'] }, target, 'a', async () => null);
        assert.deepEqual(target.outputActions, ['OutA', 'OutB']);
    });

    it('does not duplicate an output type already registered', () => {
        const target = { outputActions: ['OutA'], actions: [] };
        apply({ output: 'OutA' }, target, 'a', async () => null);
        assert.deepEqual(target.outputActions, ['OutA']);
    });

    it('handles type and output together (registers both sides)', async () => {
        const target = {};
        apply(
            { type: 'RunEvent', output: ['OutA', 'OutB'] },
            target,
            'run',
            async () => 42
        );
        assert.equal(target.actions.length, 1);
        assert.equal(target.actions[0][0], 'RunEvent');
        assert.deepEqual(target.outputActions, ['OutA', 'OutB']);
    });

    it('does nothing for actions when type is missing', () => {
        const target = {};
        apply({ output: 'OutA' }, target, 'noop', async () => null);
        assert.equal(target.actions.length, 0);
    });

    it('preserves existing actions array (does not reset)', () => {
        const target = { actions: [['Existing', () => 'x']], outputActions: ['Old'] };
        apply({ type: 'New', output: 'Fresh' }, target, 'run', async () => null);
        assert.equal(target.actions.length, 2);
        assert.equal(target.actions[0][0], 'Existing');
        assert.equal(target.actions[1][0], 'New');
        assert.deepEqual(target.outputActions, ['Old', 'Fresh']);
    });
});
