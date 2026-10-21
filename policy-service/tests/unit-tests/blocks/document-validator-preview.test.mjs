import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/blocks/document-validator-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

describe('@unit documentValidatorBlock preview', () => {
    let orig;

    beforeEach(() => {
        orig = {
            blockErrorFn: PolicyComponentsUtils.BlockErrorFn,
            externalEventFn: PolicyComponentsUtils.ExternalEventFn
        };
        PolicyComponentsUtils.BlockErrorFn = async () => undefined;
        PolicyComponentsUtils.ExternalEventFn = async () => undefined;
    });

    afterEach(() => {
        PolicyComponentsUtils.BlockErrorFn = orig.blockErrorFn;
        PolicyComponentsUtils.ExternalEventFn = orig.externalEventFn;
    });

    after(() => restoreHarness());

    const setup = () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { onErrorAction: 'no-action' } });
        const calls = { validated: 0, events: [] };
        block.run = async () => {
            calls.validated++;
            return { message: 'invalid' };
        };
        block.triggerEvents = async (...args) => { calls.events.push(args[0]); };
        return { block, calls };
    };

    it('passes the document on without validating it during a preview', async () => {
        const { block, calls } = setup();
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        await block.runAction({ user: makeUser(), data: { data: {} }, actionStatus: step });
        assert.equal(calls.validated, 0);
        assert.equal(calls.events[0], 'RunEvent');
    });

    it('still validates outside a preview', async () => {
        const { block, calls } = setup();
        block.run = async () => {
            calls.validated++;
            return null;
        };
        await block.runAction({ user: makeUser(), data: { data: {} }, actionStatus: new RecordActionStep(() => {}) });
        assert.equal(calls.validated, 1);
        assert.equal(calls.events[0], 'RunEvent');
    });
});
