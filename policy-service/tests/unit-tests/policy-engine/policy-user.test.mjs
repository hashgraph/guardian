import { assert } from 'chai';
import { LocationType, Permissions, PolicyStatus } from '@guardian/interfaces';
import { PolicyUser, VirtualUser } from '../../../dist/policy-engine/policy-user.js';

const instance = {
    policyId: 'policy-1',
    policyOwner: 'did:owner',
    policyStatus: PolicyStatus.DRAFT,
    locationType: LocationType.LOCAL
};

function makeAuthUser(extra = {}) {
    return Object.assign({
        id: 'user-1',
        did: 'did:user',
        username: 'alice',
        hederaAccountId: '0.0.123',
        permissions: ['PERM_A'],
        location: LocationType.LOCAL
    }, extra);
}

describe('PolicyUser', function () {
    describe('constructor with string arg', function () {
        it('sets did from string', function () {
            const user = new PolicyUser('did:str', instance);
            assert.equal(user.did, 'did:str');
        });
        it('sets username to null', function () {
            const user = new PolicyUser('did:str', instance);
            assert.isNull(user.username);
        });
        it('sets permissions to empty array', function () {
            const user = new PolicyUser('did:str', instance);
            assert.deepEqual(user.permissions, []);
        });
        it('sets location to LOCAL', function () {
            const user = new PolicyUser('did:str', instance);
            assert.equal(user.location, LocationType.LOCAL);
        });
        it('sets userId to null', function () {
            const user = new PolicyUser('did:str', instance);
            assert.isNull(user.userId);
        });
        it('sets hederaAccountId to null', function () {
            const user = new PolicyUser('did:str', instance);
            assert.isNull(user.hederaAccountId);
        });
        it('sets id equal to did when no group', function () {
            const user = new PolicyUser('did:str', instance);
            assert.equal(user.id, 'did:str');
        });
    });

    describe('constructor with auth user arg', function () {
        it('copies did, username, userId and hederaAccountId', function () {
            const user = new PolicyUser(makeAuthUser(), instance);
            assert.equal(user.did, 'did:user');
            assert.equal(user.username, 'alice');
            assert.equal(user.userId, 'user-1');
            assert.equal(user.hederaAccountId, '0.0.123');
        });
        it('copies permissions', function () {
            const user = new PolicyUser(makeAuthUser(), instance);
            assert.deepEqual(user.permissions, ['PERM_A']);
        });
        it('defaults permissions to empty array when missing', function () {
            const user = new PolicyUser(makeAuthUser({ permissions: undefined }), instance);
            assert.deepEqual(user.permissions, []);
        });
        it('defaults location to LOCAL when missing', function () {
            const user = new PolicyUser(makeAuthUser({ location: undefined }), instance);
            assert.equal(user.location, LocationType.LOCAL);
        });
        it('keeps explicit remote location', function () {
            const user = new PolicyUser(makeAuthUser({ location: LocationType.REMOTE }), instance);
            assert.equal(user.location, LocationType.REMOTE);
        });
        it('copies instance fields', function () {
            const user = new PolicyUser(makeAuthUser(), instance);
            assert.equal(user.policyId, 'policy-1');
            assert.equal(user.policyOwner, 'did:owner');
            assert.equal(user.policyStatus, PolicyStatus.DRAFT);
            assert.equal(user.policyLocation, LocationType.LOCAL);
        });
        it('initializes role, group and roleMessage to null', function () {
            const user = new PolicyUser(makeAuthUser(), instance);
            assert.isNull(user.role);
            assert.isNull(user.group);
            assert.isNull(user.roleMessage);
        });
    });

    describe('setCurrentGroup', function () {
        it('returns this', function () {
            const user = new PolicyUser('did:a', instance);
            assert.strictEqual(user.setCurrentGroup(null), user);
        });
        it('sets role, group and roleMessage from group object', function () {
            const user = new PolicyUser('did:a', instance);
            user.setCurrentGroup({ role: 'Registrant', uuid: 'g1', messageId: 'm1' });
            assert.equal(user.role, 'Registrant');
            assert.equal(user.group, 'g1');
            assert.equal(user.roleMessage, 'm1');
        });
        it('prefixes id with group uuid', function () {
            const user = new PolicyUser('did:a', instance);
            user.setCurrentGroup({ role: 'r', uuid: 'g1', messageId: 'm1' });
            assert.equal(user.id, 'g1:did:a');
        });
        it('resets to nulls when group is null', function () {
            const user = new PolicyUser('did:a', instance);
            user.setCurrentGroup({ role: 'r', uuid: 'g1', messageId: 'm1' });
            user.setCurrentGroup(null);
            assert.isNull(user.role);
            assert.isNull(user.group);
            assert.isNull(user.roleMessage);
            assert.equal(user.id, 'did:a');
        });
        it('fills missing group fields with null', function () {
            const user = new PolicyUser('did:a', instance);
            user.setCurrentGroup({});
            assert.isNull(user.role);
            assert.isNull(user.group);
            assert.isNull(user.roleMessage);
        });
    });

    describe('equal', function () {
        it('compares only did when no group and no uuid', function () {
            const user = new PolicyUser('did:a', instance);
            assert.isTrue(user.equal('did:a', null));
            assert.isFalse(user.equal('did:b', null));
        });
        it('compares did and group when group set', function () {
            const user = new PolicyUser('did:a', instance);
            user.setCurrentGroup({ uuid: 'g1' });
            assert.isTrue(user.equal('did:a', 'g1'));
            assert.isFalse(user.equal('did:a', 'g2'));
            assert.isFalse(user.equal('did:b', 'g1'));
        });
        it('fails when uuid passed but user has no group', function () {
            const user = new PolicyUser('did:a', instance);
            assert.isFalse(user.equal('did:a', 'g1'));
        });
    });

    describe('isAdmin', function () {
        it('true when did equals policy owner', function () {
            const user = new PolicyUser('did:owner', instance);
            assert.isTrue(user.isAdmin);
        });
        it('true when user has manage permission', function () {
            const user = new PolicyUser(makeAuthUser({
                permissions: [Permissions.POLICIES_POLICY_MANAGE]
            }), instance);
            assert.isTrue(user.isAdmin);
        });
        it('false for plain user', function () {
            const user = new PolicyUser(makeAuthUser(), instance);
            assert.isFalse(user.isAdmin);
        });
        it('false when policy location is remote even for owner', function () {
            const remoteInstance = Object.assign({}, instance, { locationType: LocationType.REMOTE });
            const user = new PolicyUser('did:owner', remoteInstance);
            assert.isFalse(user.isAdmin);
        });
    });

    describe('getAuthUser', function () {
        it('returns auth user shape', function () {
            const user = new PolicyUser(makeAuthUser(), instance);
            assert.deepEqual(user.getAuthUser(), {
                id: 'user-1',
                username: 'alice',
                did: 'did:user',
                hederaAccountId: '0.0.123',
                permissions: ['PERM_A'],
                location: LocationType.LOCAL
            });
        });
    });

    describe('toJson', function () {
        it('returns full json shape', function () {
            const user = new PolicyUser(makeAuthUser(), instance);
            user.setCurrentGroup({ role: 'r1', uuid: 'g1', messageId: 'm1' });
            assert.deepEqual(user.toJson(), {
                id: 'g1:did:user',
                did: 'did:user',
                username: 'alice',
                role: 'r1',
                group: 'g1',
                roleMessage: 'm1',
                virtual: false,
                isAdmin: false,
                policyId: 'policy-1'
            });
        });
        it('virtual is false for PolicyUser', function () {
            const user = new PolicyUser('did:a', instance);
            assert.isFalse(user.virtual);
        });
    });
});

describe('VirtualUser', function () {
    it('virtual is true', function () {
        const user = new VirtualUser({ did: 'did:v', username: 'v' }, instance);
        assert.isTrue(user.virtual);
    });
    it('copies fields from virtual user object', function () {
        const user = new VirtualUser({ did: 'did:v', username: 'v', hederaAccountId: '0.0.9' }, instance);
        assert.equal(user.did, 'did:v');
        assert.equal(user.username, 'v');
        assert.equal(user.hederaAccountId, '0.0.9');
    });
    it('tolerates null arg', function () {
        const user = new VirtualUser(null, instance);
        assert.isUndefined(user.did);
        assert.isTrue(user.virtual);
    });
    it('toJson reports virtual true', function () {
        const user = new VirtualUser({ did: 'did:v' }, instance);
        assert.isTrue(user.toJson().virtual);
    });
    it('inherits isAdmin owner check', function () {
        const user = new VirtualUser({ did: 'did:owner' }, instance);
        assert.isTrue(user.isAdmin);
    });
});
