import assert from 'node:assert/strict';
import { TransformState } from '../../../dist/policy-engine/helpers/data-transform-engine/transform-state.js';
import { BlockActionError } from '../../../dist/policy-engine/errors/block-action-error.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

describe('TransformState', () => {
    it('returns the state untouched when no rules are provided', () => {
        const state = { x: 1 };
        assert.equal(TransformState(null, state, '', 'uuid'), state);
    });

    it('returns the state untouched when no configuration matches the rule', () => {
        const state = { x: 1 };
        assert.equal(TransformState({ other: {} }, state, '', 'uuid'), state);
    });

    it('falls back to the "self" rule when updateSource is empty', () => {
        const rules = { self: { expression: 'x', source: '+ 1', target: 'result' } };
        const out = TransformState(rules, { x: 5 }, '', 'uuid');
        assert.deepEqual(out, { x: 5, result: 6 });
    });

    it('uses the named rule when updateSource is provided', () => {
        const rules = { custom: { expression: 'a', source: '* 2', target: 'doubled' } };
        const out = TransformState(rules, { a: 3 }, 'custom', 'uuid');
        assert.deepEqual(out, { a: 3, doubled: 6 });
    });

    it('does not mutate the input state', () => {
        const rules = { self: { expression: 'x', source: '+ 1', target: 'result' } };
        const state = { x: 5 };
        const out = TransformState(rules, state, '', 'uuid');
        assert.notEqual(out, state);
        assert.deepEqual(state, { x: 5 });
    });

    it('wraps an expression failure in a BlockActionError', () => {
        const original = PolicyComponentsUtils.GetBlockByUUID;
        PolicyComponentsUtils.GetBlockByUUID = () => ({ blockType: 'someBlock' });
        try {
            const rules = { self: { expression: 'missingVar', source: '', target: 'result' } };
            assert.throws(() => TransformState(rules, {}, '', 'uuid-1'), BlockActionError);
        } finally {
            PolicyComponentsUtils.GetBlockByUUID = original;
        }
    });
});
