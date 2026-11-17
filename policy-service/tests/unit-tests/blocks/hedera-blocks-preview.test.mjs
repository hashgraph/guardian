import { installCredentialPreparation } from '../helpers/credential-preparation-stubs.mjs';
import { createPreviewCredential, createPreviewDocument } from '../helpers/preview-document-fixture.mjs';
import assert from 'node:assert/strict';
import esmock from 'esmock';
import { createInMemoryDatabaseHelper } from '../helpers/in-memory-database-helper.mjs';
import { MessageServer } from '@guardian/hedera/message/message-server';
import { VCMessage } from '@guardian/hedera/message/vc-message';
import { MessageAction } from '@guardian/hedera/message/message-action';
import { TopicConfig } from '@guardian/hedera/topic';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { MintService } from '../../../dist/policy-engine/mint/mint-service.js';
import { PreviewScope, getPreviewMessages } from '../../../dist/policy-engine/helpers/preview.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { SendToGuardianBlock } from '../../../dist/policy-engine/blocks/send-to-guardian-block.js';
import { RevocationBlock } from '../../../dist/policy-engine/blocks/revocation-block.js';
import { CreateTokenBlock } from '../../../dist/policy-engine/blocks/create-token-block.js';
import { MintBlock } from '../../../dist/policy-engine/blocks/mint-block.js';
import { RetirementBlock } from '../../../dist/policy-engine/blocks/retirement-block.js';
import { makeBlock, makeComponents, makeUser, restoreHarness } from './_block-exec-harness.mjs';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});

class Topic {}
class Token {}
class MintRequest {}

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
const inPreview = (step, callback) => PreviewScope.run(step, callback);
const vcDocument = (subject) => createPreviewDocument({ policyId: 'policy-1', tag: 't' }, null, { id: 'did:subject', type: 'Plot', ...subject }, null, 'did:user', null).document;
const ROOT_TOPIC = '0.0.100';

