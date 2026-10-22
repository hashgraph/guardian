import { assert } from 'chai';
import esmock from 'esmock';
import { PrivateKey } from '@hiero-ledger/sdk';
import { MessageAction } from '@guardian/hedera/message/message-action';
import { createRemoteJoinDocument } from '@guardian/hedera/remote-policy-join';
import { CommonDidDocument } from '@guardian/hedera/vcjs/did/common-did-document';
import { HederaDid } from '@guardian/hedera/vcjs/did/hedera-did';
import { HederaEd25519Method } from '@guardian/hedera/vcjs/did/components/hedera-ed25519-method';
import { RemoteJoinStatus, RemoteParticipantStatus } from '@guardian/interfaces';

const SERVICE = '../../../dist/policy-engine/policy-join-service.js';

const POLICY = '1706823227.586179534';
const USER_KEY = PrivateKey.generateED25519();
const OWNER_KEY = PrivateKey.generateED25519();
// a DID is the hash of its key
const USER = (await HederaDid.generate('testnet', USER_KEY, '0.0.5')).toString();
const OWNER = (await HederaDid.generate('testnet', OWNER_KEY, '0.0.7')).toString();
const ACCOUNT = '0.0.100';

/*
 * A join request arrives on the actions topic, which has no submit key: anyone can
 * post one. Only the payer and the DID signature tie it to the user, and only the
 * policy owner can open the message key sealed in it.
 */
async function didWithKeys(did, key = did === USER ? USER_KEY : OWNER_KEY) {
    const method = await HederaEd25519Method.generate(did, key);
    const document = CommonDidDocument.from({
        '@context': 'https://www.w3.org/ns/did/v1',
        id: did,
        verificationMethod: [method.toObject(false)],
    });
    document.setPrivateKey(method.getId(), method.getPrivateKey());
    return { document, published: CommonDidDocument.from(document.getDocument()) };
}

function topicMessage(join, { payer = ACCOUNT, owner = USER, accountId = ACCOUNT, timestamp } = {}) {
    const consensusTimestamp = timestamp || `${Math.floor(Date.now() / 1000)}.000000001`;
    return {
        consensusTimestamp,
        owner: payer,
        sequenceNumber: 1,
        topicId: '0.0.9',
        message: JSON.stringify({
            type: 'Policy-Action',
            action: MessageAction.RemotePolicyJoinRequest,
            lang: 'en-US',
            owner,
            accountId,
            policyId: 'home-policy',
            blockTag: 'RemotePolicyJoin',
            cid: `cid-${consensusTimestamp}`,
        }),
        document: join,
    };
}


async function makeService({ user, owner, limit = 100, disconnected = false, resolveFailures = [] } = {}) {
    const store = {
        RemotePolicyParticipant: [],
        DisconnectedPolicy: disconnected ? [{ policyId: 'policy-1', owner: USER }] : [],
    };
    const calls = { users: [], keys: [], replies: [], notifications: [], expired: 0, reconnected: [] };
    const ipfs = new Map();
    let nextId = 1;
    const matches = (row, filter) => Object.entries(filter).every(([k, v]) => row[k] === v);

    const { PolicyJoinService } = await esmock(SERVICE, {
        '@guardian/hedera/message/message-server': {
            MessageServer: class {
                static async loadDocument(message) {
                    message.document = ipfs.get(message.getUrls()[0].cid);
                    return message;
                }
            },
        },
        '@guardian/common/helpers/db-helper': {
            DataBaseHelper: class {
                constructor(entity) { this.rows = store[entity.name]; }
                create(row) { return { ...row }; }
                async findOne(filter) { return this.rows.find((row) => matches(row, filter)) || null; }
                async count(filter) { return this.rows.filter((row) => matches(row, filter)).length; }
                async save(row) {
                    if (!row.id) {
                        row.id = String(nextId++);
                        this.rows.push(row);
                    }
                    return row;
                }
            },
        },
        '@guardian/common/database-modules/database-server': {
            DatabaseServer: class {
                static async reconnectPolicy(policyId, did) {
                    calls.reconnected.push({ policyId, did });
                    store.DisconnectedPolicy.length = 0;
                }
                async reconnectPolicyDocuments() { return null; }
            },
        },
        '@guardian/hedera/remote-policy-join-reply': {
            expireRemoteParticipants: async () => { calls.expired++; },
            remoteJoinLimits: () => ({ pendingLimit: limit, pendingExpiryMs: 1000 }),
            saveRemoteUserMessageKey: async (did, messageId, key) => { calls.keys.push({ did, messageId, key }); },
            sendRemoteJoinReply: async (participant, accepted, userId, key) => {
                calls.replies.push({ participant, accepted, key });
                return 'reply-1';
            },
        },
        '@guardian/hedera/published-did-document': {
            resolvePublishedDidDocument: async (did, topicId, account) => {
                if (resolveFailures.length) { throw resolveFailures.shift(); }
                assert.equal(did, USER);
                assert.equal(account, ACCOUNT);
                return user.published;
            },
        },
        '@guardian/hedera/vc-helper': {
            VcHelper: class {
                async loadDidDocument(did) {
                    assert.equal(did, OWNER);
                    return owner.document;
                }
            },
        },
        '@guardian/common/helpers/users': {
            Users: class {
                async createRemoteUser(did, account, parent) {
                    calls.users.push({ did, account, parent });
                    return { did };
                }
            },
        },
        '@guardian/common/notification/notification-helper': {
            NotificationHelper: { info: async (...args) => { calls.notifications.push(args); } },
        },
    });

    const service = new PolicyJoinService('policy-1', POLICY, OWNER, 'owner-user-id');
    const receive = async (data) => {
        ipfs.set(`cid-${data.consensusTimestamp}`, data.document);
        return await service.processJoinRequest(data);
    };
    const receiveWithRetry = async (data) => {
        ipfs.set(`cid-${data.consensusTimestamp}`, data.document);
        return await service.receiveJoinRequest(data);
    };
    return { service, receive, receiveWithRetry, store, calls, PolicyJoinService };
}

