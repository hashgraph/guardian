import { installCredentialPreparation } from '../helpers/credential-preparation-stubs.mjs';
import { createPreviewDocument } from '../helpers/preview-document-fixture.mjs';
import assert from 'node:assert/strict';
import esmock from 'esmock';
import { ObjectId } from '@mikro-orm/mongodb';
import { MessageServer } from '@guardian/hedera/message/message-server';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { createInMemoryDatabaseHelper } from '../helpers/in-memory-database-helper.mjs';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PreviewScope, createPreviewMessageId, getPreviewComputed, getPreviewDocumentSchema, runPreview, setPreviewComputed, setPreviewDocumentSchema } from '../../../dist/policy-engine/helpers/preview.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { SendToGuardianBlock } from '../../../dist/policy-engine/blocks/send-to-guardian-block.js';
import { ReassigningBlock } from '../../../dist/policy-engine/blocks/reassigning.block.js';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
import { AggregateBlock } from '../../../dist/policy-engine/blocks/aggregate-block.js';
import { DocumentsSourceAddon } from '../../../dist/policy-engine/blocks/documents-source-addon.js';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { makeBlock, makeComponents, makeUser, restoreHarness } from './_block-exec-harness.mjs';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});

class VcDocument {}
class Topic {}

const originals = [];
const patch = (target, map) => {
    for (const [key, value] of Object.entries(map)) {
        originals.push([target, key, target[key]]);
        target[key] = value;
    }
};
const restore = () => {
    while (originals.length) {
        const [target, key, value] = originals.pop();
        target[key] = value;
    }
};

const previewStep = () => new RecordActionStep(() => undefined, 0, true, true, undefined, true);
const vcJson = (subject) => createPreviewDocument({ policyId: 'policy-1', tag: 't' }, null, { id: 'did:subject', type: 'Plot', ...subject }, null, 'did:user', null).document;
const ID_OLD = '64b7f0a1c2d3e4f5a6b7c8e1';

