import assert from 'node:assert/strict';
import { ComponentsService } from '../../../dist/policy-engine/helpers/components-service.js';
import { LocationType } from '@guardian/interfaces';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { PREVIEW_SKIPPED_INPUTS, PreviewScope, isPreviewInputAllowed, isPreviewResultOutput, runPreview } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const user = { did: 'did:user', group: 'group-1', userId: 'u-1' };
const ref = { policyId: 'policy-1', tag: 'form' };
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

    describe('output and effect input rules', () => {
        it('skips only the inputs that change the screen, a timer or a later retry', () => {
            assert.deepEqual([...PREVIEW_SKIPPED_INPUTS].sort(), [
                'GetDataEvent',
                'RefreshEvent',
                'ReleaseEvent',
                'RestoreEvent',
                'RetryMintEvent',
                'StartTimerEvent',
                'StopTimerEvent',
                'TimerEvent'
            ]);
        });

        it('lets a link in through every input that passes documents on', () => {
            for (const input of ['RunEvent', 'PopEvent', 'AdditionalMintEvent', 'ToolEvent', 'ModuleEvent', 'calc_input']) {
                assert.equal(isPreviewInputAllowed(input), true, input);
            }
            for (const input of ['RefreshEvent', 'ReleaseEvent', 'TimerEvent', 'RestoreEvent', 'RetryMintEvent', 'GetDataEvent']) {
                assert.equal(isPreviewInputAllowed(input), false, input);
            }
        });

        it('records a document as a result for every output except screen refresh and release', () => {
            for (const output of ['RunEvent', 'ErrorEvent', 'ReferenceEvent', 'Option_1']) {
                assert.equal(isPreviewResultOutput(output), true, output);
            }
            assert.equal(isPreviewResultOutput('RefreshEvent'), false);
            assert.equal(isPreviewResultOutput('ReleaseEvent'), false);
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

    describe('DID generation effect boundary', () => {
        it('creates a real local DID in preview without consuming replay or recording it', async () => {
            const context = {
                _runningController: { nextDID: async () => { throw new Error('must not consume replay'); } },
                _recordingController: { generateDidDocument: async () => { throw new Error('must not record'); } }
            };
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            const [first, second] = await PreviewScope.run(step, async () => [
                await ComponentsService.prototype.generateDID.call(context, '0.0.123', 'action-1'),
                await ComponentsService.prototype.generateDID.call(context, '0.0.123', 'action-1')
            ]);
            assert.match(first.getDid(), /^did:hedera:.*_0\.0\.123$/);
            assert.equal(first.getDocument().id, first.getDid());
            assert.notEqual(first.getDid(), second.getDid());
        });

        it('keeps ordinary replay unchanged', async () => {
            const calls = [];
            const context = {
                _runningController: { nextDID: async (...args) => { calls.push(args); return 'recorded-did'; } },
                _recordingController: { generateDidDocument: async () => { throw new Error('must not record replay'); } }
            };
            assert.equal(await ComponentsService.prototype.generateDID.call(context, '0.0.123', 'action-1'), 'recorded-did');
            assert.deepEqual(calls, [['0.0.123']]);
        });

        it('records ordinary generated DIDs with the original action id', async () => {
            const calls = [];
            const context = { _recordingController: { generateDidDocument: async (...args) => calls.push(args) } };
            const document = await ComponentsService.prototype.generateDID.call(context, '0.0.123', 'action-2');
            assert.deepEqual(calls, [[document, 'action-2']]);
            assert.match(document.getDid(), /^did:hedera:/);
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

        it('collects block errors into the response with the block type and error data', async () => {
            const res = await runPreview(formBlock(), user, {}, async (block, previewUser, data, step) => {
                step.addError(new Error('math failed'), 'mathBlock');
                step.addError(Object.assign(new Error('script failed'), { data: { line: 3 } }), 'customLogicBlock');
                step.addError('no block');
                return new MessageResponse({});
            });
            assert.deepEqual(res.body.errors, [
                { message: 'math failed', blockType: 'mathBlock', errorData: null },
                { message: 'script failed', blockType: 'customLogicBlock', errorData: { line: 3 } },
                { message: 'no block', blockType: null, errorData: null }
            ]);
        });

        it('returns discovery fields without enforcing input completeness', async () => {
            const res = await runPreview(formBlock(), user, {}, async (block, previewUser, data, step) => {
                step.setPreviewSource({
                    schema: '#S',
                    document: { amount: 2 },
                    paths: ['amount', 'rate'],
                    dependencies: {},
                    discovery: true
                });
                step.addPreviewRead('#S', 'amount');
                step.addPreviewRead('#S', 'rate');
                return new MessageResponse({});
            });
            assert.deepEqual(res.body.fields, ['amount', 'rate']);
            assert.deepEqual(res.body.missingFields, ['rate']);
        });

        it('rejects missing dynamic inputs found after the form returns without exposing results', async () => {
            let runs = 0;
            const res = await runPreview(formBlock(), user, { fields: [], missingFields: [] }, async (_block, _user, _data, step) => {
                runs++;
                step.setPreviewSource({ schema: '#S', document: { amount: 2 },
                    paths: ['amount', 'rate'], dependencies: {} });
                step.inc();
                setTimeout(() => {
                    step.addPreviewRead('#S', 'amount');
                    step.addPreviewRead('#S', 'rate');
                    step.addError(new Error('Calculation returned a non-finite number'), 'mathBlock');
                    step.addPreviewDocument('math', null, { data: { total: 4 } });
                    step.dec();
                }, 0);
                return new MessageResponse({ total: 4 });
            });
            assert.equal(runs, 1);
            assert.ok(res instanceof MessageError);
            assert.equal(res.code, 422);
            assert.equal(res.body, null);
            assert.deepEqual(res.data, { preview: true, fields: ['amount', 'rate'], missingFields: ['rate'] });
            assert.equal('documents' in res.data, false);
            assert.equal('calculations' in res.data, false);
        });

        for (const failure of ['throw', 'response']) {
            it(`returns missing inputs when preparation fails through ${failure}`, async () => {
                const res = await runPreview(formBlock(), user, {}, async (_block, _user, _data, step) => {
                    step.setPreviewSource({ schema: '#S', document: { amount: 2 },
                        paths: ['amount', 'bonus', 'total'], dependencies: { total: ['amount', 'bonus'] } });
                    step.addPreviewRead('#S', 'total');
                    if (failure === 'throw') {
                        throw new Error('Invalid expression');
                    }
                    return new MessageError('Invalid expression', 500);
                });
                assert.ok(res instanceof MessageError);
                assert.equal(res.code, 422);
                assert.equal(res.body, null);
                assert.deepEqual(res.data, { preview: true, fields: ['amount', 'bonus'], missingFields: ['bonus'] });
            });
        }

        it('validates each request independently and accepts zero, false and unrelated missing fields', async () => {
            let runs = 0;
            const execute = async (_block, _user, data, step) => {
                runs++;
                step.setPreviewSource({ schema: '#S', document: data.document,
                    paths: ['amount', 'flag', 'unrelated'], dependencies: {} });
                step.addPreviewRead('#S', 'amount');
                step.addPreviewRead('#S', 'flag');
                return new MessageResponse({ total: 0 });
            };
            const missing = await runPreview(formBlock(), user, { document: { amount: 0 } }, execute);
            assert.equal(missing.code, 422);
            assert.deepEqual(missing.data.missingFields, ['flag']);
            const complete = await runPreview(formBlock(), user,
                { document: { amount: 0, flag: false }, fields: ['unrelated'], missingFields: ['unrelated'] }, execute);
            assert.ok(complete instanceof MessageResponse);
            assert.deepEqual(complete.body.fields, ['amount', 'flag']);
            assert.deepEqual(complete.body.missingFields, []);
            assert.equal(runs, 2);
        });

        it('rejects a missing nested input reported by a dynamic read', async () => {
            const res = await runPreview(formBlock(), user, {}, async (_block, _user, _data, step) => {
                step.setPreviewSource({ schema: '#S', document: { location: {} },
                    paths: ['location', 'location.lat'], dependencies: {} });
                step.addPreviewRead('#S', 'location.lat');
                return new MessageResponse({});
            });
            assert.equal(res.code, 422);
            assert.deepEqual(res.data.missingFields, ['location.lat']);
        });

        it('rejects an empty required field even when every calculation succeeded', async () => {
            const res = await runPreview(formBlock(), user, {}, async (_block, _user, _data, step) => {
                step.setPreviewSource({ schema: '#S', document: { amount: 5, rows: [] },
                    paths: ['amount', 'bonus', 'rows'], dependencies: {} });
                step.addPreviewRead('#S', 'amount');
                step.addPreviewRead('#S', 'bonus');
                step.addPreviewRead('#S', 'rows');
                return new MessageResponse({ total: 10, sum: 0 });
            });
            assert.equal(res.code, 422);
            assert.deepEqual(res.data, { preview: true, fields: ['amount', 'bonus', 'rows'], missingFields: ['bonus', 'rows'] });
        });

        it('never requires a hidden field', async () => {
            const res = await runPreview(formBlock(), user, {}, async (_block, _user, _data, step) => {
                step.setPreviewSource({ schema: '#S', document: { amount: 5 },
                    paths: ['amount', 'secret', 'group', 'group.code'], dependencies: {}, hidden: ['secret', 'group'] });
                step.addPreviewRead('#S', 'amount');
                step.addPreviewRead('#S', 'secret');
                step.addPreviewRead('#S', 'group.code');
                return new MessageResponse({ total: 10 });
            });
            assert.ok(res instanceof MessageResponse);
        });

        it('rethrows when the form block throws', async () => {
            await assert.rejects(
                () => runPreview(formBlock(), user, {}, async () => { throw new Error('form failed'); }),
                /form failed/
            );
        });
    });
});