async function rejection(promise) {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    return null;
}

describe('@unit PolicyJoinService – join requests on the Main instance', function () {
    this.timeout(60000);

    let user;
    let owner;
    const messageKey = PrivateKey.generate().toString();

    before(async () => {
        user = await didWithKeys(USER);
        owner = await didWithKeys(OWNER);
    });

    const join = (key = messageKey) => createRemoteJoinDocument(user.document, owner.published, ACCOUNT, '0.0.5', POLICY, key);
    const now = () => Math.floor(Date.now() / 1000);

    it('records only a pending participant with the key still sealed', async () => {
        const { receive, store, calls } = await makeService({ user, owner });
        const document = join();

        const participant = await receive(topicMessage(document));

        assert.equal(participant.status, RemoteParticipantStatus.PENDING);
        assert.equal(participant.did, USER);
        assert.equal(participant.hederaAccountId, ACCOUNT);
        assert.equal(participant.policyMessageId, POLICY);
        assert.equal(participant.owner, OWNER);
        assert.deepEqual(participant.sealedKey, document.messageKey);
        assert.instanceOf(participant.joinedAt, Date);
        assert.lengthOf(store.RemotePolicyParticipant, 1);
        assert.lengthOf(calls.users, 0, 'no remote user before approval');
        assert.lengthOf(calls.keys, 0, 'the key is not opened before approval');
        assert.lengthOf(calls.replies, 0, 'approval is always manual');
        assert.equal(calls.expired, 1, 'expired requests are dropped first');
    });

    it('rejects a join paid by another account', async () => {
        const { receive, store } = await makeService({ user, owner });

        const error = await rejection(receive(topicMessage(join(), { payer: '0.0.666' })));

        assert.match(error?.message, /not paid by the account/);
        assert.lengthOf(store.RemotePolicyParticipant, 0);
    });

    it('rejects a join whose message claims another account or DID than the proof', async () => {
        const { receive, store } = await makeService({ user, owner });

        const forgedAccount = await rejection(receive(topicMessage(join(), { payer: '0.0.666', accountId: '0.0.666' })));
        const forgedOwner = await rejection(receive(topicMessage(join(), { owner: 'did:other' })));

        assert.match(forgedAccount?.message, /not paid by the account/);
        assert.match(forgedOwner?.message, /not paid by the account/);
        assert.lengthOf(store.RemotePolicyParticipant, 0);
    });

    it('rejects a join signed with another key', async () => {
        const forged = await didWithKeys(USER, PrivateKey.generateED25519());
        const { receive, store } = await makeService({ user, owner });
        const document = createRemoteJoinDocument(forged.document, owner.published, ACCOUNT, '0.0.5', POLICY, messageKey);

        const error = await rejection(receive(topicMessage(document)));

        assert.match(error?.message, /Invalid join proof/);
        assert.lengthOf(store.RemotePolicyParticipant, 0);
    });

    it('rejects a join for another policy', async () => {
        const { receive, store } = await makeService({ user, owner });
        const document = createRemoteJoinDocument(user.document, owner.published, ACCOUNT, '0.0.5', '1.2', messageKey);

        const error = await rejection(receive(topicMessage(document)));

        assert.match(error?.message, /another policy/);
        assert.lengthOf(store.RemotePolicyParticipant, 0);
    });

    it('rejects a join replayed long after it was issued', async () => {
        const { receive, store } = await makeService({ user, owner });

        const error = await rejection(receive(topicMessage(join(), { timestamp: `${now() + 2 * 24 * 60 * 60}.000000001` })));

        assert.match(error?.message, /expired/);
        assert.lengthOf(store.RemotePolicyParticipant, 0);
    });

    it('treats a duplicate join as a no-op', async () => {
        const { receive, store } = await makeService({ user, owner });
        const data = topicMessage(join());

        const first = await receive(data);
        const second = await receive(data);

        assert.strictEqual(second, first);
        assert.lengthOf(store.RemotePolicyParticipant, 1);
    });

    it('ignores an older join after a newer one', async () => {
        const { receive, store } = await makeService({ user, owner });
        const t = now();

        await receive(topicMessage(join(), { timestamp: `${t}.000000002` }));
        const participant = await receive(topicMessage(join(), { timestamp: `${t}.000000001` }));

        assert.equal(participant.joinMessageId, `${t}.000000002`);
        assert.lengthOf(store.RemotePolicyParticipant, 1);
    });

    it('ignores a newer join of a pending participant from another account', async () => {
        const { receive, store } = await makeService({ user, owner });
        const t = now();

        await receive(topicMessage(join(), { timestamp: `${t}.000000001` }));
        const other = createRemoteJoinDocument(user.document, owner.published, '0.0.101', '0.0.5', POLICY, messageKey);
        await receive(topicMessage(other, { payer: '0.0.101', accountId: '0.0.101', timestamp: `${t}.000000002` }));

        assert.equal(store.RemotePolicyParticipant[0].hederaAccountId, ACCOUNT);
        assert.equal(store.RemotePolicyParticipant[0].joinMessageId, `${t}.000000001`);
    });

    it('ignores a newer join of an approved participant from another account or topic', async () => {
        const { receive, store, calls } = await makeService({ user, owner });
        const t = now();

        const participant = await receive(topicMessage(join(), { timestamp: `${t}.000000001` }));
        participant.status = RemoteParticipantStatus.APPROVED;
        participant.sealedKey = null;
        const otherAccount = createRemoteJoinDocument(user.document, owner.published, '0.0.101', '0.0.5', POLICY, messageKey);
        await receive(topicMessage(otherAccount, { payer: '0.0.101', accountId: '0.0.101', timestamp: `${t}.000000002` }));
        const otherTopic = createRemoteJoinDocument(user.document, owner.published, ACCOUNT, '0.0.6', POLICY, messageKey);
        await receive(topicMessage(otherTopic, { timestamp: `${t}.000000003` }));

        assert.lengthOf(calls.keys, 0, 'the stored message key is not replaced');
        assert.lengthOf(calls.replies, 0);
        assert.equal(store.RemotePolicyParticipant[0].joinMessageId, `${t}.000000001`);
    });

    it('processes a join again after a temporary error', async () => {
        const transient = Object.assign(new Error('Unable to read the DID topic'), { transient: true });
        const { receiveWithRetry, store, service, PolicyJoinService } = await makeService({ user, owner, resolveFailures: [transient] });
        const delays = PolicyJoinService.retryDelays;
        PolicyJoinService.retryDelays = [5, 5];
        try {
            await receiveWithRetry(topicMessage(join()));
            assert.lengthOf(store.RemotePolicyParticipant, 0, 'not recorded yet');
            await new Promise((resolve) => setTimeout(resolve, 100));
        } finally {
            PolicyJoinService.retryDelays = delays;
            service.stop();
        }

        assert.lengthOf(store.RemotePolicyParticipant, 1);
        assert.equal(store.RemotePolicyParticipant[0].status, RemoteParticipantStatus.PENDING);
    });

    it('gives up after the last retry and does not retry a permanent error', async () => {
        const transient = Object.assign(new Error('Unable to read the DID topic'), { transient: true });
        const { receiveWithRetry, store, service, PolicyJoinService } = await makeService({ user, owner, resolveFailures: [transient, transient, transient] });
        const delays = PolicyJoinService.retryDelays;
        PolicyJoinService.retryDelays = [5, 5];
        const errors = [];
        const log = console.error;
        console.error = (error) => errors.push(error);
        try {
            await receiveWithRetry(topicMessage(join()));
            await new Promise((resolve) => setTimeout(resolve, 100));
            const forged = await didWithKeys(USER, PrivateKey.generateED25519());
            const permanent = await rejection(receiveWithRetry(topicMessage(
                createRemoteJoinDocument(forged.document, owner.published, ACCOUNT, '0.0.5', POLICY, messageKey)
            )));
            assert.match(permanent?.message, /Invalid join proof/);
        } finally {
            console.error = log;
            PolicyJoinService.retryDelays = delays;
            service.stop();
        }

        assert.lengthOf(store.RemotePolicyParticipant, 0);
        assert.lengthOf(errors, 1, 'the last attempt reports the error');
    });

    it('drops a new join without a reply when the pending limit is reached', async () => {
        const { receive, store, calls } = await makeService({ user, owner, limit: 1 });
        store.RemotePolicyParticipant.push({
            id: 'other', policyId: 'policy-1', did: 'did:other', status: RemoteParticipantStatus.PENDING
        });

        const result = await receive(topicMessage(join()));

        assert.isNull(result);
        assert.lengthOf(store.RemotePolicyParticipant, 1);
        assert.lengthOf(calls.replies, 0);
    });

    it('still refreshes a pending participant at the limit', async () => {
        const { receive, store } = await makeService({ user, owner, limit: 1 });
        const t = now();

        await receive(topicMessage(join(), { timestamp: `${t}.000000001` }));
        const refreshed = await receive(topicMessage(join(), { timestamp: `${t}.000000002` }));

        assert.equal(refreshed.joinMessageId, `${t}.000000002`);
        assert.lengthOf(store.RemotePolicyParticipant, 1);
    });

    it('reopens a rejected participant on a new join without reconnecting it', async () => {
        const { receive, store, calls } = await makeService({ user, owner, disconnected: true });
        const t = now();

        const participant = await receive(topicMessage(join(), { timestamp: `${t}.000000001` }));
        participant.status = RemoteParticipantStatus.REJECTED;
        participant.sealedKey = null;
        const document = join();
        await receive(topicMessage(document, { timestamp: `${t}.000000002` }));

        assert.equal(store.RemotePolicyParticipant[0].status, RemoteParticipantStatus.PENDING);
        assert.deepEqual(store.RemotePolicyParticipant[0].sealedKey, document.messageKey);
        assert.lengthOf(calls.replies, 0);
        assert.lengthOf(calls.reconnected, 0);
        assert.lengthOf(store.DisconnectedPolicy, 1);
    });

    it('reconnects a disconnected approved participant, stores the new key and answers again', async () => {
        const { receive, store, calls } = await makeService({ user, owner, disconnected: true });
        const t = now();

        const participant = await receive(topicMessage(join(), { timestamp: `${t}.000000001` }));
        participant.status = RemoteParticipantStatus.APPROVED;
        participant.sealedKey = null;
        const newKey = PrivateKey.generate().toString();
        await receive(topicMessage(join(newKey), { timestamp: `${t}.000000002` }));

        assert.deepEqual(calls.reconnected, [{ policyId: 'policy-1', did: USER }]);
        assert.lengthOf(store.DisconnectedPolicy, 0);
        assert.deepEqual(calls.keys, [{ did: USER, messageId: POLICY, key: newKey }]);
        assert.lengthOf(calls.replies, 1);
        assert.isTrue(calls.replies[0].accepted);
        assert.equal(calls.replies[0].key, newKey);
        assert.equal(store.RemotePolicyParticipant[0].status, RemoteParticipantStatus.APPROVED);
        assert.equal(store.RemotePolicyParticipant[0].joinMessageId, `${t}.000000002`);
        assert.lengthOf(calls.users, 0);
    });

    it('does not reconnect on a replay of the approved join', async () => {
        const { receive, calls } = await makeService({ user, owner, disconnected: true });
        const data = topicMessage(join());

        const participant = await receive(data);
        participant.status = RemoteParticipantStatus.APPROVED;
        await receive(data);

        assert.lengthOf(calls.reconnected, 0);
        assert.lengthOf(calls.replies, 0);
    });

    it('does not reconnect on a join signed with another key', async () => {
        const forged = await didWithKeys(USER, PrivateKey.generateED25519());
        const { receive, calls } = await makeService({ user, owner, disconnected: true });
        const t = now();

        const participant = await receive(topicMessage(join(), { timestamp: `${t}.000000001` }));
        participant.status = RemoteParticipantStatus.APPROVED;
        const document = createRemoteJoinDocument(forged.document, owner.published, ACCOUNT, '0.0.5', POLICY, messageKey);
        const error = await rejection(receive(topicMessage(document, { timestamp: `${t}.000000002` })));

        assert.match(error?.message, /Invalid join proof/);
        assert.lengthOf(calls.reconnected, 0);
    });
});

