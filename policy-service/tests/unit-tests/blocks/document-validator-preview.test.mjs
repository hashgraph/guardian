import { PinoLogger } from '@guardian/common/helpers/pino-logger';
import assert from 'node:assert/strict';
import { makeBlock, makeDb, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/blocks/document-validator-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { markPreviewStoredDocuments, PreviewScope, setPreviewDocumentSchema } from '../../../dist/policy-engine/helpers/preview.js';

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

    const realSetup = (options, sourceDocuments = []) => {
        const { block } = makeBlock(DocumentValidatorBlock, {
            options: { onErrorAction: 'no-action', ...options },
            componentsOverrides: { databaseServer: makeDb({ getVcDocuments: async () => markPreviewStoredDocuments(sourceDocuments) }) }
        });
        const events = [];
        block.triggerEvents = async (...args) => { events.push(args[0]); };
        return { block, events };
    };

    const formDocument = (subject) => setPreviewDocumentSchema({ owner: 'did:user', document: { credentialSubject: [subject] } }, '#S');

    const readPaths = (step) => step.getPreviewReads().map((read) => read.path).sort();

    it('records the form fields its conditions and source checks read when every check runs', async () => {
        const { block, events } = realSetup({
            conditions: [
                { field: 'document.credentialSubject.0.amount', type: 'equal', value: 'document.credentialSubject.0.rate', valueSource: 'document' },
                { field: 'owner', type: 'equal', value: 'did:user', valueSource: 'value' }
            ],
            sourceValidations: [{
                filters: [{ field: 'document.credentialSubject.0.ref', type: 'equal', value: 'document.credentialSubject.0.projectId', typeValue: 'variable' }],
                conditions: [{ field: 'document.credentialSubject.0.limit', fieldSource: 'document', type: 'lte', value: 'document.credentialSubject.0.cap', valueSource: 'source' }]
            }]
        }, [{ document: { credentialSubject: [{ cap: 10 }] } }]);
        const step = previewStep();
        await PreviewScope.run(step, () => block.runAction({ user: makeUser(), data: { data: formDocument({ amount: 2, rate: 2, projectId: 'P', limit: 5 }) }, actionStatus: step }));
        assert.deepEqual(readPaths(step), ['amount', 'limit', 'projectId', 'rate']);
        assert.equal(events[0], 'RunEvent');
    });

    it('does not record fields of conditions after the first failing one', async () => {
        const { block, events } = realSetup({
            conditions: [
                { field: 'document.credentialSubject.0.amount', type: 'equal', value: '5', valueSource: 'value' },
                { field: 'document.credentialSubject.0.rate', type: 'equal', value: '1', valueSource: 'value' }
            ]
        });
        const step = previewStep();
        await block.runAction({ user: makeUser(), data: { data: formDocument({ amount: 3 }) }, actionStatus: step });
        assert.deepEqual(readPaths(step), ['amount']);
        assert.match(step.getErrors()[0].message, /amount/);
        assert.equal(events[0], 'ErrorEvent');
    });

    it('does not record source conditions when no source document matched', async () => {
        const { block } = realSetup({
            sourceValidations: [{
                filters: [{ field: 'document.credentialSubject.0.ref', type: 'equal', value: 'document.credentialSubject.0.projectId', typeValue: 'variable' }],
                conditions: [{ field: 'document.credentialSubject.0.limit', fieldSource: 'document', type: 'lte', value: 'document.credentialSubject.0.cap', valueSource: 'source' }]
            }]
        });
        const step = previewStep();
        await block.runAction({ user: makeUser(), data: { data: formDocument({ projectId: 'P' }) }, actionStatus: step });
        assert.deepEqual(readPaths(step), ['projectId']);
    });

    it('records nothing outside a preview', async () => {
        const { block } = realSetup({
            conditions: [{ field: 'document.credentialSubject.0.amount', type: 'equal', value: '5', valueSource: 'value' }]
        });
        const step = new RecordActionStep(() => {});
        await block.runAction({ user: makeUser(), data: { data: formDocument({ amount: 5 }) }, actionStatus: step });
        assert.equal(step.getPreviewReads?.().length ?? 0, 0);
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