describe('@unit Hedera blocks in a preview', () => {
    let releaseCredentials;
    beforeEach(() => { releaseCredentials = installCredentialPreparation(); });

    let server;

    beforeEach(() => {
        db.reset();
        db.seed(Topic, [{ policyId: 'policy-1', type: 'INSTANCE_POLICY_TOPIC', topicId: ROOT_TOPIC, name: 'root' }]);
        server = createPreviewDatabaseServer(new DatabaseServer(null), null);
        patch(PolicyComponentsUtils, { GetBlockRef: (block) => block, ExternalEventFn: () => undefined });
        patch(PolicyActionsUtils, { needKey: () => false });
        patch(PolicyUtils, {
            getUserCredentials: async (ref, did) => ({ did, hederaAccountId: '0.0.1', location: 'local' }),
            getDocumentRelayerAccount: async () => '0.0.1',
            getBlockTags: async () => []
        });
    });
    afterEach(() => restore());
    after(() => restoreHarness());


    it('registers a sent message in the preview instead of sending it', async () => {
        const step = previewStep();
        patch(MessageServer.prototype, { sendMessage: async () => { throw new Error('must not send in a preview'); } });
        const message = new VCMessage(MessageAction.CreateVC);
        const topic = new TopicConfig({ topicId: '0.0.7' }, null, null);
        const sent = await inPreview(step, () => PolicyActionsUtils.sendMessage({ ref: { policyId: 'policy-1' }, topic, message, owner: 'did:user', relayerAccount: null, updateIpfs: true, userId: null }));
        assert.match(sent.getId(), /^\d{10}\.\d{9}$/);
        assert.equal(sent.getTopicId(), '0.0.7');
        assert.deepEqual(getPreviewMessages(step, '0.0.7'), [sent]);
        assert.deepEqual(getPreviewMessages(previewStep(), '0.0.7'), []);
    });

    it('creates a topic only in the preview, linked to the policy topic', async () => {
        const step = previewStep();
        const ref = { policyId: 'policy-1', databaseServer: server, policyStatus: 'PUBLISH', policyAvailability: 'private' };
        const [topic, found] = await inPreview(step, async () => {
            const created = await PolicyActionsUtils.createTopic({ ref, type: 'DYNAMIC_TOPIC', config: { name: 'project', description: 'd' }, owner: 'did:user', relayerAccount: null, memoObj: null, userId: null });
            return [created, await server.getTopic({ policyId: 'policy-1', name: 'project' })];
        });
        assert.match(topic.topicId, /^0\.0\.\d+$/);
        assert.equal(topic.parent, ROOT_TOPIC);
        assert.equal(found.topicId, topic.topicId);
        assert.equal(db.records(Topic).length, 1);
    });

    it('lets a revocation in the same preview find the document a save published', async () => {
        const step = previewStep();
        patch(MessageServer, { getMessages: async () => [] });
        patch(PolicyActionsUtils, {
            sendMessages: async () => { throw new Error('revocation messages must not be sent'); }
        });
        const save = makeBlock(SendToGuardianBlock, {
            options: { dataSource: 'auto', topic: 'root', topicOwner: 'user', skipSaveState: true },
            components: makeComponents({ databaseServer: server })
        }).block;
        const revocation = makeBlock(RevocationBlock, {
            options: {},
            components: makeComponents({ databaseServer: server })
        }).block;
        const saved = [];
        const revoked = [];
        save.triggerEvents = async (type, user, data) => { if (type === 'RunEvent') { saved.push(data.data); } };
        revocation.triggerEvents = async (type, user, data) => { if (type === 'RunEvent') { revoked.push(...data.data); } };
        restore();
        patch(PolicyComponentsUtils, { GetBlockRef: (block) => block, ExternalEventFn: () => undefined });
        patch(PolicyActionsUtils, { needKey: () => false });
        patch(PolicyUtils, {
            getUserCredentials: async (ref, did) => ({ did, hederaAccountId: '0.0.1', location: 'local' }),
            getDocumentRelayerAccount: async () => '0.0.1',
            getUserByIssuer: async () => ({ hederaAccountId: '0.0.1', roleMessage: null }),
            getBlockTags: async () => [],
            encryptVC: async (ref, document) => document
        });
        patch(MessageServer, { getMessages: async () => [] });
        const user = makeUser();
        await inPreview(step, async () => {
            await save.runAction({ user, data: { data: { policyId: 'policy-1', owner: 'did:user', document: vcDocument({ area: 7 }) } }, actionStatus: step });
            const document = { ...saved[0], option: { comment: ['wrong area'] } };
            await revocation.runAction({ user, data: { data: document }, actionStatus: step });
        });
        assert.deepEqual(step.getErrors(), []);
        assert.equal(saved[0].topicId, ROOT_TOPIC);
        assert.deepEqual(revoked.map((item) => [item.messageId, item.option.status, item.comment]), [[saved[0].messageId, 'Revoked', 'wrong area']]);
        assert.equal(getPreviewMessages(step, ROOT_TOPIC)[0].isRevoked(), true);
    });

    it('records the mint request in the preview only and starts no token transfer', async () => {
        const step = previewStep();
        patch(MintService, {
            getMultipleConfig: async () => null,
            getTokenConfig: async () => ({ treasuryId: '0.0.3' })
        });
        const ref = { policyId: 'policy-1', databaseServer: server };
        const [requests] = await inPreview(step, async () => {
            await MintService.mint({
                ref,
                token: { tokenId: '0.0.9', tokenType: 'fungible', decimals: 2 },
                tokenValue: 150,
                documentOwner: makeUser(),
                policyOwnerHederaCred: null,
                targetAccount: '0.0.5',
                vpMessageId: '1700000000.000000001',
                transactionMemo: 'memo',
                documents: [],
                policyOwnerSignOptions: null,
                relayerAccount: '0.0.1',
                userId: null
            });
            return [await server.find(MintRequest, { vpMessageId: '1700000000.000000001' })];
        });
        assert.deepEqual(requests.map((item) => [item.amount, item.target, item.isTransferNeeded]), [[150, '0.0.5', true]]);
        assert.equal(db.records(MintRequest).length, 0);
    });

    const ownerCredentials = () => ({
        did: 'did:owner',
        hederaAccountId: '0.0.1',
        location: 'local',
        loadDidDocument: async () => ({ getDid: () => 'did:owner' }),
        loadHederaCredentials: async () => ({ hederaAccountId: '0.0.1', hederaAccountKey: 'key' }),
        loadSignOptions: async () => ({})
    });

    it('mints in a preview with unsigned documents saved only in the preview and preview messages', async () => {
        const step = previewStep();
        patch(PolicyUtils, {
            getUserCredentials: async () => ownerCredentials(),
            loadSchemaByType: async () => ({ iri: '#MintToken', contextURL: 'schema:mint' }),
            getPolicyTopic: async () => new TopicConfig({ topicId: ROOT_TOPIC }, null, null)
        });
        patch(MintService, {
            getMultipleConfig: async () => null,
            getTokenConfig: async () => ({ treasuryId: '0.0.3' })
        });
        patch(MessageServer.prototype, { sendMessage: async () => { throw new Error('must not send in a preview'); } });
        const { block } = makeBlock(MintBlock, {
            options: { rule: 'area', accountType: 'default' },
            components: makeComponents({ databaseServer: server, generateUUID: async () => 'urn:uuid:m' })
        });
        block.getAddons = () => [];
        const source = createPreviewCredential({ type: 'Plot', area: 12 }, 'did:user', 'urn:uuid:s');
        const [vp, amount] = await inPreview(step, () => block.mintProcessing(
            { tokenId: '0.0.9', tokenType: 'fungible', decimals: 0 },
            ROOT_TOPIC, makeUser(), '0.0.1', '0.0.5', [source], ['1700000000.000000001'], [], null, step
        ));
        const requests = await inPreview(step, () => server.find(MintRequest, { vpMessageId: vp.messageId }));
        assert.equal(amount, 12);
        assert.equal(vp.document.proof, undefined);
        assert.match(vp.messageId, /^\d{10}\.\d{9}$/);
        assert.equal(getPreviewMessages(step, ROOT_TOPIC).length, 2);
        assert.deepEqual(requests.map((item) => [item.amount, item.target]), [[12, '0.0.5']]);
        assert.equal(db.records(MintRequest).length, 0);
    });

    it('builds the retirement documents unsigned in a preview', async () => {
        const { block } = makeBlock(RetirementBlock, {
            options: {},
            components: makeComponents({ generateUUID: async () => 'urn:uuid:w' })
        });
        patch(PolicyUtils, { loadSchemaByType: async () => ({ iri: '#WipeToken', contextURL: 'schema:wipe' }) });
        const [wipe, vp] = await inPreview(previewStep(), async () => {
            const vc = await block.createWipeVC({ getDid: () => 'did:owner' }, { tokenId: '0.0.9' }, '3', block, [1, 2], 'step');
            return [vc, await block.createVP({ getDid: () => 'did:owner' }, 'urn:uuid:p', [vc])];
        });
        assert.equal(wipe.getProof(), null);
        assert.equal(wipe.getIssuerDid(), 'did:owner');
        assert.equal(wipe.getCredentialSubject(0).getField('serialNumbers'), '1,2');
        assert.equal(vp.getId(), 'urn:uuid:p');
    });

    it('does not wipe tokens in a preview', async () => {
        await inPreview(previewStep(), () => MintService.wipe({
            ref: { policyId: 'policy-1' },
            token: { tokenId: '0.0.9', wipeContractId: '0.0.11' },
            tokenValue: 1,
            root: null,
            targetAccount: '0.0.5',
            relayerAccount: '0.0.1',
            uuid: 'u',
            userId: null
        }));
    });

    it('creates the token of an autorun block only in the preview and passes it on', async () => {
        const step = previewStep();
        patch(PolicyUtils, {
            getUserCredentials: async () => ({ did: 'did:owner', hederaAccountId: '0.0.1', loadHederaCredentials: async () => ({}), loadSignOptions: async () => ({}) }),
            getInstancePolicyTopic: async () => new TopicConfig({ topicId: ROOT_TOPIC }, null, null),
            createTokenByTemplate: async () => { throw new Error('must not create a token on Hedera in a preview'); }
        });
        const { block } = makeBlock(CreateTokenBlock, {
            options: { autorun: true, template: 'carbon' },
            components: makeComponents({ databaseServer: server, getTokenTemplate: () => ({ tokenName: 'Carbon', tokenSymbol: 'C' }) })
        });
        block.state = { tokenNumber: 2, 'did:user': { active: true } };
        const passed = [];
        block.triggerEvents = async (type, user, data) => { if (type === 'RunEvent') { passed.push(data.data); } };
        const document = { owner: 'did:user', document: vcDocument({ area: 1 }) };
        const tokens = await inPreview(step, async () => {
            await block.runAction({ user: makeUser(), data: { data: document }, actionStatus: step });
            return await server.find(Token, { policyId: 'policy-1' });
        });
        assert.deepEqual(step.getErrors(), []);
        assert.equal(tokens.length, 1);
        assert.equal(tokens[0].tokenName, 'Carbon');
        assert.equal(passed[0].tokens.carbon, tokens[0].tokenId);
        assert.equal(getPreviewMessages(step, ROOT_TOPIC).length, 1);
        assert.deepEqual(block.state, { tokenNumber: 2, 'did:user': { active: true } });
        assert.equal(db.records(Token).length, 0);
    });
    afterEach(() => releaseCredentials());

});
