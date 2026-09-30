import { assert } from 'chai';
import esmock from 'esmock';
import { PrivateKey } from '@hiero-ledger/sdk';
import {
    CommonDidDocument,
    createRemoteJoinDocument,
    HederaEd25519Method,
    MessageAction,
} from '@guardian/common';
import { RemoteJoinStatus, RemoteParticipantStatus } from '@guardian/interfaces';

const SERVICE = '../../../dist/policy-engine/policy-join-service.js';

const POLICY = '1706823227.586179534';
const USER = 'did:hedera:testnet:user_0.0.5';
const OWNER = 'did:hedera:testnet:owner_0.0.7';
const ACCOUNT = '0.0.100';

/*
 * A join request arrives on the actions topic, which has no submit key: anyone can
 * post one. Only the payer and the DID signature tie it to the user, and only the
 * policy owner can open the message key sealed in it.
 */
async function didWithKeys(did) {
    const method = await HederaEd25519Method.generate(did, PrivateKey.generateED25519());
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

async function makeService({ user, owner, existingUser = null, createUserError = null }) {
    const store = { RemotePolicyParticipant: [], DidDocument: [], Topic: [] };
    const calls = { users: [], keys: [], savedKeys: [], replies: [], notifications: [] };
    const ipfs = new Map();
    let nextId = 1;

    const { PolicyJoinService } = await esmock(SERVICE, {
        '@guardian/common': {
            MessageServer: class {
                static async loadDocument(message) {
                    message.document = ipfs.get(message.getUrls()[0].cid);
                    return message;
                }
            },
            DataBaseHelper: class {
                constructor(entity) { this.rows = store[entity.name]; }
                async findOne(filter) {
                    return this.rows.find((row) => Object.entries(filter).every(([k, v]) => row[k] === v)) || null;
                }
                async save(row) {
                    if (!row.id) {
                        row.id = String(nextId++);
                        this.rows.push(row);
                    }
                    return row;
                }
            },
            DatabaseServer: {
                getKeys: async () => calls.savedKeys,
                saveKey: async (row) => { calls.savedKeys.push(row); return row; },
            },
            resolvePublishedDidDocument: async (did, topicId, account) => {
                assert.equal(did, USER);
                assert.equal(account, ACCOUNT);
                return user.published;
            },
            VcHelper: class {
                async loadDidDocument(did) {
                    assert.equal(did, OWNER);
                    return owner.document;
                }
            },
            Users: class {
                async createRemoteUser(did, account, parent) {
                    calls.users.push({ did, account, parent });
                    if (createUserError) { throw createUserError; }
                    return existingUser || { did, hederaAccountId: account, parent };
                }
            },
            Wallet: class {
                async setUserKey(did, type, slot, key) { calls.keys.push({ did, slot, key }); }
            },
            NotificationHelper: { info: async (...args) => { calls.notifications.push(args); } },
            sendRemoteJoinReply: async (participant, accepted) => {
                calls.replies.push({ participant, accepted });
                return 'reply-1';
            },
        },
    });

    const service = new PolicyJoinService('policy-1', POLICY, OWNER, 'owner-user-id');
    const receive = async (data) => {
        ipfs.set(`cid-${data.consensusTimestamp}`, data.document);
        return await service.processJoinRequest(data);
    };
    return { service, receive, store, calls };
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

    const join = () => createRemoteJoinDocument(user.document, owner.published, ACCOUNT, '0.0.5', POLICY, messageKey);

    it('creates a login-less remote user and a pending participant', async () => {
        const { receive, store, calls } = await makeService({ user, owner });

        const participant = await receive(topicMessage(join()));

        assert.equal(participant.status, RemoteParticipantStatus.PENDING);
        assert.equal(participant.did, USER);
        assert.equal(participant.hederaAccountId, ACCOUNT);
        assert.equal(participant.policyMessageId, POLICY);
        assert.equal(participant.owner, OWNER);
        assert.lengthOf(store.RemotePolicyParticipant, 1);
        assert.deepEqual(calls.users, [{ did: USER, account: ACCOUNT, parent: OWNER }]);
        assert.deepEqual(calls.keys, [{ did: USER, slot: `${USER}#${POLICY}`, key: messageKey }],
            'the unsealed key is stored in the virtual user slot');
        assert.lengthOf(store.DidDocument, 1);
        assert.equal(store.DidDocument[0].did, USER);
        assert.lengthOf(calls.replies, 0, 'approval is always manual');
    });

    it('rejects a join paid by another account', async () => {
        const { receive, store, calls } = await makeService({ user, owner });

        const error = await rejection(receive(topicMessage(join(), { payer: '0.0.666' })));

        assert.match(error?.message, /not paid by the account/);
        assert.lengthOf(store.RemotePolicyParticipant, 0);
        assert.lengthOf(calls.users, 0);
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
        const forged = await didWithKeys(USER);
        const { receive, store, calls } = await makeService({ user, owner });
        const document = createRemoteJoinDocument(forged.document, owner.published, ACCOUNT, '0.0.5', POLICY, messageKey);

        const error = await rejection(receive(topicMessage(document)));

        assert.match(error?.message, /Invalid join proof/);
        assert.lengthOf(store.RemotePolicyParticipant, 0);
        assert.lengthOf(calls.keys, 0);
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
        const later = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;

        const error = await rejection(receive(topicMessage(join(), { timestamp: `${later}.000000001` })));

        assert.match(error?.message, /expired/);
        assert.lengthOf(store.RemotePolicyParticipant, 0);
    });

    it('treats a duplicate join as a no-op', async () => {
        const { receive, store, calls } = await makeService({ user, owner });
        const data = topicMessage(join());

        const first = await receive(data);
        const second = await receive(data);

        assert.strictEqual(second, first);
        assert.lengthOf(store.RemotePolicyParticipant, 1);
        assert.lengthOf(calls.users, 1);
        assert.lengthOf(calls.keys, 1);
    });

    it('ignores an older join after a newer one', async () => {
        const { receive, store } = await makeService({ user, owner });
        const now = Math.floor(Date.now() / 1000);

        await receive(topicMessage(join(), { timestamp: `${now}.000000002` }));
        const participant = await receive(topicMessage(join(), { timestamp: `${now}.000000001` }));

        assert.equal(participant.joinMessageId, `${now}.000000002`);
        assert.lengthOf(store.RemotePolicyParticipant, 1);
    });

    it('reopens a rejected participant on a new join and answers again an approved one', async () => {
        const { receive, store, calls } = await makeService({ user, owner });
        const now = Math.floor(Date.now() / 1000);

        const participant = await receive(topicMessage(join(), { timestamp: `${now}.000000001` }));
        participant.status = RemoteParticipantStatus.REJECTED;
        await receive(topicMessage(join(), { timestamp: `${now}.000000002` }));
        assert.equal(store.RemotePolicyParticipant[0].status, RemoteParticipantStatus.PENDING);

        participant.status = RemoteParticipantStatus.APPROVED;
        await receive(topicMessage(join(), { timestamp: `${now}.000000003` }));
        assert.equal(store.RemotePolicyParticipant[0].status, RemoteParticipantStatus.APPROVED);
        assert.lengthOf(calls.replies, 1);
        assert.isTrue(calls.replies[0].accepted);
    });

    it('creates no participant when the DID belongs to another user', async () => {
        const { receive, store } = await makeService({
            user, owner, createUserError: new Error('The DID is already registered.')
        });

        const error = await rejection(receive(topicMessage(join())));

        assert.match(error?.message, /already registered/);
        assert.lengthOf(store.RemotePolicyParticipant, 0);
    });
});

describe('@unit PolicyJoinService – replies on the home instance', function () {
    this.timeout(60000);

    async function makeHome({ item, key = 'user-key', document }) {
        const updated = [];
        const { PolicyJoinService } = await esmock(SERVICE, {
            '@guardian/common': {
                DatabaseServer: {
                    getExternalPolicy: async (filter) => (
                        filter.messageId === POLICY && filter.creator === item.creator ? item : null
                    ),
                    updateExternalPolicy: async (row) => { updated.push({ ...row }); return row; },
                },
                Wallet: class {
                    async getUserKey(did, type, slot) { return slot === `${USER}#${POLICY}` ? key : null; }
                },
                MessageServer: class {
                    static async loadDocument(message, messageKey) {
                        if (messageKey !== 'user-key') { throw new Error('Unable to decrypt'); }
                        message.document = document;
                        return message;
                    }
                },
                Users: class { async getUserById() { return { id: 'u-1' }; } },
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
