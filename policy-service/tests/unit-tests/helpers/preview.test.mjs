import assert from 'node:assert/strict';
import { LocationType } from '@guardian/interfaces';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import {
    PREVIEW_BLOCK_TYPES,
    PREVIEW_SKIPPED_OUTPUTS,
    PreviewScope,
    createPreviewDocument,
    getPreviewDocumentId,
    isPreviewInputAllowed,
    runPreview
} from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const user = { did: 'did:user', group: 'group-1', userId: 'u-1' };
const ref = { policyId: 'policy-1', tag: 'form' };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const formBlock = (overrides = {}) => ({
    blockType: 'requestVcDocumentBlock',
    locationType: LocationType.LOCAL,
    ...overrides
});
const firstSubject = (item) => Array.isArray(item.document.credentialSubject)
    ? item.document.credentialSubject[0]
    : item.document.credentialSubject;
const notCalled = async () => {
    throw new Error('setBlockData must not be called');
};

describe('@unit preview helpers', function () {
    this.timeout(5000);

    describe('block, output and input lists', () => {
        it('runs only calculation, routing and container blocks', () => {
            assert.deepEqual([...PREVIEW_BLOCK_TYPES].sort(), [
                'calculateContainerBlock',
                'customLogicBlock',
                'documentValidatorBlock',
                'mathBlock',
                'module',
                'switchBlock',
                'tool'
            ]);
        });

        it('skips the events that change the screen or the step', () => {
            assert.deepEqual([...PREVIEW_SKIPPED_OUTPUTS].sort(), [
                'DraftEvent',
                'ErrorEvent',
                'ReferenceEvent',
                'RefreshEvent',
                'ReleaseEvent'
            ]);
        });

        it('lets a link in only through RunEvent or a custom tool or module event', () => {
            assert.equal(isPreviewInputAllowed('RunEvent'), true);
            assert.equal(isPreviewInputAllowed('calc_input'), true);
            assert.equal(isPreviewInputAllowed('RefreshEvent'), false);
            assert.equal(isPreviewInputAllowed('ReleaseEvent'), false);
            assert.equal(isPreviewInputAllowed('TimerEvent'), false);
            assert.equal(isPreviewInputAllowed('RestoreEvent'), false);
        });
    });

    describe('PreviewScope', () => {
        it('has no step outside a preview run', () => {
            assert.equal(PreviewScope.current(), undefined);
        });

        it('keeps the step across awaits and timers inside the run', async () => {
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            const seen = await PreviewScope.run(step, async () => {
                await Promise.resolve();
                const afterAwait = PreviewScope.current();
                const afterTimer = await new Promise((resolve) => setTimeout(() => resolve(PreviewScope.current()), 0));
                return [afterAwait, afterTimer];
            });
            assert.equal(seen[0], step);
            assert.equal(seen[1], step);
            assert.equal(PreviewScope.current(), undefined);
        });
    });

    describe('getPreviewDocumentId', () => {
        it('uses the owner DID for OWNER', () => {
            assert.equal(getPreviewDocumentId('OWNER', user), 'did:user');
        });

        it('creates a local UUID for UUID and DID instead of a network DID', () => {
            assert.match(getPreviewDocumentId('UUID', user), uuidPattern);
            assert.match(getPreviewDocumentId('DID', user), uuidPattern);
        });

        it('returns undefined for DOCUMENT', () => {
            assert.equal(getPreviewDocumentId('DOCUMENT', user), undefined);
        });
    });

    describe('createPreviewDocument', () => {
        it('builds an unsigned document with owner, issuer and schema', () => {
            const item = createPreviewDocument(ref, user, { field: 5 }, '#schema', 'did:issuer', 'step-1');
            assert.equal(item.policyId, 'policy-1');
            assert.equal(item.tag, 'form');
            assert.equal(item.owner, 'did:user');
            assert.equal(item.group, 'group-1');
            assert.equal(item.schema, '#schema');
            assert.equal(item.type, '#schema');
            assert.equal(item.recordActionId, 'step-1');
            assert.equal(item.document.issuer, 'did:issuer');
            assert.equal(item.document.proof, undefined);
            assert.equal(firstSubject(item).field, 5);
        });

        it('leaves owner, issuer and schema empty when they are unknown', () => {
            const item = createPreviewDocument(ref, null, { field: 1 }, null, null, null);
            assert.equal(item.owner, undefined);
            assert.equal(item.schema, undefined);
            assert.equal(item.document.issuer, undefined);
        });
    });

    describe('runPreview', () => {
        it('rejects a block that is not a Request document block', async () => {
            const res = await runPreview(formBlock({ blockType: 'mathBlock' }), user, {}, notCalled);
            assert.ok(res instanceof MessageError);
            assert.equal(res.code, 422);
        });

        it('rejects a remote policy', async () => {
            const res = await runPreview(formBlock({ locationType: LocationType.REMOTE }), user, {}, notCalled);
            assert.ok(res instanceof MessageError);
            assert.equal(res.code, 422);
        });

        it('runs the form inside the preview scope without relayer account or draft', async () => {
            let seen = null;
            const body = { document: { a: 1 }, preview: true, draft: true, draftId: 'd-1', relayerAccount: '0.0.5' };
            const res = await runPreview(formBlock(), user, body, async (block, previewUser, data, step) => {
                seen = { data, step, scoped: PreviewScope.current() };
                step.addPreviewDocument('form', { tag: 'save', blockType: 'sendToGuardianBlock' }, { data: { id: 'doc-1' } });
                return new MessageResponse({ id: 'input-1' });
            });
            assert.equal(seen.scoped, seen.step);
            assert.equal(seen.step.preview, true);
            assert.equal(seen.step.syncActions, true);
            assert.equal(seen.data.relayerAccount, null);
            assert.equal(seen.data.draft, false);
            assert.equal(seen.data.draftId, null);
            assert.deepEqual(seen.data.document, { a: 1 });
            assert.ok(res instanceof MessageResponse);
            assert.equal(res.body.preview, true);
            assert.equal(res.body.trackingId, seen.step.id);
            assert.deepEqual(res.body.input, { id: 'input-1' });
            assert.deepEqual(res.body.documents, [
                { source: 'form', target: 'save', blockType: 'sendToGuardianBlock', document: { id: 'doc-1' } }
            ]);
            assert.deepEqual(res.body.calculations, []);
            assert.deepEqual(res.body.fields, []);
            assert.deepEqual(res.body.missingFields, []);
            assert.deepEqual(res.body.errors, []);
        });

        it('waits for chain work that finishes after the form returns', async () => {
            const res = await runPreview(formBlock(), user, {}, async (block, previewUser, data, step) => {
                step.inc();
                setTimeout(() => {
                    step.addPreviewDocument('math', null, { data: { late: true } });
                    step.dec();
                }, 50);
                return new MessageResponse({});
            });
            assert.deepEqual(res.body.documents.map((item) => item.document), [{ late: true }]);
        });

        it('returns the error of the form block unchanged', async () => {
            const error = new MessageError('boom', 500);
            const res = await runPreview(formBlock(), user, {}, async () => error);
            assert.equal(res, error);
        });

        it('collects block errors into the response', async () => {
            const res = await runPreview(formBlock(), user, {}, async (block, previewUser, data, step) => {
                step.addError(new Error('math failed'));
                return new MessageResponse({});
            });
            assert.deepEqual(res.body.errors, ['math failed']);
        });

        it('returns the fields the chain read from the form', async () => {
            const res = await runPreview(formBlock(), user, {}, async (block, previewUser, data, step) => {
                step.setPreviewSource({
                    schema: '#S',
                    document: { amount: 2 },
                    paths: ['amount', 'rate'],
                    dependencies: {}
                });
                step.addPreviewRead('#S', 'amount');
                step.addPreviewRead('#S', 'rate');
                return new MessageResponse({});
            });
            assert.deepEqual(res.body.fields, ['amount', 'rate']);
            assert.deepEqual(res.body.missingFields, ['rate']);
        });

        it('rethrows when the form block throws', async () => {
            await assert.rejects(
                () => runPreview(formBlock(), user, {}, async () => { throw new Error('form failed'); }),
                /form failed/
            );
        });
    });
});
