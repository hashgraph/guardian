import assert from 'node:assert/strict';
import esmock from 'esmock';

const RELAYER_DIST = '../../dist/api/service/relayer-accounts.js';
const EXTERNAL_DIST = '../../dist/api/service/external.js';

const authMock = { Auth: () => () => undefined, AuthUser: () => () => undefined };
const middlewaresMock = new Proxy({}, { get: (t, p) => (p === 'Examples' || p === 'ObjectExamples') ? new Proxy({}, { get: () => 'ex' }) : (p === 'pageHeader' ? {} : class {}) });

function makeUser(extra = {}) {
    return { id: 'user-1', tenantContext: { tenantId: 't1' }, ...extra };
}
function makeRes() {
    const calls = { header: null, sent: undefined };
    const res = { header: (k, v) => { calls.header = { k, v }; return { send: (b) => { calls.sent = b; return { calls }; } }; } };
    return { res, calls };
}

describe('RelayerAccountsApi', function () {
    this.timeout(60000);
    let RelayerAccountsApi;
    let usersImpl;
    let guardiansImpl;
    let ctorTc;

    before(async () => {
        ({ RelayerAccountsApi } = await esmock(RELAYER_DIST, {
            '#auth': authMock,
            '#helpers': {
                InternalException: async (e) => { throw e; },
                Guardians: class { constructor(tc) { ctorTc = tc; } async getRelayerAccountRelationships(...a) { return guardiansImpl.getRelayerAccountRelationships(...a); } },
                Users: class {
                    constructor(tc) { ctorTc = tc; }
                    async getRelayerAccounts(...a) { return usersImpl.getRelayerAccounts(...a); }
                    async createRelayerAccount(...a) { return usersImpl.createRelayerAccount(...a); }
                    async getCurrentRelayerAccount(...a) { return usersImpl.getCurrentRelayerAccount(...a); }
                    async getRelayerAccountsAll(...a) { return usersImpl.getRelayerAccountsAll(...a); }
                    async getRelayerAccountBalance(...a) { return usersImpl.getRelayerAccountBalance(...a); }
                    async generateRelayerAccount(...a) { return usersImpl.generateRelayerAccount(...a); }
                    async getUserRelayerAccounts(...a) { return usersImpl.getUserRelayerAccounts(...a); }
                },
            },
            '@guardian/common': { PinoLogger: class {} },
            '#middlewares': middlewaresMock,
        }));
    });

    function makeApi() { return new RelayerAccountsApi({ error: () => undefined }); }

    it('getRelayerAccounts sets the total-count header and sends items', async () => {
        usersImpl = { getRelayerAccounts: async () => ({ items: [{ id: 'a' }], count: 3 }) };
        const { res, calls } = makeRes();
        await makeApi().getRelayerAccounts(makeUser(), res, 0, 20, 'q');
        assert.deepEqual(calls.header, { k: 'X-Total-Count', v: 3 });
        assert.deepEqual(calls.sent, [{ id: 'a' }]);
    });

    it('getRelayerAccounts forwards filters (search/pageIndex/pageSize)', async () => {
        let seen;
        usersImpl = { getRelayerAccounts: async (user, filters) => { seen = filters; return { items: [], count: 0 }; } };
        const { res } = makeRes();
        await makeApi().getRelayerAccounts(makeUser(), res, 2, 50, 'term');
        assert.deepEqual(seen, { search: 'term', pageIndex: 2, pageSize: 50 });
    });

    it('getRelayerAccounts rethrows via InternalException', async () => {
        usersImpl = { getRelayerAccounts: async () => { throw new Error('list'); } };
        const { res } = makeRes();
        await assert.rejects(makeApi().getRelayerAccounts(makeUser(), res, 0, 0), /list/);
    });

    it('createRelayerAccount forwards the body to users', async () => {
        let seen;
        usersImpl = { createRelayerAccount: async (user, body) => { seen = body; return { id: 'new' }; } };
        const out = await makeApi().createRelayerAccount(makeUser(), { name: 'acc' });
        assert.deepEqual(out, { id: 'new' });
        assert.deepEqual(seen, { name: 'acc' });
    });

    it('createRelayerAccount stamps 422 onto errors before rethrowing', async () => {
        usersImpl = { createRelayerAccount: async () => { throw new Error('bad'); } };
        await assert.rejects(makeApi().createRelayerAccount(makeUser(), {}), (e) => { assert.equal(e.code, 422); return true; });
    });

    it('getCurrentRelayerAccount returns the current account', async () => {
        usersImpl = { getCurrentRelayerAccount: async () => ({ current: true }) };
        assert.deepEqual(await makeApi().getCurrentRelayerAccount(makeUser()), { current: true });
    });

    it('getRelayerAccountsAll returns all accounts', async () => {
        usersImpl = { getRelayerAccountsAll: async () => [{ id: 1 }, { id: 2 }] };
        assert.deepEqual(await makeApi().getRelayerAccountsAll(makeUser()), [{ id: 1 }, { id: 2 }]);
    });

    it('getRelayerAccountBalance forwards the account param', async () => {
        let seen;
        usersImpl = { getRelayerAccountBalance: async (user, account) => { seen = account; return '100'; } };
        const out = await makeApi().getRelayerAccountBalance(makeUser(), '0.0.5');
        assert.equal(out, '100');
        assert.equal(seen, '0.0.5');
    });

    it('generateRelayerAccount stamps 422 onto errors before rethrowing', async () => {
        usersImpl = { generateRelayerAccount: async () => { throw new Error('gen'); } };
        await assert.rejects(makeApi().generateRelayerAccount(makeUser()), (e) => { assert.equal(e.code, 422); return true; });
    });

    it('generateRelayerAccount returns the generated account', async () => {
        usersImpl = { generateRelayerAccount: async () => ({ generated: true }) };
        assert.deepEqual(await makeApi().generateRelayerAccount(makeUser()), { generated: true });
    });

    it('getUserRelayerAccounts sets the total-count header and sends items', async () => {
        usersImpl = { getUserRelayerAccounts: async () => ({ items: ['x'], count: 9 }) };
        const { res, calls } = makeRes();
        await makeApi().getUserRelayerAccounts(makeUser(), res, 0, 10, '');
        assert.deepEqual(calls.header, { k: 'X-Total-Count', v: 9 });
        assert.deepEqual(calls.sent, ['x']);
    });

    it('getRelayerAccountRelationships uses Guardians and forwards the account id', async () => {
        let seen;
        guardiansImpl = { getRelayerAccountRelationships: async (id, user, filters) => { seen = { id, filters }; return { items: ['r'], count: 1 }; } };
        const { res, calls } = makeRes();
        await makeApi().getRelayerAccountRelationships(makeUser(), res, 'acc-1', 1, 5);
        assert.equal(seen.id, 'acc-1');
        assert.deepEqual(seen.filters, { pageIndex: 1, pageSize: 5 });
        assert.deepEqual(calls.header, { k: 'X-Total-Count', v: 1 });
    });

    it('getRelayerAccountRelationships rethrows via InternalException', async () => {
        guardiansImpl = { getRelayerAccountRelationships: async () => { throw new Error('rel'); } };
        const { res } = makeRes();
        await assert.rejects(makeApi().getRelayerAccountRelationships(makeUser(), res, 'x', 0, 0), /rel/);
    });
});

