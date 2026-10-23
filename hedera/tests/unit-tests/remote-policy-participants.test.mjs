import { assert } from 'chai';
import esmock from 'esmock';
import { RemoteParticipantStatus } from '@guardian/interfaces';

/*
 * Anyone can post join requests, so a policy keeps a bounded number of pending
 * participants, and a pending participant expires if the owner never decides.
 */
async function load() {
    const deleted = [];
    const helper = await esmock('../../dist/remote-policy-join-reply.js', {
        '@guardian/common/database-modules/database-server': { DatabaseServer: class {} },
        '@guardian/common/entity/did-document': { DidDocument: class {} },
        '@guardian/common/entity/remote-policy-participant': { RemotePolicyParticipant: class RemotePolicyParticipant {} },
        '@guardian/common/entity/topic': { Topic: class {} },
        '@guardian/common/helpers/users': { Users: class {} },
        '@guardian/common/helpers/wallet': { KeyType: {}, Wallet: class {} },
        '@guardian/common/helpers/db-helper': {
            DataBaseHelper: class {
                async delete(filter) { deleted.push(filter); return 1; }
            },
        },
    });
    return { ...helper, deleted };
}

const DAY = 24 * 60 * 60 * 1000;

describe('@unit remote participant limits', function () {
    this.timeout(30000);

    const env = { ...process.env };
    afterEach(() => {
        process.env.REMOTE_POLICY_PENDING_JOIN_LIMIT = env.REMOTE_POLICY_PENDING_JOIN_LIMIT;
        process.env.REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS = env.REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS;
        if (env.REMOTE_POLICY_PENDING_JOIN_LIMIT === undefined) { delete process.env.REMOTE_POLICY_PENDING_JOIN_LIMIT; }
        if (env.REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS === undefined) { delete process.env.REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS; }
    });

    it('defaults to 100 pending participants kept for 30 days', async () => {
        delete process.env.REMOTE_POLICY_PENDING_JOIN_LIMIT;
        delete process.env.REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS;
        const { remoteJoinLimits } = await load();

        assert.deepEqual(remoteJoinLimits(), { pendingLimit: 100, pendingExpiryMs: 30 * DAY });
    });

    it('reads the limits from the environment and ignores invalid values', async () => {
        const { remoteJoinLimits } = await load();

        process.env.REMOTE_POLICY_PENDING_JOIN_LIMIT = '5';
        process.env.REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS = '2';
        assert.deepEqual(remoteJoinLimits(), { pendingLimit: 5, pendingExpiryMs: 2 * DAY });

        process.env.REMOTE_POLICY_PENDING_JOIN_LIMIT = '-1';
        process.env.REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS = 'soon';
        assert.deepEqual(remoteJoinLimits(), { pendingLimit: 100, pendingExpiryMs: 30 * DAY });
    });

    it('expires only pending participants older than the period', async () => {
        process.env.REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS = '30';
        const { isRemoteParticipantExpired } = await load();
        const now = Date.now();
        const pending = (days) => ({ status: RemoteParticipantStatus.PENDING, joinedAt: new Date(now - days * DAY) });

        assert.isTrue(isRemoteParticipantExpired(pending(31), now));
        assert.isFalse(isRemoteParticipantExpired(pending(29), now));
        assert.isFalse(isRemoteParticipantExpired({ ...pending(31), status: RemoteParticipantStatus.APPROVED }, now));
        assert.isFalse(isRemoteParticipantExpired({ ...pending(31), status: RemoteParticipantStatus.REJECTED }, now));
    });

    it('deletes the expired pending participants of the policy', async () => {
        process.env.REMOTE_POLICY_PENDING_JOIN_EXPIRY_DAYS = '30';
        const { expireRemoteParticipants, deleted } = await load();
        const now = Date.now();

        await expireRemoteParticipants('policy-1', now);

        assert.deepEqual(deleted, [{
            policyId: 'policy-1',
            status: RemoteParticipantStatus.PENDING,
            joinedAt: { $lt: new Date(now - 30 * DAY) }
        }]);
    });
});
