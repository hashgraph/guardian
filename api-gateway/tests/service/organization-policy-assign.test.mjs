import assert from 'node:assert/strict';
import {
    makeUser, makeLogger, FakeEntityOwner, internalExceptionRethrow,
    loadController, guardiansInterfaces
} from './_controller-harness.mjs';

const DIST = '../../dist/api/service/organization.js';

/*
 * The assignment must be refused unless the caller owns the policy - otherwise an
 * SR can assign another SR's policy to their own organization.
 */

let stub;

class FakePolicyEngine {
    getPolicy(...args) { return stub.getPolicy(...args); }
}

class FakeUsers {
    assignPolicyToOrg(...args) { return stub.assignPolicyToOrg(...args); }
}

const load = () => loadController(DIST, {
    '#helpers': {
        Guardians: class {},
        PolicyEngine: FakePolicyEngine,
        Users: FakeUsers,
        InternalException: internalExceptionRethrow,
        EntityOwner: FakeEntityOwner,
        toOrgResponse: (value) => value,
    },
    '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
    '#middlewares': new Proxy({}, { get: () => class {} }),
    '@guardian/common': { PinoLogger: class {} },
    '@guardian/interfaces': guardiansInterfaces,
});

describe('OrganizationApi.assignPolicyToOrg', function () {
    this.timeout(60000);

    let Api;
    before(async () => { ({ OrganizationApi: Api } = await load()); });

    const user = makeUser({ did: 'did:sr' });
    const call = () => new Api(makeLogger())
        .assignPolicyToOrg(user, 'org-1', { policyId: 'policy-1' });

    beforeEach(() => {
        stub = {
            getPolicy: async () => ({ id: 'policy-1', owner: 'did:sr' }),
            assignPolicyToOrg: async (orgId, policyId) => ({ orgId, policyId, active: true }),
        };
    });

    it('assigns a policy the caller owns', async () => {
        const result = await call();

        assert.deepEqual(result, { orgId: 'org-1', policyId: 'policy-1', active: true });
    });

    it('refuses a policy belonging to another owner', async () => {
        const assigned = [];
        stub.getPolicy = async () => ({ id: 'policy-1', owner: 'did:other-sr' });
        stub.assignPolicyToOrg = async (...args) => { assigned.push(args); };

        await assert.rejects(call, (error) => {
            assert.equal(error.getStatus(), 403);
            return true;
        });
        assert.deepEqual(assigned, [],
            'the assignment must never be written for a policy the caller does not own');
    });

    it('reports a policy that does not exist as not found', async () => {
        stub.getPolicy = async () => null;

        await assert.rejects(call, (error) => {
            assert.equal(error.getStatus(), 404);
            return true;
        });
    });

    it('looks the policy up by the id being assigned', async () => {
        const lookups = [];
        stub.getPolicy = async (filters, owner) => {
            lookups.push({ filters, creator: owner.creator });
            return { id: 'policy-1', owner: 'did:sr' };
        };

        await call();

        assert.deepEqual(lookups, [{ filters: { filters: 'policy-1' }, creator: 'did:sr' }]);
    });
});
