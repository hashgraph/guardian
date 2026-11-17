import assert from 'node:assert/strict';
import esmock from 'esmock';
import { EntityOwner } from '../../dist/helpers/entity-owner.js';

const middlewaresMock = new Proxy({}, { get: (t, p) => p === 'Examples' ? new Proxy({}, { get: () => 'ex' }) : (p === 'pageHeader' ? {} : class {}) });

describe('ExternalPoliciesApi.getExternalPolicies for a user without a DID', function () {
    this.timeout(60000);
    let ExternalPoliciesApi;
    let groupCalls;

    before(async () => {
        ({ ExternalPoliciesApi } = await esmock('../../dist/api/service/external-policy.js', {
            '@guardian/common/helpers/pino-logger': { PinoLogger: class {} },
            '@guardian/common/helpers/run-function-async': { RunFunctionAsync: (fn) => fn() },
            '@guardian/interfaces': {
                LocationType: new Proxy({}, { get: () => 'l' }),
                Permissions: new Proxy({}, { get: () => 'p' }),
                TaskAction: new Proxy({}, { get: () => 'a' }),
                UserPermissions: { has: () => false },
            },
            '#middlewares': middlewaresMock,
            '#helpers': {
                Guardians: class {
                    async groupExternalPolicyRequests(...args) {
                        groupCalls.push(args);
                        return { items: [{ id: 'a' }], count: 1 };
                    }
                },
                InternalException: async (error) => { throw error; },
                // The real subclass: it throws 422 for a user without a DID.
                EntityOwner,
                TaskManager: class {},
                PolicyEngine: class {},
            },
            '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined, AuthAndLocation: () => () => undefined },
        }));
    });

    beforeEach(() => {
        groupCalls = [];
    });

    function makeRes() {
        const calls = {};
        const res = {
            header: (key, value) => { calls.header = { key, value }; return { send: (body) => { calls.sent = body; } }; },
        };
        return { res, calls };
    }

    function makeApi() {
        return new ExternalPoliciesApi({ error: () => undefined });
    }

    it('answers an empty page instead of a 422', async () => {
        const { res, calls } = makeRes();

        await makeApi().getExternalPolicies({ id: 'user-1', username: 'new-sr' }, res, 0, 1);

        assert.deepEqual(calls.header, { key: 'X-Total-Count', value: 0 });
        assert.deepEqual(calls.sent, []);
        assert.equal(groupCalls.length, 0);
    });

    it('still lists the requests of a user with a DID', async () => {
        const { res, calls } = makeRes();

        await makeApi().getExternalPolicies({ id: 'user-1', did: 'did:hedera:1', username: 'sr' }, res, 0, 1);

        assert.deepEqual(calls.header, { key: 'X-Total-Count', value: 1 });
        assert.equal(groupCalls.length, 1);
    });
});