describe('@unit save, reassign and request edit in a preview', () => {
    let releaseCredentials;
    beforeEach(() => { releaseCredentials = installCredentialPreparation(); });

    beforeEach(() => patch(PolicyComponentsUtils, { GetBlockRef: (block) => block, ExternalEventFn: () => undefined }));
    afterEach(() => restore());
    after(() => restoreHarness());

    it('makes a message id in the consensus timestamp format, unique and increasing', () => {
        const first = createPreviewMessageId();
        const second = createPreviewMessageId();
        assert.match(first, /^\d{10}\.\d{9}$/);
        assert.ok(second > first);
    });

    describe('save block', () => {
        let server;
        let block;
        let events;

        beforeEach(() => {
            db.reset();
            db.seed(VcDocument, [{
                _id: new ObjectId(ID_OLD),
                policyId: 'policy-1',
                owner: 'did:user',
                hash: 'old-hash',
                edited: false,
                documentFields: ['credentialSubject.0.area'],
                document: vcJson({ area: 1 })
            }]);
            db.seed(Topic, [{ policyId: 'policy-1', type: 'INSTANCE_POLICY_TOPIC', topicId: '0.0.100' }]);
            server = createPreviewDatabaseServer(new DatabaseServer(null), null);
            ({ block } = makeBlock(SendToGuardianBlock, {
                options: { dataSource: 'auto', topic: 'root', topicOwner: 'user', skipSaveState: true },
                components: makeComponents({ databaseServer: server })
            }));
            events = [];
            block.triggerEvents = async (type, user, data) => { events.push({ type, data }); };
            patch(PolicyUtils, {
                getDocumentOwner: async () => makeUser(),
                getBlockTags: async () => [],
                getDocumentRelayerAccount: async () => '0.0.1',
                getUserByIssuer: async () => ({ hederaAccountId: '0.0.1', roleMessage: null }),
                getUserCredentials: async (ref, did) => ({ did, location: 'local' }),
                encryptVC: async (ref, document) => document
            });
            patch(PolicyActionsUtils, { needKey: () => false });
            patch(MessageServer.prototype, { sendMessage: async () => { throw new Error('must not send a message in a preview'); } });
        });

        it('saves into the preview only, publishes to the policy topic only in the preview, marks the old version edited there, and passes the document on', async () => {
            const step = previewStep();
            const user = makeUser();
            const document = { policyId: 'policy-1', owner: 'did:user', document: vcJson({ area: 7 }) };
            const old = await server.getVcDocument({ _id: new ObjectId(ID_OLD) });
            const current = await PreviewScope.run(step, async () => {
                await block.runAction({ user, data: { data: document, old }, actionStatus: step });
                return await server.getVcDocuments({ policyId: 'policy-1', edited: { $ne: true } });
            });
            assert.deepEqual(step.getErrors(), []);
            const passed = events.find((event) => event.type === 'RunEvent').data.data;
            assert.equal(passed.hederaStatus, 'ISSUE');
            assert.match(passed.messageId, /^\d{10}\.\d{9}$/);
            assert.equal(passed.startMessageId, passed.messageId);
            assert.equal(passed.topicId, '0.0.100');
            assert.ok(passed.hash);
            assert.deepEqual(current.map((item) => item.document.credentialSubject[0].area), [7]);
            assert.deepEqual(db.records(VcDocument).map((item) => [item.id, item.edited]), [[ID_OLD, false]]);
            assert.equal(db.calls.some(([name]) => name === 'save' || name === 'update'), false);
        });

        it('keeps the preview marks of each saved document on the document it passes on', async () => {
            const step = previewStep();
            const marked = setPreviewComputed(setPreviewDocumentSchema({ policyId: 'policy-1', owner: 'did:user',
                document: vcJson({ area: 7, temp: 8 }) }, '#S'), ['temp']);
            const plain = { policyId: 'policy-1', owner: 'did:user', document: vcJson({ area: 9 }) };
            await PreviewScope.run(step, () => block.runAction({ user: makeUser(), data: { data: [marked, plain] }, actionStatus: step }));
            assert.deepEqual(step.getErrors(), []);
            const passed = events.find((event) => event.type === 'RunEvent').data.data;
            assert.deepEqual(passed.map((item) => item.document.credentialSubject[0].area), [7, 9]);
            assert.deepEqual(passed.map((item) => getPreviewComputed(item)), [['temp'], []]);
            assert.equal(getPreviewDocumentSchema(passed[0]), '#S');
        });

        for (const route of ['direct', 'source', 'aggregate']) {
          for (const missing of [false, true]) {
            it(`retains computed inputs through ${route} after Save, missing real input=${missing}`, async function () {
            this.timeout(20000);
            const components = makeComponents({ databaseServer: server });
            const script = (calculation) => makeBlock(CustomLogicBlock, { components, options: { unsigned: true, passOriginal: true,
                expression: `const doc=documents[0].document.credentialSubject[0];${calculation}done(documents[0]);` } }).block;
            const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, makeUser(), {}, async (_block, user, _data, step) => {
                step.setPreviewSource({ schema: '#S', document: { amount: 5 }, paths: ['amount', 'temp', 'rate', 'total'], dependencies: {} });
                const first = script('doc.temp=doc.amount+1;');
                const save = makeBlock(SendToGuardianBlock, { components, options: { dataSource: 'database', skipSaveState: true } }).block;
                const last = script(missing ? 'doc.total=doc.temp*doc.rate;' : 'doc.total=doc.temp*2;');
                const source = makeBlock(DocumentsSourceAddon, { components, options: { dataType: 'vc-documents', schema: '#S', filters: [] } }).block;
                const aggregate = makeBlock(AggregateBlock, { uuid: 'aggregate-1', components, options: { aggregateType: 'cumulative', condition: 'true', expressions: [], disableUserGrouping: true, groupByFields: [] } }).block;
                aggregate.triggerEvents = async (type, _user, state) => {
                    if (type === 'RunEvent') await last.runAction({ user, data: state, actionStatus: step });
                };
                first.triggerEvents = async (type, _user, state) => {
                    if (type === 'RunEvent') {
                        await save.runAction({ user, data: state, actionStatus: step });
                    }
                };
                save.triggerEvents = async (type, _user, state) => {
                    if (type === 'RunEvent') {
                        if (route === 'source') {
                            const reread = await source.getFromSource(user, null);
                            await last.runAction({ user, data: { data: reread }, actionStatus: step });
                        } else {
                            await (route === 'aggregate' ? aggregate : last).runAction({ user, data: state, actionStatus: step });
                        }
                    }
                };
                last.triggerEvents = async (type, _user, state) => {
                    if (type === 'RunEvent') {
                        step.addPreviewDocument('last', null, state);
                    }
                };
                const input = createPreviewDocument({ policyId: 'policy-1', tag: 'form' }, null,
                    { id: 'did:subject', type: 'Plot', amount: 5 }, null, 'did:user', null);
                input.schema = '#S';
                await first.runAction({ user, data: { data: input }, actionStatus: step });
                return new MessageResponse({});
            });
            if (missing) {
                assert.ok(response instanceof MessageError);
                assert.equal(response.code, 422);
                assert.deepEqual(response.data.missingFields, ['rate']);
                return;
            }
            assert.ok(response instanceof MessageResponse);
            assert.deepEqual(response.body.fields, ['amount']);
            assert.deepEqual(response.body.missingFields, []);
            assert.equal(response.body.documents[0].document.document.credentialSubject[0].total, 12);
            });
          }
        }
    });

    describe('reassigning block', () => {
        it('builds the reassigned document unsigned and keeps the preview marks', async () => {
            const { block } = makeBlock(ReassigningBlock, {
                options: { issuer: 'policyOwner', actor: 'owner' },
                components: makeComponents({ generateUUID: async () => 'uuid-1' })
            });
            patch(PolicyUtils, {
                getDocumentOwner: async () => makeUser({ id: 'did:owner2', did: 'did:owner2', group: 'g2' }),
                getDocumentRelayerAccount: async () => '0.0.2',
                getUserCredentials: async () => ({ did: 'did:root' }),
                getGroupContext: async () => null,
                getBlockTags: async () => []
            });
            const step = previewStep();
            const document = setPreviewComputed(setPreviewDocumentSchema({
                policyId: 'policy-1',
                owner: 'did:user',
                schema: '#S',
                type: '#S',
                startMessageId: '1700000000.000000001',
                option: { status: 'NEW' },
                document: vcJson({ area: 3 })
            }, '#S'), ['area']);
            const { item } = await PreviewScope.run(step, () => block.documentReassigning(document, makeUser(), 'uid', step));
            assert.equal(item.document.proof, undefined);
            assert.equal(item.document.issuer, 'did:root');
            assert.equal(item.owner, 'did:owner2');
            assert.equal(item.schema, '#S');
            assert.equal(item.startMessageId, '1700000000.000000001');
            assert.equal(item.hederaStatus, 'NEW');
            assert.equal(getPreviewDocumentSchema(item), '#S');
            assert.deepEqual(getPreviewComputed(item), ['area']);
        });
    });

    describe('request block in edit mode', () => {
        it('passes the edited document on with the old version and its start message id, as a normal submit does', async () => {
            const documentRef = {
                id: ID_OLD,
                startMessageId: '1700000000.000000002',
                document: { credentialSubject: [{ id: 'did:parent' }] }
            };
            patch(PolicyUtils, {
                getRelationships: async () => documentRef,
                getRelayerAccountAndOwner: async (ref, user) => ['0.0.1', user],
                setGuardianVersion: () => {}
            });
            patch(PolicyActionsUtils, {
                generateId: async () => 'did:hedera:new',
            });
            const { block } = makeBlock(RequestVcDocumentBlock, { options: { schema: '#S', idType: 'DID', editType: 'edit' }, componentsOverrides: { generateUUID: async () => 'urn:uuid:request' } });
            block._schema = { iri: '#S', fields: [], type: 'Plot', contextURL: 'ctx://x', searchFields: () => [] };
            const events = [];
            block.triggerEvents = async (...args) => { events.push(args); };
            block.getRelationships = async () => documentRef;
            const step = previewStep();
            const item = await PreviewScope.run(step, () => block.setData(makeUser({ id: 'u-1', userId: 'uid-1' }), { document: { amount: 5 }, ref: ID_OLD }, null, step));
            assert.equal(item.startMessageId, '1700000000.000000002');
            assert.deepEqual(item.accounts, { default: '0.0.1' });
            assert.equal(events[0][0], 'RunEvent');
            assert.equal(events[0][2].data, item);
            assert.equal(events[0][2].old, documentRef);
            assert.deepEqual([events[1][0], events[1][2]], ['ReferenceEvent', { data: documentRef }]);
        });
    });
    afterEach(() => releaseCredentials());

});
