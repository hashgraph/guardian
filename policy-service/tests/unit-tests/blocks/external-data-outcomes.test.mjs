import assert from 'node:assert/strict';
import sinon from 'sinon';
import { BlockErrorActions } from '@guardian/interfaces';
import { PinoLogger } from '@guardian/common/helpers/pino-logger';
import { VcHelper } from '@guardian/hedera/vc-helper';
import { VcDocument } from '@guardian/hedera/vcjs/vc-document';
import { ExternalDataBlock } from '../../../dist/policy-engine/blocks/external-data-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PolicyOutputEventType } from '../../../dist/policy-engine/interfaces/index.js';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';

describe('external entry first-attempt outcomes', () => {
    let block;
    let owner;
    let step;
    let ownerLookup;
    let events;

    beforeEach(() => {
        owner = makeUser();
        ({ block } = makeBlock(ExternalDataBlock, { options: { onErrorAction: BlockErrorActions.NO_ACTION } }));
        step = new RecordActionStep(() => {});
        events = [];
        block.triggerEvents = async (type) => { events.push(type); };
        block.backup = () => {};
        block.getOptions = async () => ({ entityType: 'test', forceRelayerAccount: '' });
        sinon.stub(PinoLogger.prototype, 'error').resolves();
        sinon.stub(VcHelper.prototype, 'verifySchema').resolves({ ok: false });
        sinon.stub(VcDocument, 'fromJsonTree').returns({});
        ownerLookup = sinon.stub(PolicyUtils, 'getDocumentOwner').resolves(owner);
        sinon.stub(PolicyUtils, 'getRelationships').resolves(null);
        sinon.stub(PolicyUtils, 'getRelayerAccountAndOwner').resolves(['account', owner]);
        sinon.stub(PolicyUtils, 'getHederaAccounts').returns([]);
        sinon.stub(PolicyUtils, 'createVC').returns({ document: {} });
        sinon.stub(PolicyUtils, 'getBlockTags').resolves([]);
        sinon.stub(PolicyUtils, 'setDocumentTags');
        sinon.stub(PolicyUtils, 'setDocumentRef').callsFake((document) => document);
        sinon.stub(PolicyComponentsUtils, 'IsInheritRelayerAccount').returns(false);
        sinon.stub(PolicyComponentsUtils, 'BlockErrorFn').resolves();
        sinon.stub(PolicyComponentsUtils, 'ExternalEventFn');
    });

    afterEach(() => { step.cancel(); sinon.restore(); restoreHarness(); });

    it('records the original failure for strict callers while preserving ErrorEvent and logging', async () => {
        ownerLookup.rejects(new Error('marker must be ok'));
        await block.receiveData({ document: {} }, step, { recorded: false });
        assert.equal(step.getErrors()[0].message, 'marker must be ok');
        assert.deepEqual(events, [PolicyOutputEventType.ErrorEvent]);
        assert.equal(PinoLogger.prototype.error.called, true);
    });

    it('keeps successful processing and leaves the step free of errors', async () => {
        await block.receiveData({ document: {} }, step, { recorded: false });
        assert.deepEqual(step.getErrors(), []);
        assert.deepEqual(events, [PolicyOutputEventType.RunEvent, PolicyOutputEventType.ReleaseEvent, PolicyOutputEventType.RefreshEvent]);
    });

    for (const strict of [undefined, false]) {
        it(`keeps legacy error handling without recording strict errors for ${strict}`, async () => {
            ownerLookup.rejects(new Error('marker must be ok'));
            await block.receiveData({ document: {} }, step, strict);
            assert.deepEqual(step.getErrors(), []);
            assert.deepEqual(events, [PolicyOutputEventType.ErrorEvent]);
        });
    }

    it('keeps calls without an action step valid', async () => {
        ownerLookup.rejects(new Error('marker must be ok'));
        await block.receiveData({ document: {} });
        assert.deepEqual(events, [PolicyOutputEventType.ErrorEvent]);
    });

    it('returns after the first failure and preserves the configured automatic retry', async () => {
        const clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        block.options.onErrorAction = BlockErrorActions.RETRY;
        block.options.errorTimeout = '1000';
        ownerLookup.onFirstCall().rejects(new Error('temporary error'));
        ownerLookup.onSecondCall().rejects(new Error('still unavailable'));
        await block.receiveData({ document: {} }, step, { recorded: false });
        assert.deepEqual(events, [PolicyOutputEventType.ErrorEvent]);
        assert.equal(step.getErrors()[0].message, 'temporary error');
        await clock.tickAsync(2000);
        assert.equal(step.getErrors().length, 1);
        assert.equal(events.includes(PolicyOutputEventType.RunEvent), true);
    });
});
