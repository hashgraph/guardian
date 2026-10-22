import { assert } from 'chai';
import esmock from 'esmock';
import { AssignedEntityType, ExternalPolicyStatus, ExternalPolicyType, MessageAPI, PolicyStatus, RemoteJoinStatus } from '@guardian/interfaces';

/*
 * On the home instance a user who disconnected from a remote policy reconnects by
 * importing it again: the import must send a fresh join even though the earlier join
 * was answered, because the Main instance reconnects the user only on a newer join.
 */
const OWNER_DID = 'did:hedera:testnet:owner_0.0.7';

async function loadHelper() {
    const calls = { sent: [], resolved: [] };
    const helper = await esmock('../../dist/api/helpers/remote-policy-join-helper.js', {
        '@guardian/common/helpers/users': {
            Users: class {
                async getUserById(did) {
                    return { id: 'u-1', did, hederaAccountId: '0.0.100', role: 'USER', location: 'LOCAL', parent: 'did:home-sr' };
                }
                async getHederaAccount() { return { hederaAccountId: '0.0.100', hederaAccountKey: 'key', signOptions: {} }; }
            },
        },
        '@guardian/hedera/message/message-server': {
            MessageServer: class {
                static async getMessage() { return { owner: OWNER_DID, payer: '0.0.9' }; }
                setTopicObject() { return this; }
                async sendMessage(message) {
                    calls.sent.push(message);
                    return { getId: () => `join-${calls.sent.length + 1}` };
                }
            },
        },
        '@guardian/hedera/vcjs/did/hedera-did': {
            HederaDid: { parse: () => ({ topicId: '0.0.7' }) },
        },
        '@guardian/hedera/published-did-document': {
            resolveOwnerDidDocument: async (did, topicId, payer) => {
                calls.resolved.push({ did, topicId, payer });
                return {};
            },
        },
        '@guardian/hedera/vc-helper': {
            VcHelper: class { async loadDidDocument() { return {}; } },
        },
        '@guardian/common/helpers/wallet': {
            Wallet: class { async getUserKey() { return 'stored-key'; } },
        },
        '@guardian/common/database-modules/database-server': {
            DatabaseServer: class {
                static async getTopicById() { return {}; }
                static async updateExternalPolicy(row) { return row; }
                static async getKeys() { return [{}]; }
                async getDidDocument() { return { topicId: '0.0.5' }; }
                async getTopic() { return null; }
            },
        },
        '@guardian/hedera/topic': {
            TopicConfig: { fromObject: async () => ({}) },
        },
        '@guardian/hedera/remote-policy-join': {
            createRemoteJoinDocument: () => ({ proof: {}, messageKey: {} }),
        },
        '@guardian/hedera/message/policy-join-message': {
            PolicyJoinMessage: class { setDocument(row, document) { this.row = row; this.document = document; } },
        },
    });
    return { ...helper, calls };
}

const policy = { id: 'view-1', messageId: '1.1', actionsTopicId: '0.0.20' };
const answered = () => ({
    creator: 'did:user',
    status: ExternalPolicyStatus.APPROVED,
    type: ExternalPolicyType.IMPORT,
    joinStatus: RemoteJoinStatus.ACCEPTED,
    joinMessageId: 'join-1',
    joinReplyMessageId: 'reply-1',
});
const logger = { error: async () => null };

describe('@unit remote policy join on the home instance', function () {
    this.timeout(60000);

    it('does not send a join again once it was answered', async () => {
        const { sendRemotePolicyJoin, calls } = await loadHelper();
        const item = answered();

        await sendRemotePolicyJoin(policy, item, logger, true);

        assert.lengthOf(calls.sent, 0);
        assert.equal(item.joinStatus, RemoteJoinStatus.ACCEPTED);
    });

    it('sends a fresh join to reconnect', async () => {
        const { sendRemotePolicyJoin, calls } = await loadHelper();
        const item = answered();

        await sendRemotePolicyJoin(policy, item, logger, true, true);

        assert.lengthOf(calls.sent, 1);
        assert.equal(item.joinStatus, RemoteJoinStatus.SENT);
        assert.equal(item.joinMessageId, 'join-2');
        assert.isNull(item.joinReplyMessageId);
    });

    it('resolves the owner DID from its DID topic, with the policy payer for an open topic', async () => {
        const { sendRemotePolicyJoin, calls } = await loadHelper();

        await sendRemotePolicyJoin(policy, { ...answered(), joinStatus: undefined, joinMessageId: undefined }, logger);

        assert.deepEqual(calls.resolved, [{ did: OWNER_DID, topicId: '0.0.7', payer: '0.0.9' }]);
    });
});

describe('@unit remote policy import after a disconnection', function () {
    this.timeout(60000);

    async function loadImport(request) {
        const handlers = new Map();
        const joins = [];
        await (await esmock('../../dist/api/external-policies.service.js', {
            '../../dist/api/helpers/api-response.js': {
                ApiResponse: (event, handler) => handlers.set(event, handler),
            },
            '../../dist/api/helpers/remote-policy-join-helper.js': {
                sendRemotePolicyJoin: async (policyRow, item, log, retryRejected, force) => {
                    joins.push({ retryRejected, force, type: item.type });
                    return item;
                },
                sendRemotePolicyJoins: async () => null,
            },
            '@guardian/common/database-modules/database-server': {
                DatabaseServer: class {
                    static async getPolicy() { return { id: 'view-1', status: PolicyStatus.VIEW, messageId: '1.1' }; }
                    static async getExternalPolicy() { return request; }
                    static async updateExternalPolicy(row) { return row; }
                    static async getAssignedEntity() { return null; }
                    static async assignEntity(type) { assert.equal(type, AssignedEntityType.RemotePolicy); }
                },
            },
        })).externalPoliciesAPI({ error: async () => null });
        return { handler: handlers.get(MessageAPI.IMPORT_EXTERNAL_POLICY), joins };
    }

    it('importing a disconnected policy again forces a fresh join', async () => {
        const { handler, joins } = await loadImport({ ...answered(), type: ExternalPolicyType.DISCONNECT });

        await handler({ messageId: '1.1', owner: { creator: 'did:user', owner: 'did:home-sr' } });

        assert.deepEqual(joins, [{ retryRejected: true, force: true, type: ExternalPolicyType.IMPORT }]);
    });

    it('importing a connected policy again only retries a failed or rejected join', async () => {
        const { handler, joins } = await loadImport(answered());

        await handler({ messageId: '1.1', owner: { creator: 'did:user', owner: 'did:home-sr' } });

        assert.deepEqual(joins, [{ retryRejected: true, force: false, type: ExternalPolicyType.IMPORT }]);
    });
});
