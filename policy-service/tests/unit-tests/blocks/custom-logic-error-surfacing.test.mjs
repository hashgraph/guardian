import assert from 'node:assert/strict';
import { makeBlock, makeUser } from './_block-exec-harness.mjs';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PolicyOutputEventType } from '../../../dist/policy-engine/interfaces/index.js';

// customLogicBlock must surface execution errors to the UI (via BlockErrorFn / ErrorEvent),
// not just log them server-side. See #6271.
describe('@unit customLogicBlock error surfacing', () => {
    let origBlockErrorFn;
    let uiErrors;

    beforeEach(() => {
        uiErrors = [];
        origBlockErrorFn = PolicyComponentsUtils.BlockErrorFn;
        PolicyComponentsUtils.BlockErrorFn = async (blockType, message, user) => {
            uiErrors.push({ blockType, message, user });
        };
    });

    afterEach(() => {
        PolicyComponentsUtils.BlockErrorFn = origBlockErrorFn;
    });

    function setup() {
        const { block, components } = makeBlock(CustomLogicBlock, {
            options: { onErrorAction: 'no-action' },
        });
        const events = [];
        block.triggerEvents = async (...a) => { events.push(a); };
        block.execute = async () => {
            throw new Error('{"type":"JSON_SCHEMA_VALIDATION_ERROR","details":[{"message":"must be number"}]}');
        };
        return { block, components, events };
    }

    const makeEvent = () => ({
        data: { data: { foo: 1 } },
        user: makeUser({ userId: 'u1' }),
        actionStatus: {},
    });

    it('writes the execution error to the server logger', async () => {
        const { block, components } = setup();
        await block.runAction(makeEvent());
        const errs = components.__logs.filter(([level]) => level === 'error');
        assert.equal(errs.length, 1);
        assert.match(errs[0][1], /JSON_SCHEMA_VALIDATION_ERROR/);
    });

    it('does not rethrow — the caller sees a normal return', async () => {
        const { block } = setup();
        await assert.doesNotReject(() => block.runAction(makeEvent()));
    });

    it('surfaces the error to the UI via BlockErrorFn', async () => {
        const { block } = setup();
        await block.runAction(makeEvent());
        assert.equal(uiErrors.length, 1, 'block error broadcast to the UI exactly once');
        assert.equal(uiErrors[0].blockType, 'customLogicBlock');
        assert.match(uiErrors[0].message, /JSON_SCHEMA_VALIDATION_ERROR/);
    });

    it('triggers an ErrorEvent and no RunEvent (flow stops, error routed)', async () => {
        const { block, events } = setup();
        await block.runAction(makeEvent());
        const types = events.map((e) => e[0]);
        assert.ok(types.includes(PolicyOutputEventType.ErrorEvent), 'ErrorEvent is triggered');
        assert.ok(!types.includes(PolicyOutputEventType.RunEvent), 'no RunEvent — output document does not propagate on failure');
    });
});
