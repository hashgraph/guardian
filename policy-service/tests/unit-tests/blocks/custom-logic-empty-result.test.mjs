import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PolicyOutputEventType } from '../../../dist/policy-engine/interfaces/index.js';

/**
 * Coverage for an empty custom-logic result stranding the user.
 *
 * VM0051's `pp_monitoring_report_update_table` and `pp_calculation_ex_ante` both bail out
 * with a bare `return` when their source lookups don't match, which reaches the block as
 * `done(null)`. `triggerEvents(null)` used to return immediately: no RunEvent (correct —
 * there is no document to pass on), but also no RefreshEvent and no signal to the parent
 * step. The enclosing `interfaceStepBlock` therefore stayed parked on this non-UI block
 * and the viewer showed "This step isn't available to you right now" permanently.
 *
 * Note this is a *successful* script run, so the error-sentinel work in PR 6447 does not
 * cover it — which is why the stall survived that fix.
 */
describe('@unit customLogicBlock empty result does not strand the step', () => {
    after(() => restoreHarness());

    let origBlockErrorFn;
    beforeEach(() => {
        origBlockErrorFn = PolicyComponentsUtils.BlockErrorFn;
        PolicyComponentsUtils.BlockErrorFn = async () => {};
    });
    afterEach(() => {
        PolicyComponentsUtils.BlockErrorFn = origBlockErrorFn;
    });

    /** Records unparkStalledChild calls the way a real interfaceStepBlock parent would. */
    function makeStepParent() {
        const unparked = [];
        return {
            unparked,
            blockType: 'interfaceStepBlock',
            registerChild: () => {},
            unparkStalledChild: async (user, child) => {
                unparked.push({ userId: user?.id, childUuid: child?.uuid });
                return true;
            },
        };
    }

    /**
     * @param execute - stands in for the sandboxed script run; receives the block's
     *                  `triggerEvents` callback exactly as `execute()` does.
     */
    function setup(execute, { parent } = {}) {
        const { block, components } = makeBlock(CustomLogicBlock, {
            uuid: 'calc-uuid',
            tag: 'pp_monitoring_report_update_table',
            options: { onErrorAction: 'no-action' },
            parent,
        });
        const events = [];
        block.triggerEvents = async (...args) => { events.push(args); };
        block.backup = () => {};
        block.execute = execute;
        return { block, components, events };
    }

    const makeEvent = () => ({
        data: { data: { foo: 1 } },
        user: makeUser({ id: 'u1', userId: 'u1' }),
        actionStatus: {},
    });

    // these mirror the two real dead ends
    const emptyResult = (_state, _user, triggerEvents) => triggerEvents(null);
    const thrownScript = async () => { throw new Error('Custom logic error: boom'); };

    it('still refreshes the viewer on an empty result', async () => {
        const { block, events } = setup(emptyResult);

        await block.runAction(makeEvent());

        assert.ok(events.map(([t]) => t).includes(PolicyOutputEventType.RefreshEvent), 'RefreshEvent is triggered');
    });

    it('does not pass a RunEvent downstream on an empty result', async () => {
        const { block, events } = setup(emptyResult);

        await block.runAction(makeEvent());

        const types = events.map(([t]) => t);
        assert.ok(!types.includes(PolicyOutputEventType.RunEvent), 'nothing is forwarded — there is no document');
        assert.ok(!types.includes(PolicyOutputEventType.ErrorEvent), 'an empty result is not an error');
    });

    it('logs a warning so the dead end is diagnosable', async () => {
        const { block, components } = setup(emptyResult);

        await block.runAction(makeEvent());

        const warnings = components.__logs.filter(([level]) => level === 'warn');
        assert.equal(warnings.length, 1, 'exactly one warning');
        assert.match(warnings[0][1], /empty result/i);
    });

    it('asks the parent step to unpark itself on an empty result', async () => {
        const parent = makeStepParent();
        const { block } = setup(emptyResult, { parent });

        await block.runAction(makeEvent());

        assert.deepEqual(parent.unparked, [{ userId: 'u1', childUuid: 'calc-uuid' }]);
    });

    it('also unparks the step when the script throws', async () => {
        const parent = makeStepParent();
        const { block, events } = setup(thrownScript, { parent });

        await block.runAction(makeEvent());

        assert.equal(parent.unparked.length, 1, 'the step is rewound as well as being told about the error');
        assert.ok(
            events.map(([t]) => t).includes(PolicyOutputEventType.ErrorEvent),
            'the existing ErrorEvent behaviour is preserved'
        );
    });

    it('ignores a parent that is not a step block', async () => {
        const parent = { blockType: 'interfaceContainerBlock', registerChild: () => {} };
        const { block } = setup(emptyResult, { parent });

        await assert.doesNotReject(() => block.runAction(makeEvent()));
    });

    it('survives a parent whose unpark throws', async () => {
        const parent = {
            blockType: 'interfaceStepBlock',
            registerChild: () => {},
            unparkStalledChild: async () => { throw new Error('nope'); },
        };
        const { block, components } = setup(emptyResult, { parent });

        await assert.doesNotReject(() => block.runAction(makeEvent()));
        const errs = components.__logs.filter(([level]) => level === 'error');
        assert.ok(errs.some(([, m]) => /unparkStalledChild failed/.test(m)), 'the failure is logged, not thrown');
    });

    it('leaves the normal success path untouched', async () => {
        const parent = makeStepParent();
        const { block, events } = setup(
            (_s, _u, triggerEvents) => triggerEvents([{ id: 'doc' }]),
            { parent }
        );

        await block.runAction(makeEvent());

        assert.equal(parent.unparked.length, 0, 'no unpark when documents were produced');
        assert.ok(events.map(([t]) => t).includes(PolicyOutputEventType.RunEvent), 'the document propagates');
    });
});
