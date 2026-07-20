import assert from 'node:assert/strict';
import esmock from 'esmock';

const EP_DIST = '../../dist/api/service/external-policy.js';
const middlewaresMock = new Proxy({}, { get: (t, p) => p === 'Examples' ? new Proxy({}, { get: () => 'ex' }) : (p === 'pageHeader' ? {} : class {}) });

function makeUser(extra = {}) {
    return { id: 'user-1', did: 'did:u', tenantContext: { tenantId: 't1' }, ...extra };
}
function makeRes() {
    const calls = {};
    const res = {
        header: (k, v) => { calls.header = { k, v }; return { send: (b) => { calls.sent = b; return calls; } }; },
        send: (b) => { calls.sent = b; return calls; },
    };
    return { res, calls };
}
const is422 = (e) => { assert.equal(e.getStatus(), 422); return true; };
const is404 = (e) => { assert.equal(e.getStatus(), 404); return true; };

describe('ExternalPoliciesApi', function () {
    this.timeout(60000);
    let ExternalPoliciesApi;
    let guardiansImpl;
    let engineImpl;
    let userPermissionsHas;
    let runRan;

    before(async () => {
        ({ ExternalPoliciesApi } = await esmock(EP_DIST, {
            '@guardian/common': { PinoLogger: class {}, RunFunctionAsync: (fn) => { runRan = true; fn(); } },
            '@guardian/interfaces': {
                LocationType: new Proxy({}, { get: () => 'l' }),
                Permissions: new Proxy({}, { get: () => 'p' }),
                TaskAction: new Proxy({}, { get: () => 'a' }),
                UserPermissions: { has: (...a) => userPermissionsHas(...a) },
            },
            '#middlewares': middlewaresMock,
            '#helpers': {
                Guardians: class {
                    constructor(tc) { this.tc = tc; }
                    async groupExternalPolicyRequests(...a) { return guardiansImpl.groupExternalPolicyRequests(...a); }
                    async previewExternalPolicy(...a) { return guardiansImpl.previewExternalPolicy(...a); }
                    async importExternalPolicy(...a) { return guardiansImpl.importExternalPolicy(...a); }
                    async getExternalPolicyRequest(...a) { return guardiansImpl.getExternalPolicyRequest(...a); }
                    async approveExternalPolicyAsync(...a) { return guardiansImpl.approveExternalPolicyAsync(...a); }
                    async rejectExternalPolicyAsync(...a) { return guardiansImpl.rejectExternalPolicyAsync(...a); }
                    async approveExternalPolicy(...a) { return guardiansImpl.approveExternalPolicy(...a); }
                    async rejectExternalPolicy(...a) { return guardiansImpl.rejectExternalPolicy(...a); }
                    async disconnectPolicy(...a) { return guardiansImpl.disconnectPolicy(...a); }
                    async deletePolicy(...a) { return guardiansImpl.deletePolicy(...a); }
                },
                InternalException: async (e) => { throw e; },
                EntityOwner: class { constructor(user) { this.owner = user?.did; } },
                TaskManager: class { start() { return { taskId: 't1' }; } addError() {} },
                PolicyEngine: class {
                    constructor(tc) { this.tc = tc; }
                    async getRemoteRequests(...a) { return engineImpl.getRemoteRequests(...a); }
                    async approveRemoteRequest(...a) { return engineImpl.approveRemoteRequest(...a); }
                    async rejectRemoteRequest(...a) { return engineImpl.rejectRemoteRequest(...a); }
                    async cancelRemoteRequest(...a) { return engineImpl.cancelRemoteRequest(...a); }
                    async loadRemoteRequest(...a) { return engineImpl.loadRemoteRequest(...a); }
                    async getRemoteRequestsCount(...a) { return engineImpl.getRemoteRequestsCount(...a); }
                    async getRequestDocument(...a) { return engineImpl.getRequestDocument(...a); }
                },
            },
            '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined, AuthAndLocation: () => () => undefined },
        }));
    });

    function makeApi() { userPermissionsHas = () => false; runRan = false; return new ExternalPoliciesApi({ error: () => undefined }); }

    it('getExternalPolicies sends grouped requests with the count header', async () => {
        guardiansImpl = { groupExternalPolicyRequests: async () => ({ items: [{ id: 'a' }], count: 2 }) };
        const { res, calls } = makeRes();
        await makeApi().getExternalPolicies(makeUser(), res, 0, 20);
        assert.deepEqual(calls.header, { k: 'X-Total-Count', v: 2 });
        assert.deepEqual(calls.sent, [{ id: 'a' }]);
    });

    it('getExternalPolicies passes the full flag based on UPDATE permission', async () => {
        let seenOptions;
        guardiansImpl = { groupExternalPolicyRequests: async (options) => { seenOptions = options; return { items: [], count: 0 }; } };
        const api = makeApi();
        userPermissionsHas = () => true;
        const { res } = makeRes();
        await api.getExternalPolicies(makeUser(), res, 1, 10);
        assert.equal(seenOptions.full, true);
        assert.equal(seenOptions.pageIndex, 1);
    });

    it('previewExternalPolicy throws 422 when messageId is missing', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().previewExternalPolicy(makeUser(), {}), is422);
    });

    it('previewExternalPolicy forwards the messageId', async () => {
        let seen;
        guardiansImpl = { previewExternalPolicy: async (id) => { seen = id; return { preview: true }; } };
        const out = await makeApi().previewExternalPolicy(makeUser(), { messageId: 'm1' });
        assert.deepEqual(out, { preview: true });
        assert.equal(seen, 'm1');
    });

    it('importExternalPolicy throws 422 without a messageId', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().importExternalPolicy(makeUser(), {}), is422);
    });

    it('importExternalPolicy imports by messageId', async () => {
        guardiansImpl = { importExternalPolicy: async (id) => ({ imported: id }) };
        assert.deepEqual(await makeApi().importExternalPolicy(makeUser(), { messageId: 'm2' }), { imported: 'm2' });
    });

    it('approveExternalPolicyAsync throws 422 with no id', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().approveExternalPolicyAsync(makeUser(), ''), is422);
    });

    it('approveExternalPolicyAsync throws 404 when the item is missing', async () => {
        guardiansImpl = { getExternalPolicyRequest: async () => null };
        await assert.rejects(makeApi().approveExternalPolicyAsync(makeUser(), 'm1'), is404);
    });

    it('approveExternalPolicyAsync starts a task when the item exists', async () => {
        guardiansImpl = { getExternalPolicyRequest: async () => ({ id: 'x' }), approveExternalPolicyAsync: async () => undefined };
        const out = await makeApi().approveExternalPolicyAsync(makeUser(), 'm1');
        assert.equal(out.taskId, 't1');
        assert.equal(runRan, true);
    });

    it('rejectExternalPolicyAsync throws 404 when the item is missing', async () => {
        guardiansImpl = { getExternalPolicyRequest: async () => null };
        await assert.rejects(makeApi().rejectExternalPolicyAsync(makeUser(), 'm1'), is404);
    });

    it('rejectExternalPolicyAsync starts a task when the item exists', async () => {
        guardiansImpl = { getExternalPolicyRequest: async () => ({ id: 'x' }), rejectExternalPolicyAsync: async () => undefined };
        const out = await makeApi().rejectExternalPolicyAsync(makeUser(), 'm1');
        assert.equal(out.taskId, 't1');
    });

    it('approveExternalPolicy throws 404 when the item is missing', async () => {
        guardiansImpl = { getExternalPolicyRequest: async () => null };
        await assert.rejects(makeApi().approveExternalPolicy(makeUser(), 'm1'), is404);
    });

    it('approveExternalPolicy approves an existing item', async () => {
        guardiansImpl = { getExternalPolicyRequest: async () => ({ id: 'x' }), approveExternalPolicy: async () => 'approved' };
        assert.equal(await makeApi().approveExternalPolicy(makeUser(), 'm1'), 'approved');
    });

    it('rejectExternalPolicy rejects an existing item', async () => {
        guardiansImpl = { getExternalPolicyRequest: async () => ({ id: 'x' }), rejectExternalPolicy: async () => 'rejected' };
        assert.equal(await makeApi().rejectExternalPolicy(makeUser(), 'm1'), 'rejected');
    });

    it('disconnectPolicy coerces the full string flag to a boolean', async () => {
        let seenFull;
        guardiansImpl = { disconnectPolicy: async (id, full) => { seenFull = full; return true; } };
        await makeApi().disconnectPolicy(makeUser(), 'm1', 'true');
        assert.equal(seenFull, true);
    });

    it('disconnectPolicy passes false for a non-true flag', async () => {
        let seenFull;
        guardiansImpl = { disconnectPolicy: async (id, full) => { seenFull = full; return true; } };
        await makeApi().disconnectPolicy(makeUser(), 'm1', 'no');
        assert.equal(seenFull, false);
    });

    it('deletePolicy deletes by messageId', async () => {
        let seen;
        guardiansImpl = { deletePolicy: async (id) => { seen = id; return true; } };
        await makeApi().deletePolicy(makeUser(), 'm9');
        assert.equal(seen, 'm9');
    });

    it('getRemoteRequests builds filters and sends items with count', async () => {
        let seenOptions;
        engineImpl = { getRemoteRequests: async (options) => { seenOptions = options; return { items: ['r'], count: 1 }; } };
        const { res, calls } = makeRes();
        await makeApi().getRemoteRequests(makeUser(), res, 0, 20, 'pol', 'NEW', 'TypeX');
        assert.deepEqual(seenOptions.filters, { policyId: 'pol', status: 'NEW', type: 'TypeX' });
        assert.deepEqual(calls.header, { k: 'X-Total-Count', v: 1 });
    });

    it('approveRemoteRequest throws 422 without an id', async () => {
        engineImpl = {};
        await assert.rejects(makeApi().approveRemoteRequest(makeUser(), ''), is422);
    });

    it('approveRemoteRequest approves via the engine', async () => {
        engineImpl = { approveRemoteRequest: async (id) => ({ approved: id }) };
        assert.deepEqual(await makeApi().approveRemoteRequest(makeUser(), 'm1'), { approved: 'm1' });
    });

    it('rejectRemoteRequest rejects via the engine', async () => {
        engineImpl = { rejectRemoteRequest: async (id) => ({ rejected: id }) };
        assert.deepEqual(await makeApi().rejectRemoteRequest(makeUser(), 'm1'), { rejected: 'm1' });
    });

    it('cancelRemoteRequest cancels via the engine', async () => {
        engineImpl = { cancelRemoteRequest: async (id) => ({ cancelled: id }) };
        assert.deepEqual(await makeApi().cancelRemoteRequest(makeUser(), 'm1'), { cancelled: 'm1' });
    });

    it('loadRemoteRequest throws 422 without an id', async () => {
        engineImpl = {};
        await assert.rejects(makeApi().loadRemoteRequest(makeUser(), ''), is422);
    });

    it('loadRemoteRequest loads via the engine', async () => {
        engineImpl = { loadRemoteRequest: async (id) => ({ loaded: id }) };
        assert.deepEqual(await makeApi().loadRemoteRequest(makeUser(), 'm1'), { loaded: 'm1' });
    });

    it('getRemoteRequestsCount sends the engine count result', async () => {
        engineImpl = { getRemoteRequestsCount: async () => ({ count: 5 }) };
        const { res, calls } = makeRes();
        await makeApi().getRemoteRequestsCount(makeUser(), res, 'pol');
        assert.deepEqual(calls.sent, { count: 5 });
    });

    it('getRequestDocument sends the document result', async () => {
        engineImpl = { getRequestDocument: async () => ({ doc: 1 }) };
        const { res, calls } = makeRes();
        await makeApi().getRequestDocument(makeUser(), res, 'start-1');
        assert.deepEqual(calls.sent, { doc: 1 });
    });
});
