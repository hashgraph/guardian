import { assert } from 'chai';
import esmock from 'esmock';
import { AssignedEntityType, RemoteParticipantStatus } from '@guardian/interfaces';

/*
 * The policy owner decides on every remote participant by hand. Approving assigns
 * the policy to the remote user, the same as the permissions assign endpoint;
 * rejecting leaves it unassigned. Both answers are published for the home instance.
 */
async function load({ participant, policy }) {
    const calls = { assigned: [], removed: [], replies: [], saved: [] };
    const { approveRemoteParticipant, rejectRemoteParticipant } = await esmock(
        '../../dist/api/remote-participants.service.js',
        {
            '../../dist/api/helpers/api-response.js': { ApiResponse: () => null },
            '@guardian/common': {
                DataBaseHelper: class {
                    async findOne(filter) { return participant && filter.id === participant.id ? participant : null; }
                    async save(row) { calls.saved.push({ ...row }); return row; }
                },
                DatabaseServer: {
                    getPolicyById: async (id) => (policy && id === policy.id ? policy : null),
                    getAssignedEntity: async (type, entityId, did) => (
                        calls.assigned.find((a) => a.type === type && a.entityId === entityId && a.did === did) || null
                    ),
                    assignEntity: async (type, entityId, assigned, did, owner) => {
                        calls.assigned.push({ type, entityId, did, owner });
                    },
                    removeAssignEntity: async (type, entityId, did) => {
                        calls.removed.push({ type, entityId, did });
                        calls.assigned = calls.assigned.filter((a) => !(a.entityId === entityId && a.did === did));
                        return true;
                    },
                },
                sendRemoteJoinReply: async (row, accepted) => {
                    calls.replies.push({ did: row.did, accepted });
                    return `reply-${calls.replies.length}`;
                },
            },
        }
    );
    return { approveRemoteParticipant, rejectRemoteParticipant, calls };
}

const OWNER = { id: 'sr-id', owner: 'did:sr', creator: 'did:sr' };
const participant = () => ({
    id: 'p-1',
    policyId: 'policy-1',
    policyMessageId: '1.1',
    owner: 'did:sr',
    did: 'did:remote',
    hederaAccountId: '0.0.100',
    joinMessageId: 'join-1',
    status: RemoteParticipantStatus.PENDING,
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

    it('approve assigns the policy and publishes the acceptance', async () => {
        const row = participant();
        const { approveRemoteParticipant, calls } = await load({ participant: row, policy });

        const result = await approveRemoteParticipant('p-1', OWNER);

        assert.equal(result.status, RemoteParticipantStatus.APPROVED);
        assert.deepEqual(calls.assigned, [{
            type: AssignedEntityType.Policy, entityId: 'policy-1', did: 'did:remote', owner: 'did:sr'
        }]);
        assert.deepEqual(calls.replies, [{ did: 'did:remote', accepted: true }]);
        assert.equal(result.replyMessageId, 'reply-1');
    });

    it('approving twice assigns once and publishes the answer again', async () => {
        const row = participant();
        const { approveRemoteParticipant, calls } = await load({ participant: row, policy });

        await approveRemoteParticipant('p-1', OWNER);
        await approveRemoteParticipant('p-1', OWNER);

        assert.lengthOf(calls.assigned, 1);
        assert.lengthOf(calls.replies, 2);
    });

    it('reject leaves the policy unassigned and publishes the rejection', async () => {
        const row = participant();
        const { approveRemoteParticipant, rejectRemoteParticipant, calls } = await load({ participant: row, policy });

        await approveRemoteParticipant('p-1', OWNER);
        const result = await rejectRemoteParticipant('p-1', OWNER);

        assert.equal(result.status, RemoteParticipantStatus.REJECTED);
        assert.lengthOf(calls.assigned, 0);
        assert.deepEqual(calls.removed, [{ type: AssignedEntityType.Policy, entityId: 'policy-1', did: 'did:remote' }]);
        assert.deepEqual(calls.replies.at(-1), { did: 'did:remote', accepted: false });
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
