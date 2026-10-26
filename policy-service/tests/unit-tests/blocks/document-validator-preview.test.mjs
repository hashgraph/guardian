import { PinoLogger } from '@guardian/common/helpers/pino-logger';
import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/blocks/document-validator-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { setPreviewDocumentSchema } from '../../../dist/policy-engine/helpers/preview.js';

describe('@unit documentValidatorBlock preview', () => {
    let orig;

    beforeEach(() => {
        orig = {
            loggerError: PinoLogger.prototype.error,
            blockErrorFn: PolicyComponentsUtils.BlockErrorFn,
            externalEventFn: PolicyComponentsUtils.ExternalEventFn
        };
        PinoLogger.prototype.error = async () => undefined;
        PolicyComponentsUtils.BlockErrorFn = async () => undefined;
        PolicyComponentsUtils.ExternalEventFn = async () => undefined;
    });

    afterEach(() => {
        PinoLogger.prototype.error = orig.loggerError;
        PolicyComponentsUtils.BlockErrorFn = orig.blockErrorFn;
        PolicyComponentsUtils.ExternalEventFn = orig.externalEventFn;
    });

    after(() => restoreHarness());

    const setup = (options = {}) => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { onErrorAction: 'no-action', ...options } });
        const calls = { validated: 0, events: [] };
        block.run = async () => {
            calls.validated++;
            return { message: 'invalid' };
        };
        block.triggerEvents = async (...args) => { calls.events.push(args[0]); };
        return { block, calls };
    };

    const previewStep = (discovery = false) => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource({ schema: '#S', document: {}, paths: ['amount', 'rate'], dependencies: {}, discovery });
        return step;
    };

    it('runs the error branch on a failed preview validator, as a normal submit does', async () => {
        const { block, calls } = setup();
        const step = previewStep();
        await block.runAction({ user: makeUser(), data: { data: {} }, actionStatus: step });
        assert.equal(step.getErrors()[0].message, 'invalid');
        assert.equal(calls.validated, 1);
        assert.deepEqual(calls.events, ['ErrorEvent']);
    });

    it('preserves the normal validator recovery path and passes the preview step to recovery', async () => {
        for (const preview of [false, true]) {
            const { block } = setup();
            const step = preview ? previewStep() : new RecordActionStep(() => {});
            const recovered = [];
            block.triggerEvents = async (type, user, data, actionStatus) => {
                if (type === 'ErrorEvent') {
                    recovered.push({ user, data, actionStatus });
                }
            };
            const user = makeUser();
            const data = { data: { amount: 7 } };
            await block.runAction({ user, data, actionStatus: step });
            assert.equal(recovered.length, 1);
            assert.equal(recovered[0].data, data);
            if (preview) {
                assert.equal(recovered[0].actionStatus, step);
            }
        }
    });

    it('records the form fields its conditions and source checks read as fields the preview needs', async () => {
        const { block, calls } = setup({
            conditions: [
                { field: 'document.credentialSubject.0.amount', type: 'equal', value: 'document.credentialSubject.0.rate', valueSource: 'document' },
                { field: 'owner', type: 'equal', value: 'did:user' }
            ],
            sourceValidations: [{
                filters: [{ field: 'document.credentialSubject.0.ref', type: 'equal', value: 'document.credentialSubject.0.projectId', typeValue: 'variable' }],
                conditions: [{ field: 'document.credentialSubject.0.limit', fieldSource: 'document', type: 'lte', value: 'document.credentialSubject.0.cap', valueSource: 'source' }]
            }]
        });
        block.run = async () => { calls.validated++; return null; };
        const step = previewStep();
        await block.runAction({ user: makeUser(), data: { data: setPreviewDocumentSchema({ document: {} }, '#S') }, actionStatus: step });
        assert.deepEqual(step.getPreviewReads().map((read) => read.path).sort(), ['amount', 'limit', 'projectId', 'rate']);
        assert.deepEqual(calls.events[0], 'RunEvent');
    });

    it('passes the document on during field discovery even when a placeholder fails the check', async () => {
        const { block, calls } = setup();
        const step = previewStep(true);
        await block.runAction({ user: makeUser(), data: { data: {} }, actionStatus: step });
        assert.equal(calls.validated, 1);
        assert.equal(calls.events[0], 'RunEvent');
        assert.deepEqual(step.getErrors(), []);
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
