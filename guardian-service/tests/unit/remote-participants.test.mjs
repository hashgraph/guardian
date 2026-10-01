import { assert } from 'chai';
import esmock from 'esmock';
import { AssignedEntityType, RemoteParticipantStatus } from '@guardian/interfaces';

/*
 * A join request only records a pending participant with the message key still
 * sealed. The policy owner decides on every participant by hand: approving creates
 * the remote user without a login, stores its DID document and key, assigns the
 * policy and publishes the USER_PERMISSIONS credential; rejecting leaves the policy
 * unassigned and deletes the sealed key. Both answers are published for the home instance.
 */
const SEALED = { alg: 'X25519-HKDF-SHA256-A256GCM', epk: 'e', iv: 'i', data: 'd' };

async function load({ participant, policy, createUserError = null, existingUser = false, storedKey = null, disconnected = false }) {
    const calls = {
        assigned: [], removed: [], replies: [], users: [], didDocuments: [], keys: [],
        permissions: [], removedParticipants: [], reconnected: [], opened: 0
    };
    const { approveRemoteParticipant, rejectRemoteParticipant } = await esmock(
        '../../dist/api/remote-participants.service.js',
        {
            '../../dist/api/helpers/api-response.js': { ApiResponse: () => null },
            '../../dist/api/permission.service.js': {
                serDefaultRole: async (user, owner) => { calls.permissions.push({ user, owner }); },
            },
            '@guardian/common': {
                DataBaseHelper: class {
                    constructor(entity) { this.entity = entity.name; }
                    async findOne(filter) {
                        if (this.entity === 'DisconnectedPolicy') {
                            return disconnected ? { policyId: filter.policyId, owner: filter.owner } : null;
                        }
                        return participant && filter.id === participant.id ? participant : null;
                    }
                    async save(row) { return row; }
                    async remove(row) { calls.removedParticipants.push(row); }
                },
                DatabaseServer: class {
                    static async getPolicyById(id) { return policy && id === policy.id ? policy : null; }
                    static async getAssignedEntity(type, entityId, did) {
                        return calls.assigned.find((a) => a.type === type && a.entityId === entityId && a.did === did) || null;
                    }
                    static async assignEntity(type, entityId, assigned, did, owner) {
                        calls.assigned.push({ type, entityId, did, owner });
                    }
                    static async removeAssignEntity(type, entityId, did) {
                        calls.removed.push({ type, entityId, did });
                        calls.assigned = calls.assigned.filter((a) => !(a.entityId === entityId && a.did === did));
                        return true;
                    }
                    static async reconnectPolicy(policyId, did) { calls.reconnected.push({ policyId, did }); }
                    async reconnectPolicyDocuments() { return null; }
                },
                resolvePublishedDidDocument: async (did, topicId, account) => ({
                    getDocument: () => ({ id: did, topicId, account })
                }),
                VcHelper: class { async loadDidDocument(did) { return { owner: did }; } },
                openRemoteJoinMessageKey: (document, ownerDid) => {
                    calls.opened++;
                    assert.deepEqual(document.messageKey, SEALED);
                    assert.equal(ownerDid.owner, 'did:sr');
                    return 'opened-key';
                },
                Users: class {
                    async createRemoteUser(did, account, parent) {
                        calls.users.push({ did, account, parent });
                        if (createUserError) { throw createUserError; }
                        return { did, created: !existingUser };
                    }
                    async getUserById(did) { return { did, permissionsGroup: [] }; }
                },
                Wallet: class { async getUserKey() { return storedKey; } },
                saveRemoteUserDidDocument: async (did, document, topicId) => { calls.didDocuments.push({ did, topicId }); },
                saveRemoteUserMessageKey: async (did, messageId, key) => { calls.keys.push({ did, messageId, key }); },
                isRemoteParticipantExpired: (row) => row.expired === true,
                expireRemoteParticipants: async () => null,
                sendRemoteJoinReply: async (row, accepted, userId, key) => {
                    calls.replies.push({ did: row.did, accepted, key });
                    return `reply-${calls.replies.length}`;
                },
            },
        }
    );
    return { approveRemoteParticipant, rejectRemoteParticipant, calls };
}

const OWNER = { id: 'sr-id', owner: 'did:sr', creator: 'did:sr' };
const participant = (extra = {}) => ({
    id: 'p-1',
    policyId: 'policy-1',
    policyMessageId: '1.1',
    owner: 'did:sr',
    did: 'did:remote',
    hederaAccountId: '0.0.100',
    topicId: '0.0.5',
    joinMessageId: 'join-1',
    status: RemoteParticipantStatus.PENDING,
    sealedKey: SEALED,
    ...extra,
});
const policy = { id: 'policy-1', owner: 'did:sr' };

async function rejection(promise) {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    return null;
}