describe('@unit PolicyJoinService – replies on the home instance', function () {
    this.timeout(60000);

    async function makeHome({ item, key = 'user-key', document }) {
        const updated = [];
        const { PolicyJoinService } = await esmock(SERVICE, {
            '@guardian/common/database-modules/database-server': {
                DatabaseServer: {
                    getExternalPolicy: async (filter) => (
                        filter.messageId === POLICY && filter.creator === item.creator ? item : null
                    ),
                    updateExternalPolicy: async (row) => { updated.push({ ...row }); return row; },
                },
            },
            '@guardian/common/helpers/wallet': {
                Wallet: class {
                    async getUserKey(did, type, slot) { return slot === `${USER}#${POLICY}` ? key : null; }
                },
            },
            '@guardian/hedera/message/message-server': {
                MessageServer: class {
                    static async loadDocument(message, messageKey) {
                        if (messageKey !== 'user-key') { throw new Error('Unable to decrypt'); }
                        message.document = document;
                        return message;
                    }
                },
            },
            '@guardian/common/helpers/users': {
                Users: class { async getUserById() { return { id: 'u-1' }; } },
            },
            '@guardian/common/notification/notification-helper': {
                NotificationHelper: { info: async () => null },
            },
        });
        return { service: new PolicyJoinService('home-policy', POLICY, null, null), updated };
    }

    const reply = (action, parent = 'join-1', id = '1706823300.000000001') => {
        const message = {
            action,
            owner: USER,
            parent,
            id,
            document: null,
            getDocument() { return this.document; },
        };
        return message;
    };
    const item = () => ({ creator: USER, joinMessageId: 'join-1', joinStatus: RemoteJoinStatus.SENT, name: 'Policy' });
    const accepted = { did: USER, policyMessageId: POLICY, joinMessageId: 'join-1', accepted: true };

    it('marks the policy ready when the owner accepts', async () => {
        const row = item();
        const { service, updated } = await makeHome({ item: row, document: accepted });

        await service.processJoinReply(reply(MessageAction.RemotePolicyJoinAccepted));

        assert.equal(row.joinStatus, RemoteJoinStatus.ACCEPTED);
        assert.lengthOf(updated, 1);
    });

    it('marks the policy rejected when the owner rejects', async () => {
        const row = item();
        const { service } = await makeHome({ item: row, document: { ...accepted, accepted: false } });

        await service.processJoinReply(reply(MessageAction.RemotePolicyJoinRejected));

        assert.equal(row.joinStatus, RemoteJoinStatus.REJECTED);
    });

    it('ignores a reply that is not encrypted with the message key', async () => {
        const row = item();
        const { service, updated } = await makeHome({ item: row, key: 'other-key', document: accepted });

        await service.processJoinReply(reply(MessageAction.RemotePolicyJoinAccepted));

        assert.equal(row.joinStatus, RemoteJoinStatus.SENT);
        assert.lengthOf(updated, 0);
    });

    it('ignores a reply to another join or with a mismatching document', async () => {
        const row = item();
        const { service, updated } = await makeHome({ item: row, document: { ...accepted, accepted: false } });

        await service.processJoinReply(reply(MessageAction.RemotePolicyJoinAccepted, 'join-0'));
        await service.processJoinReply(reply(MessageAction.RemotePolicyJoinAccepted));

        assert.equal(row.joinStatus, RemoteJoinStatus.SENT);
        assert.lengthOf(updated, 0);
    });
});
