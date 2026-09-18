import assert from 'node:assert/strict';
import esmock from 'esmock';

const PERM_DIST = '../../dist/api/service/permissions.js';
const authMock = { Auth: () => () => undefined, AuthUser: () => () => undefined };
const middlewaresMock = new Proxy({}, { get: (t, p) => (p === 'Examples' || p === 'ObjectExamples') ? new Proxy({}, { get: () => 'ex' }) : (p === 'pageHeader' ? {} : class {}) });

function makeUser(extra = {}) {
    return { id: 'user-1', did: 'did:owner', parent: null, tenantContext: { tenantId: 't1' }, ...extra };
}
function makeRes() {
    const calls = {};
    const res = { header: (k, v) => { calls.header = { k, v }; return { send: (b) => { calls.sent = b; return calls; } }; } };
    return { res, calls };
}
const is404 = (e) => { assert.equal(e.getStatus(), 404); return true; };

describe('PermissionsApi', function () {
    this.timeout(60000);
    let PermissionsApi;
    let usersImpl;
    let guardiansImpl;
    let userPermissionsHas;

    before(async () => {
        ({ PermissionsApi } = await esmock(PERM_DIST, {
            '@guardian/common': { PinoLogger: class {} },
            '@guardian/interfaces': {
                AssignedEntityType: { Policy: 'Policy' },
                Permissions: new Proxy({}, { get: () => 'p' }),
                PolicyStatus: new Proxy({}, { get: () => 's' }),
                UserPermissions: { has: (...a) => userPermissionsHas(...a) },
            },
            '#middlewares': middlewaresMock,
            '#auth': authMock,
            '#helpers': {
                CacheService: class {},
                EntityOwner: class { constructor(user) { this.creator = user?.did; } },
                getCacheKey: (keys) => `ck:${keys.join('|')}`,
                Guardians: class {
                    constructor(tc) { this.tc = tc; }
                    async createRole(...a) { return guardiansImpl.createRole(...a); }
                    async updateRole(...a) { return guardiansImpl.updateRole(...a); }
                    async deleteRole(...a) { return guardiansImpl.deleteRole(...a); }
                    async setRole(...a) { return guardiansImpl.setRole(...a); }
                    async assignedEntities(...a) { return guardiansImpl.assignedEntities(...a); }
                    async getAssignedPolicies(...a) { return guardiansImpl.getAssignedPolicies(...a); }
                    async assignEntity(...a) { return guardiansImpl.assignEntity(...a); }
                    async delegateEntity(...a) { return guardiansImpl.delegateEntity(...a); }
                },
                InternalException: async (e) => { throw e; },
                Users: class {
                    constructor(tc) { this.tc = tc; }
                    async getPermissions(...a) { return usersImpl.getPermissions(...a); }
                    async getRoles(...a) { return usersImpl.getRoles(...a); }
                    async createRole(...a) { return usersImpl.createRole(...a); }
                    async getRoleById(...a) { return usersImpl.getRoleById(...a); }
                    async updateRole(...a) { return usersImpl.updateRole(...a); }
                    async refreshUserPermissions(...a) { return usersImpl.refreshUserPermissions(...a); }
                    async deleteRole(...a) { return usersImpl.deleteRole(...a); }
                    async setDefaultRole(...a) { return usersImpl.setDefaultRole(...a); }
                    async getWorkers(...a) { return usersImpl.getWorkers(...a); }
                    async getUserPermissions(...a) { return usersImpl.getUserPermissions(...a); }
                    async updateUserRole(...a) { return usersImpl.updateUserRole(...a); }
                    async delegateUserRole(...a) { return usersImpl.delegateUserRole(...a); }
                },
            },
            '../../dist/api/service/websockets.js': { WebSocketsService: class { constructor() {} updatePermissions() {} } },
            '#constants': {
                CACHE_PREFIXES: { TAG: 'tag' },
                PREFIXES: { PROFILES: 'profiles', ACCOUNTS: 'accounts' },
            },
        }));
    });

    function makeApi() {
        userPermissionsHas = () => true;
        const cacheService = { invalidate: async () => undefined, invalidateAllTagsByPrefixes: async () => undefined };
        return new PermissionsApi(cacheService, { error: () => undefined });
    }

    it('getPermissions returns the user permissions', async () => {
        usersImpl = { getPermissions: async (id) => [`perm-${id}`] };
        assert.deepEqual(await makeApi().getPermissions(makeUser({ id: 'u9' })), ['perm-u9']);
    });

    it('getRoles sets the total-count header and sends items', async () => {
        usersImpl = { getRoles: async () => ({ items: [{ id: 'r' }], count: 4 }) };
        const { res, calls } = makeRes();
        await makeApi().getRoles(makeUser(), res, 'role', 0, 20);
        assert.deepEqual(calls.header, { k: 'X-Total-Count', v: 4 });
        assert.deepEqual(calls.sent, [{ id: 'r' }]);
    });

    it('getRoles sets onlyOwn true when the user lacks PERMISSIONS_ROLE_READ', async () => {
        let seenOptions;
        usersImpl = { getRoles: async (options) => { seenOptions = options; return { items: [], count: 0 }; } };
        const api = makeApi();
        userPermissionsHas = () => false;
        const { res } = makeRes();
        await api.getRoles(makeUser(), res, null, 0, 20);
        assert.equal(seenOptions.onlyOwn, true);
    });

    it('getRoles uses parent as owner when present', async () => {
        let seenOptions;
        usersImpl = { getRoles: async (options) => { seenOptions = options; return { items: [], count: 0 }; } };
        const { res } = makeRes();
        await makeApi().getRoles(makeUser({ parent: 'did:parent' }), res, null, 0, 20);
        assert.equal(seenOptions.owner, 'did:parent');
    });

    it('createRole creates the role in both Users and Guardians', async () => {
        let guardianRole;
        usersImpl = { createRole: async () => ({ id: 'role-1' }) };
        guardiansImpl = { createRole: async (role) => { guardianRole = role; } };
        const out = await makeApi().createRole(makeUser(), { name: 'R' });
        assert.deepEqual(out, { id: 'role-1' });
        assert.deepEqual(guardianRole, { id: 'role-1' });
    });

    it('updateRole throws 404 when the role does not exist', async () => {
        usersImpl = { getRoleById: async () => null };
        await assert.rejects(makeApi().updateRole(makeUser(), 'r1', {}), is404);
    });

    it('updateRole updates, refreshes permissions and invalidates cache', async () => {
        let invalidated = false;
        usersImpl = {
            getRoleById: async () => ({ id: 'r1' }),
            updateRole: async () => ({ id: 'r1', updated: true }),
            refreshUserPermissions: async () => [{ id: 'u' }],
        };
        guardiansImpl = { updateRole: async () => undefined };
        const cacheService = { invalidate: async () => undefined, invalidateAllTagsByPrefixes: async () => { invalidated = true; } };
        const api = new PermissionsApi(cacheService, { error: () => undefined });
        userPermissionsHas = () => true;
        const out = await api.updateRole(makeUser(), 'r1', { name: 'X' });
        assert.deepEqual(out, { id: 'r1', updated: true });
        assert.equal(invalidated, true);
    });

    it('deleteModule throws 422 when id is missing', async () => {
        usersImpl = {};
        await assert.rejects(makeApi().deleteModule(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('deleteModule deletes and refreshes permissions', async () => {
        usersImpl = { deleteRole: async () => ({ deleted: true }), refreshUserPermissions: async () => [] };
        guardiansImpl = { deleteRole: async () => undefined };
        const out = await makeApi().deleteModule(makeUser(), 'r1');
        assert.deepEqual(out, { deleted: true });
    });

    it('setDefaultRole forwards the body id', async () => {
        let seen;
        usersImpl = { setDefaultRole: async (id) => { seen = id; return { ok: true }; } };
        const out = await makeApi().setDefaultRole(makeUser(), { id: 'role-x' });
        assert.deepEqual(out, { ok: true });
        assert.equal(seen, 'role-x');
    });

    it('getUsers excludes the requester via did $ne and decorates assigned entities', async () => {
        let seenOptions;
        usersImpl = { getWorkers: async (options) => { seenOptions = options; return { items: [{ did: 'did:a' }], count: 1 }; } };
        guardiansImpl = { assignedEntities: async (user, did) => [`ent-${did}`] };
        const { res, calls } = makeRes();
        await makeApi().getUsers(makeUser({ did: 'did:owner' }), res, 0, 20, 'role', 'ACTIVE', 'name');
        assert.deepEqual(seenOptions.filters.did, { $ne: 'did:owner' });
        assert.deepEqual(calls.sent[0].assignedEntities, ['ent-did:a']);
    });

    it('getUser throws 404 when the row parent does not match the owner', async () => {
        usersImpl = { getUserPermissions: async () => ({ parent: 'someone-else', did: 'did:x' }) };
        await assert.rejects(makeApi().getUser(makeUser({ did: 'did:owner' }), 'name'), is404);
    });

    it('getUser throws 404 when the row is the requester', async () => {
        usersImpl = { getUserPermissions: async () => ({ parent: 'did:owner', did: 'did:owner' }) };
        await assert.rejects(makeApi().getUser(makeUser({ did: 'did:owner' }), 'name'), is404);
    });

    it('getUser returns the row when valid', async () => {
        const row = { parent: 'did:owner', did: 'did:other' };
        usersImpl = { getUserPermissions: async () => row };
        assert.deepEqual(await makeApi().getUser(makeUser({ did: 'did:owner' }), 'name'), row);
    });

    it('updateUser throws 404 when the target user is invalid', async () => {
        usersImpl = { getUserPermissions: async () => null };
        await assert.rejects(makeApi().updateUser(makeUser(), 'name', {}, { url: '/x' }), is404);
    });

    it('updateUser updates role and sets it on guardians', async () => {
        let setRoleArg;
        usersImpl = {
            getUserPermissions: async () => ({ parent: 'did:owner', did: 'did:other' }),
            updateUserRole: async () => ({ did: 'did:other', role: 'NEW' }),
        };
        guardiansImpl = { setRole: async (result) => { setRoleArg = result; } };
        const out = await makeApi().updateUser(makeUser({ did: 'did:owner' }), 'name', { role: 'NEW' }, { url: '/x' });
        assert.equal(out.role, 'NEW');
        assert.deepEqual(setRoleArg, { did: 'did:other', role: 'NEW' });
    });

    it('getAssignedPolicies throws 404 for an unknown target', async () => {
        usersImpl = { getUserPermissions: async () => null };
        const { res } = makeRes();
        await assert.rejects(makeApi().getAssignedPolicies(makeUser(), res, 'name', 0, 20, 'ACTIVE'), is404);
    });

    it('getAssignedPolicies returns policies with count header', async () => {
        usersImpl = { getUserPermissions: async () => ({ parent: 'did:owner', did: 'did:t' }) };
        guardiansImpl = { getAssignedPolicies: async () => ({ policies: [{ id: 'p' }], count: 2 }) };
        const { res, calls } = makeRes();
        await makeApi().getAssignedPolicies(makeUser({ did: 'did:owner' }), res, 'name', 0, 20, 'ACTIVE');
        assert.deepEqual(calls.header, { k: 'X-Total-Count', v: 2 });
        assert.deepEqual(calls.sent, [{ id: 'p' }]);
    });

    it('assignPolicy throws 404 for an invalid target', async () => {
        usersImpl = { getUserPermissions: async () => null };
        await assert.rejects(makeApi().assignPolicy(makeUser(), 'name', { policyIds: [], assign: true }), is404);
    });

    it('assignPolicy forwards policyIds/assign to guardians.assignEntity', async () => {
        usersImpl = { getUserPermissions: async () => ({ parent: 'did:owner', did: 'did:t' }) };
        let seen;
        guardiansImpl = { assignEntity: async (user, type, policyIds, assign, did) => { seen = { type, policyIds, assign, did }; return true; } };
        await makeApi().assignPolicy(makeUser({ did: 'did:owner' }), 'name', { policyIds: ['p1'], assign: true });
        assert.deepEqual(seen, { type: 'Policy', policyIds: ['p1'], assign: true, did: 'did:t' });
    });

    it('delegateRole throws 404 when target parent does not match the user parent', async () => {
        usersImpl = { getUserPermissions: async () => ({ parent: 'other', did: 'did:t' }) };
        await assert.rejects(makeApi().delegateRole(makeUser({ parent: 'did:p' }), 'name', {}), is404);
    });

    it('delegateRole delegates and sets the role on guardians', async () => {
        usersImpl = {
            getUserPermissions: async () => ({ parent: 'did:p', did: 'did:t' }),
            delegateUserRole: async () => ({ delegated: true }),
        };
        guardiansImpl = { setRole: async () => undefined };
        const out = await makeApi().delegateRole(makeUser({ parent: 'did:p', did: 'did:owner' }), 'name', {});
        assert.deepEqual(out, { delegated: true });
    });

    it('delegatePolicy throws 404 for an invalid target', async () => {
        usersImpl = { getUserPermissions: async () => null };
        await assert.rejects(makeApi().delegatePolicy(makeUser({ parent: 'did:p' }), 'name', {}), is404);
    });

    it('delegatePolicy forwards to guardians.delegateEntity', async () => {
        usersImpl = { getUserPermissions: async () => ({ parent: 'did:p', did: 'did:t' }) };
        let seen;
        guardiansImpl = { delegateEntity: async (user, type, policyIds, assign, did) => { seen = { policyIds, assign, did }; return 'ok'; } };
        const out = await makeApi().delegatePolicy(makeUser({ parent: 'did:p', did: 'did:owner' }), 'name', { policyIds: ['p2'], assign: false });
        assert.equal(out, 'ok');
        assert.deepEqual(seen, { policyIds: ['p2'], assign: false, did: 'did:t' });
    });
});