describe('@unit remote participants approval', function () {
    this.timeout(60000);

    it('approve creates the remote user, stores its DID document and key, assigns the policy and replies', async () => {
        const row = participant();
        const { approveRemoteParticipant, calls } = await load({ participant: row, policy });

        const result = await approveRemoteParticipant('p-1', OWNER);

        assert.equal(result.status, RemoteParticipantStatus.APPROVED);
        assert.deepEqual(calls.users, [{ did: 'did:remote', account: '0.0.100', parent: 'did:sr' }]);
        assert.deepEqual(calls.didDocuments, [{ did: 'did:remote', topicId: '0.0.5' }]);
        assert.deepEqual(calls.keys, [{ did: 'did:remote', messageId: '1.1', key: 'opened-key' }]);
        assert.isNull(result.sealedKey, 'the sealed key is not kept once opened');
        assert.deepEqual(calls.assigned, [{
            type: AssignedEntityType.Policy, entityId: 'policy-1', did: 'did:remote', owner: 'did:sr'
        }]);
        assert.deepEqual(calls.replies, [{ did: 'did:remote', accepted: true, key: undefined }]);
        assert.equal(result.replyMessageId, 'reply-1');
    });

    it('approve publishes the USER_PERMISSIONS credential of a new remote user once', async () => {
        const row = participant();
        const { approveRemoteParticipant, calls } = await load({ participant: row, policy, storedKey: 'opened-key' });

        await approveRemoteParticipant('p-1', OWNER);
        await approveRemoteParticipant('p-1', OWNER);

        assert.lengthOf(calls.permissions, 1);
        assert.equal(calls.permissions[0].user.did, 'did:remote');
        assert.equal(calls.permissions[0].owner.owner, 'did:sr');
        assert.equal(calls.permissions[0].owner.creator, 'did:sr');
        assert.isFalse(row.permissionsPending);
        assert.lengthOf(calls.assigned, 1, 'approving twice assigns once');
        assert.lengthOf(calls.replies, 2, 'and publishes the answer again');
        assert.lengthOf(calls.users, 1);
    });

    it('does not publish the credential again for an existing remote user', async () => {
        const row = participant();
        const { approveRemoteParticipant, calls } = await load({ participant: row, policy, existingUser: true });

        await approveRemoteParticipant('p-1', OWNER);

        assert.lengthOf(calls.permissions, 0);
    });

    it('retries publishing the credential after a failed approval', async () => {
        // the first approval created the user and left the credential pending
        const row = participant({ permissionsPending: true, sealedKey: null });
        const { approveRemoteParticipant, calls } = await load({ participant: row, policy, storedKey: 'opened-key' });

        await approveRemoteParticipant('p-1', OWNER);

        assert.lengthOf(calls.users, 0, 'the user already exists');
        assert.lengthOf(calls.permissions, 1);
        assert.isFalse(row.permissionsPending);
    });

    it('a DID that belongs to another user fails the approval and changes nothing', async () => {
        const row = participant();
        const { approveRemoteParticipant, calls } = await load({
            participant: row, policy, createUserError: new Error('The DID is already registered.')
        });

        const error = await rejection(approveRemoteParticipant('p-1', OWNER));

        assert.match(error?.message, /already registered/);
        assert.equal(row.status, RemoteParticipantStatus.PENDING);
        assert.deepEqual(row.sealedKey, SEALED);
        assert.lengthOf(calls.assigned, 0);
        assert.lengthOf(calls.keys, 0);
        assert.lengthOf(calls.replies, 0);
    });

    it('approval reconnects a user who disconnected from the policy', async () => {
        const row = participant();
        const { approveRemoteParticipant, calls } = await load({ participant: row, policy, disconnected: true });

        await approveRemoteParticipant('p-1', OWNER);

        assert.deepEqual(calls.reconnected, [{ policyId: 'policy-1', did: 'did:remote' }]);
    });

    it('reject leaves the policy unassigned, deletes the sealed key and replies with the opened key', async () => {
        const row = participant();
        const { rejectRemoteParticipant, calls } = await load({ participant: row, policy });

        const result = await rejectRemoteParticipant('p-1', OWNER);

        assert.equal(result.status, RemoteParticipantStatus.REJECTED);
        assert.isNull(result.sealedKey);
        assert.lengthOf(calls.users, 0, 'no user for a rejected request');
        assert.lengthOf(calls.keys, 0, 'the key is not stored');
        assert.deepEqual(calls.removed, [{ type: AssignedEntityType.Policy, entityId: 'policy-1', did: 'did:remote' }]);
        assert.deepEqual(calls.replies, [{ did: 'did:remote', accepted: false, key: 'opened-key' }]);
    });

    it('a rejected request cannot be approved without a new join', async () => {
        const row = participant({ status: RemoteParticipantStatus.REJECTED, sealedKey: null });
        const { approveRemoteParticipant, calls } = await load({ participant: row, policy });

        const error = await rejection(approveRemoteParticipant('p-1', OWNER));

        assert.match(error?.message, /new one/);
        assert.lengthOf(calls.assigned, 0);
    });

    it('an expired request cannot be approved and is removed', async () => {
        const row = participant({ expired: true });
        const { approveRemoteParticipant, calls } = await load({ participant: row, policy });

        const error = await rejection(approveRemoteParticipant('p-1', OWNER));

        assert.match(error?.message, /expired/);
        assert.lengthOf(calls.removedParticipants, 1);
        assert.lengthOf(calls.users, 0);
    });

    it('only the owner of the policy decides', async () => {
        const row = participant();
        const { approveRemoteParticipant, rejectRemoteParticipant, calls } = await load({ participant: row, policy });
        const other = { id: 'x', owner: 'did:other-sr', creator: 'did:other-sr' };

        assert.match((await rejection(approveRemoteParticipant('p-1', other)))?.message, /does not exist/);
        assert.match((await rejection(rejectRemoteParticipant('p-1', other)))?.message, /does not exist/);
        assert.match((await rejection(approveRemoteParticipant('p-2', OWNER)))?.message, /does not exist/);
        assert.lengthOf(calls.assigned, 0);
        assert.lengthOf(calls.replies, 0);
        assert.equal(row.status, RemoteParticipantStatus.PENDING);
    });

    it('refuses a participant whose policy changed owner', async () => {
        const row = participant();
        const { approveRemoteParticipant, calls } = await load({
            participant: row,
            policy: { id: 'policy-1', owner: 'did:other-sr' }
        });

        assert.match((await rejection(approveRemoteParticipant('p-1', OWNER)))?.message, /does not exist/);
        assert.lengthOf(calls.assigned, 0);
    });
});
