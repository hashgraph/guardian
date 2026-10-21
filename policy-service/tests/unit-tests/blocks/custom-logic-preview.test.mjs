import assert from 'node:assert/strict';
import { makeBlock, makeUser } from './_block-exec-harness.mjs';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

describe('@unit customLogicBlock preview', () => {
    let origBlockErrorFn;
    let uiErrors;

    beforeEach(() => {
        uiErrors = [];
        origBlockErrorFn = PolicyComponentsUtils.BlockErrorFn;
        PolicyComponentsUtils.BlockErrorFn = async (...args) => { uiErrors.push(args); };
    });

    afterEach(() => {
        PolicyComponentsUtils.BlockErrorFn = origBlockErrorFn;
    });

    const setup = (execute) => {
        const { block, components } = makeBlock(CustomLogicBlock, { options: { onErrorAction: 'no-action' } });
        const events = [];
        block.triggerEvents = async (...args) => { events.push(args); };
        block.execute = execute;
        return { block, components, events };
    };

    const makeEvent = (actionStatus) => ({
        data: { data: { foo: 1 } },
        user: makeUser({ userId: 'u1' }),
        actionStatus,
    });

    const previewStep = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);

    it('collects a script error on the preview step without telling the UI', async () => {
        const step = previewStep();
        const { block, components, events } = setup(async () => { throw new Error('script failed'); });
        await block.runAction(makeEvent(step));
        assert.deepEqual(step.getErrors().map((error) => error.message), ['script failed']);
        assert.equal(uiErrors.length, 0);
        assert.equal(events.length, 0);
        assert.equal(components.__logs.filter(([level]) => level === 'error').length, 0);
    });

    it('sends nothing on an empty result during a preview', async () => {
        const { block, events } = setup(async (state, user, triggerEvents) => {
            await triggerEvents(null);
            return null;
        });
        await block.runAction(makeEvent(previewStep()));
        assert.equal(events.length, 0);
    });
});