describe('ExternalApi', function () {
    this.timeout(60000);
    let ExternalApi;
    let engineImpl;

    before(async () => {
        ({ ExternalApi } = await esmock(EXTERNAL_DIST, {
            '#helpers': {
                InternalException: async (e) => { throw e; },
                PolicyEngine: class {
                    constructor(tc) { this.tc = tc; }
                    async receiveExternalDataCustom(...a) { return engineImpl.receiveExternalDataCustom(...a); }
                    async receiveExternalData(...a) { return engineImpl.receiveExternalData(...a); }
                },
            },
            '#middlewares': middlewaresMock,
            '@guardian/common': { PinoLogger: class {} },
        }));
    });

    function makeApi() { return new ExternalApi({ error: () => undefined }); }

    it('receiveExternalDataCustom forwards document, policyId and blockTag', async () => {
        let seen;
        engineImpl = { receiveExternalDataCustom: async (doc, policyId, blockTag) => { seen = { doc, policyId, blockTag }; return { ok: true }; } };
        const out = await makeApi().receiveExternalDataCustom('p1', 'tag1', { d: 1 });
        assert.deepEqual(out, { ok: true });
        assert.deepEqual(seen, { doc: { d: 1 }, policyId: 'p1', blockTag: 'tag1' });
    });

    it('receiveExternalDataCustom rethrows via InternalException', async () => {
        engineImpl = { receiveExternalDataCustom: async () => { throw new Error('c'); } };
        await assert.rejects(makeApi().receiveExternalDataCustom('p', 't', {}), /c/);
    });

    it('receiveExternalData forwards the document', async () => {
        let seen;
        engineImpl = { receiveExternalData: async (doc) => { seen = doc; return 'done'; } };
        const out = await makeApi().receiveExternalData({ d: 2 });
        assert.equal(out, 'done');
        assert.deepEqual(seen, { d: 2 });
    });

    it('receiveExternalDataCustomWithSyncEvents enables sync events and passes history flag', async () => {
        let seen;
        engineImpl = { receiveExternalDataCustom: async (doc, policyId, blockTag, sync, history) => { seen = { sync, history }; return {}; } };
        await makeApi().receiveExternalDataCustomWithSyncEvents('p', 't', 'yes', {});
        assert.equal(seen.sync, true);
        assert.equal(seen.history, true);
    });

    it('receiveExternalDataCustomWithSyncEvents coerces a falsy history to false', async () => {
        let seen;
        engineImpl = { receiveExternalDataCustom: async (doc, policyId, blockTag, sync, history) => { seen = history; return {}; } };
        await makeApi().receiveExternalDataCustomWithSyncEvents('p', 't', '', {});
        assert.equal(seen, false);
    });

    it('receiveExternalDataWithSyncEvents enables sync events and passes history flag', async () => {
        let seen;
        engineImpl = { receiveExternalData: async (doc, sync, history) => { seen = { sync, history }; return {}; } };
        await makeApi().receiveExternalDataWithSyncEvents('1', {});
        assert.equal(seen.sync, true);
        assert.equal(seen.history, true);
    });

    it('receiveExternalDataWithSyncEvents rethrows via InternalException', async () => {
        engineImpl = { receiveExternalData: async () => { throw new Error('s'); } };
        await assert.rejects(makeApi().receiveExternalDataWithSyncEvents('1', {}), /s/);
    });
});
