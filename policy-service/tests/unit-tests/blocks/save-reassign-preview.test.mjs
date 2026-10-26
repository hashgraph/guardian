import { installCredentialPreparation } from '../helpers/credential-preparation-stubs.mjs';
import { createPreviewDocument } from '../helpers/preview-document-fixture.mjs';
import assert from 'node:assert/strict';
import esmock from 'esmock';
import { ObjectId } from '@mikro-orm/mongodb';
import { MessageServer } from '@guardian/hedera/message/message-server';
import { createInMemoryDatabaseHelper } from '../helpers/in-memory-database-helper.mjs';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PreviewScope, createPreviewMessageId, getPreviewComputed, getPreviewDocumentSchema, setPreviewComputed, setPreviewDocumentSchema } from '../../../dist/policy-engine/helpers/preview.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { SendToGuardianBlock } from '../../../dist/policy-engine/blocks/send-to-guardian-block.js';
import { ReassigningBlock } from '../../../dist/policy-engine/blocks/reassigning.block.js';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
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
