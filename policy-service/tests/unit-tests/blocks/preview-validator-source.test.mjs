import assert from 'node:assert/strict';
import { VcDocument } from '@guardian/common/entity/vc-document';
import { MessageResponse } from '@guardian/common/models/message-response';
import { makeBlock, makeComponents, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/blocks/document-validator-block.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { markPreviewStoredDocuments, runPreview, setPreviewComputed } from '../../../dist/policy-engine/helpers/preview.js';

const user = makeUser();
const item = (subject = {}) => ({ policyId: 'policy-1', schema: '#S', owner: user.did,
    document: PolicyUtils.createVcFromSubject(subject).toJsonTree() });

describe('@unit Preview source validator attributes temporary and stored records', () => {
    const originalExternal = PolicyComponentsUtils.ExternalEventFn;
    const originalError = PolicyComponentsUtils.BlockErrorFn;
    before(() => {
        PolicyComponentsUtils.ExternalEventFn = async () => undefined;
        PolicyComponentsUtils.BlockErrorFn = async () => undefined;
    });
    after(() => {
        PolicyComponentsUtils.ExternalEventFn = originalExternal;
        PolicyComponentsUtils.BlockErrorFn = originalError;
        restoreHarness();
    });

    for (const side of ['field', 'value']) {
        it(`requires the missing ${side} read from a temporarily saved current Request`, async () => {
            let saved;
            const databaseServer = createPreviewDatabaseServer({
                find: async () => [],
                save: async () => { throw new Error('Preview must not persist'); },
                async saveVC(row) { return this.save(VcDocument, row); },
                async getVcDocuments(filter) { return this.find(VcDocument, filter); }
            }, null);
            const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_ref, current, _data, step) => {
                step.setPreviewSource({ schema: '#S', document: {}, paths: ['amount'], dependencies: {} });
                saved = await databaseServer.saveVC(item());
                const condition = side === 'field'
                    ? { field: 'document.credentialSubject.0.amount', fieldSource: 'source', type: 'equal', value: 5, valueSource: 'value' }
                    : { field: 5, fieldSource: 'value', type: 'equal', value: 'document.credentialSubject.0.amount', valueSource: 'source' };
                const { block } = makeBlock(DocumentValidatorBlock, {
                    components: makeComponents({ databaseServer }),
                    options: { onErrorAction: 'no-action', sourceValidations: [{ conditions: [condition] }] }
                });
                block.triggerEvents = async () => undefined;
                await block.runAction({ user: current, data: { data: item() }, actionStatus: step });
                return new MessageResponse(null);
            });
            assert.ok(saved);
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['amount']);
        });
    }

    for (const origin of ['stored', 'computed', 'other-schema']) {
        it(`excludes a ${origin} source read from current-form requirements`, async () => {
            let reads;
            const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_ref, current, _data, step) => {
                step.setPreviewSource({ schema: '#S', document: {}, paths: ['amount'], dependencies: {} });
                const source = origin === 'stored' ? markPreviewStoredDocuments(item({ amount: 5 }))
                    : origin === 'computed' ? setPreviewComputed(item({ amount: 5 }), ['amount'])
                    : { ...item({ amount: 5 }), schema: '#Other' };
                const { block, db } = makeBlock(DocumentValidatorBlock, { options: { onErrorAction: 'no-action',
                    sourceValidations: [{ conditions: [{ field: 'document.credentialSubject.0.amount', fieldSource: 'source', type: 'equal', value: 5, valueSource: 'value' }] }] } });
                db.getVcDocuments = async () => [source];
                block.triggerEvents = async () => undefined;
                await block.runAction({ user: current, data: { data: item() }, actionStatus: step });
                reads = step.getPreviewReads();
                return new MessageResponse(null);
            });
            assert.equal(response.code, 200);
            assert.deepEqual(response.body.errors, []);
            assert.deepEqual(reads, []);
        });
    }
});
