import assert from 'node:assert/strict';
import esmock from 'esmock';

const POLICY_REPO_DIST = '../../dist/api/service/policy-repository.js';
const TRUST_CHAINS_DIST = '../../dist/api/service/trust-chains.js';
const WIZARD_DIST = '../../dist/api/service/wizard.js';

const middlewaresMock = new Proxy({}, { get: () => class {} });

let policyEngineImpl;
let guardiansImpl;
let usersImpl;
let taskManagerImpl;

class MockPolicyEngine {
    constructor(tenantContext) { this.tenantContext = tenantContext; }
    async getPolicyRepositoryUsers(...a) { return policyEngineImpl.getPolicyRepositoryUsers(...a); }
    async getPolicyRepositorySchemas(...a) { return policyEngineImpl.getPolicyRepositorySchemas(...a); }
    async getPolicyRepositoryDocuments(...a) { return policyEngineImpl.getPolicyRepositoryDocuments(...a); }
}

class MockGuardians {
    constructor(tenantContext) { this.tenantContext = tenantContext; }
    async getVpDocuments(...a) { return guardiansImpl.getVpDocuments(...a); }
    async getChain(...a) { return guardiansImpl.getChain(...a); }
    async wizardPolicyCreate(...a) { return guardiansImpl.wizardPolicyCreate(...a); }
    async wizardPolicyCreateAsyncNew(...a) { return guardiansImpl.wizardPolicyCreateAsyncNew(...a); }
    async wizardGetPolicyConfig(...a) { return guardiansImpl.wizardGetPolicyConfig(...a); }
}

class MockUsers {
    constructor(tenantContext) { this.tenantContext = tenantContext; }
    async getUsersByIds(...a) { return usersImpl.getUsersByIds(...a); }
}

class MockEntityOwner {
    constructor(user) { this.user = user; this.creator = user?.did; this.owner = user?.did; }
}

class MockTaskManager {
    start(...a) { return taskManagerImpl.start(...a); }
    addError(...a) { return taskManagerImpl.addError(...a); }
}

const helpersMock = {
    PolicyEngine: MockPolicyEngine,
    Guardians: MockGuardians,
    Users: MockUsers,
    EntityOwner: MockEntityOwner,
    TaskManager: MockTaskManager,
    CacheService: class {},
    getCacheKey: (keys) => `ck:${keys.join('|')}`,
    UseCache: () => () => undefined,
    ONLY_SR: '',
    InternalException: async (error) => { throw error; },
};

const commonMock = {
    PinoLogger: class {},
    RunFunctionAsync: async (fn, onError) => {
        try {
            await fn();
        } catch (error) {
            if (onError) { await onError(error); }
        }
    },
};

const authMock = { Auth: () => () => undefined, AuthUser: () => () => undefined };
const constantsMock = { PREFIXES: {}, CACHE: {} };

function makeUser(extra = {}) {
    return { id: 'user-1', did: 'did:u', username: 'bob', tenantContext: { tenantId: 't1' }, ...extra };
}

function makeRes() {
    const res = { _headers: {} };
    res.header = (name, value) => { res._headers[name] = value; return res; };
    res.send = (payload) => { res._sent = payload; return payload; };
    return res;
}

const statusIs = (code) => (e) => { assert.equal(e.getStatus(), code); return true; };
const makeLogger = () => ({ error: async () => undefined });

describe('api-gateway controllers: policy-repository / trust-chains / wizard', function () {
    this.timeout(180000);

    let PolicyRepositoryApi;
    let TrustChainsApi;
    let WizardApi;

    before(async () => {
        ({ PolicyRepositoryApi } = await esmock(POLICY_REPO_DIST, {
            '#helpers': helpersMock,
            '#auth': authMock,
            '#constants': constantsMock,
            '#middlewares': middlewaresMock,
            '@guardian/common': commonMock,
        }));
        ({ TrustChainsApi } = await esmock(TRUST_CHAINS_DIST, {
            '#helpers': helpersMock,
            '#auth': authMock,
            '#constants': constantsMock,
            '#middlewares': middlewaresMock,
            '@guardian/common': commonMock,
        }));
        ({ WizardApi } = await esmock(WIZARD_DIST, {
            '#helpers': helpersMock,
            '#auth': authMock,
            '#constants': constantsMock,
            '#middlewares': middlewaresMock,
            '@guardian/common': commonMock,
        }));
    });

    beforeEach(() => {
        policyEngineImpl = {};
        guardiansImpl = {};
        usersImpl = {};
        taskManagerImpl = {
            start: () => ({ taskId: 'task-1', expectation: 0 }),
            addError: () => undefined,
        };
    });

    describe('PolicyRepositoryApi', function () {
        function makeApi() { return new PolicyRepositoryApi(makeLogger()); }

        it('getUsers forwards user + policyId to getPolicyRepositoryUsers and returns the result', async () => {
            let seen;
            policyEngineImpl.getPolicyRepositoryUsers = async (user, policyId) => {
                seen = { user, policyId };
                return [{ label: 'admin' }];
            };
            const u = makeUser();
            const out = await makeApi().getUsers(u, 'p-1');
            assert.deepEqual(out, [{ label: 'admin' }]);
            assert.equal(seen.user, u);
            assert.equal(seen.policyId, 'p-1');
        });

        it('getUsers rejects with 422 when policyId is missing', async () => {
            await assert.rejects(makeApi().getUsers(makeUser(), ''), statusIs(422));
        });

        it('getUsers maps a proxy error via InternalException', async () => {
            policyEngineImpl.getPolicyRepositoryUsers = async () => { throw new HttpLikeError('boom', 500); };
            await assert.rejects(makeApi().getUsers(makeUser(), 'p-1'), (e) => { assert.match(e.message, /boom/); return true; });
        });

        it('getSchemas forwards user + policyId to getPolicyRepositorySchemas and returns the result', async () => {
            let seen;
            policyEngineImpl.getPolicyRepositorySchemas = async (user, policyId) => {
                seen = { user, policyId };
                return [{ iri: '#s1' }];
            };
            const u = makeUser();
            const out = await makeApi().getSchemas(u, 'p-2');
            assert.deepEqual(out, [{ iri: '#s1' }]);
            assert.equal(seen.user, u);
            assert.equal(seen.policyId, 'p-2');
        });

        it('getSchemas rejects with 422 when policyId is missing', async () => {
            await assert.rejects(makeApi().getSchemas(makeUser(), undefined), statusIs(422));
        });

        it('getSchemas maps a proxy error via InternalException', async () => {
            policyEngineImpl.getPolicyRepositorySchemas = async () => { throw new HttpLikeError('schema-fail', 500); };
            await assert.rejects(makeApi().getSchemas(makeUser(), 'p-2'), (e) => { assert.match(e.message, /schema-fail/); return true; });
        });

        it('getDocuments builds the filters object, sets X-Total-Count and sends documents', async () => {
            let seen;
            policyEngineImpl.getPolicyRepositoryDocuments = async (user, policyId, filters) => {
                seen = { user, policyId, filters };
                return { documents: [{ id: 'd1' }], count: 7 };
            };
            const res = makeRes();
            const u = makeUser();
            const out = await makeApi().getDocuments(u, res, 'p-3', 1, 20, 'VC', 'did:owner', '#schema', true);
            assert.deepEqual(out, [{ id: 'd1' }]);
            assert.equal(res._headers['X-Total-Count'], 7);
            assert.equal(seen.policyId, 'p-3');
            assert.deepEqual(seen.filters, {
                type: 'VC',
                owner: 'did:owner',
                schema: '#schema',
                comments: true,
                pageIndex: 1,
                pageSize: 20,
            });
        });

        it('getDocuments rejects with 422 when policyId is missing', async () => {
            await assert.rejects(makeApi().getDocuments(makeUser(), makeRes(), '', 0, 20), statusIs(422));
        });

        it('getDocuments maps a proxy error via InternalException', async () => {
            policyEngineImpl.getPolicyRepositoryDocuments = async () => { throw new HttpLikeError('doc-fail', 500); };
            await assert.rejects(
                makeApi().getDocuments(makeUser(), makeRes(), 'p-3', 0, 20),
                (e) => { assert.match(e.message, /doc-fail/); return true; }
            );
        });
    });

    describe('TrustChainsApi', function () {
        function makeApi() { return new TrustChainsApi(makeLogger()); }

        it('getTrustChains passes undefined filters when neither policyId nor policyOwner are given', async () => {
            let seen;
            guardiansImpl.getVpDocuments = async (user, options) => {
                seen = { user, options };
                return { items: [{ id: 'vp1' }], count: 3 };
            };
            const res = makeRes();
            const out = await makeApi().getTrustChains(makeUser(), res, 0, 20);
            assert.deepEqual(out, [{ id: 'vp1' }]);
            assert.equal(res._headers['X-Total-Count'], 3);
            assert.equal(seen.options.filters, undefined);
            assert.equal(seen.options.pageIndex, 0);
            assert.equal(seen.options.pageSize, 20);
        });

        it('getTrustChains builds a policyId filter when policyId is provided', async () => {
            let seen;
            guardiansImpl.getVpDocuments = async (user, options) => { seen = options; return { items: [], count: 0 }; };
            await makeApi().getTrustChains(makeUser(), makeRes(), 1, 10, 'pol-9');
            assert.deepEqual(seen.filters, { policyId: 'pol-9' });
        });

        it('getTrustChains builds a policyOwner filter when only policyOwner is provided', async () => {
            let seen;
            guardiansImpl.getVpDocuments = async (user, options) => { seen = options; return { items: [], count: 0 }; };
            await makeApi().getTrustChains(makeUser(), makeRes(), undefined, undefined, undefined, 'did:owner');
            assert.deepEqual(seen.filters, { policyOwner: 'did:owner' });
        });

        it('getTrustChains prefers policyId over policyOwner when both are provided', async () => {
            let seen;
            guardiansImpl.getVpDocuments = async (user, options) => { seen = options; return { items: [], count: 0 }; };
            await makeApi().getTrustChains(makeUser(), makeRes(), undefined, undefined, 'pol-1', 'did:owner');
            assert.deepEqual(seen.filters, { policyId: 'pol-1' });
        });

        it('getTrustChains maps a proxy error via InternalException', async () => {
            guardiansImpl.getVpDocuments = async () => { throw new HttpLikeError('vp-fail', 500); };
            await assert.rejects(
                makeApi().getTrustChains(makeUser(), makeRes()),
                (e) => { assert.match(e.message, /vp-fail/); return true; }
            );
        });

        it('getTrustChainByHash returns the chain and a userMap built from chain DIDs', async () => {
            guardiansImpl.getChain = async (user, hash) => {
                assert.equal(hash, 'h-1');
                return [
                    { type: 'VC', document: { issuer: 'did:issuer-str' } },
                    { type: 'VC', document: { issuer: { id: 'did:issuer-obj' } } },
                    { type: 'DID', id: 'did:did-node' },
                    { type: 'VP', document: {} },
                ];
            };
            let seenIds;
            usersImpl.getUsersByIds = async (dids, id) => {
                seenIds = dids;
                return [{ username: 'alice', did: 'did:issuer-str' }];
            };
            const out = await makeApi().getTrustChainByHash(makeUser(), 'h-1');
            assert.deepEqual(seenIds, ['did:issuer-str', 'did:issuer-obj', 'did:did-node']);
            assert.deepEqual(out.chain.length, 4);
            assert.deepEqual(out.userMap, [{ username: 'alice', did: 'did:issuer-str' }]);
        });

        it('getTrustChainByHash tolerates getUsersByIds returning null (empty userMap)', async () => {
            guardiansImpl.getChain = async () => [{ type: 'DID', id: 'did:x' }];
            usersImpl.getUsersByIds = async () => null;
            const out = await makeApi().getTrustChainByHash(makeUser(), 'h-2');
            assert.deepEqual(out.userMap, []);
            assert.equal(out.chain.length, 1);
        });

        it('getTrustChainByHash maps a proxy error via InternalException', async () => {
            guardiansImpl.getChain = async () => { throw new HttpLikeError('chain-fail', 500); };
            await assert.rejects(
                makeApi().getTrustChainByHash(makeUser(), 'h-3'),
                (e) => { assert.match(e.message, /chain-fail/); return true; }
            );
        });
    });

    describe('WizardApi', function () {
        function makeApi() { return new WizardApi(makeLogger()); }

        it('setPolicy forwards the wizard config and an EntityOwner to wizardPolicyCreate', async () => {
            let seen;
            guardiansImpl.wizardPolicyCreate = async (config, owner) => {
                seen = { config, owner };
                return { policyId: 'p-new' };
            };
            const cfg = { policy: { name: 'X' } };
            const out = await makeApi().setPolicy(makeUser(), cfg);
            assert.deepEqual(out, { policyId: 'p-new' });
            assert.equal(seen.config, cfg);
            assert.ok(seen.owner instanceof MockEntityOwner);
            assert.equal(seen.owner.creator, 'did:u');
        });

        it('setPolicy maps a proxy error via InternalException', async () => {
            guardiansImpl.wizardPolicyCreate = async () => { throw new HttpLikeError('create-fail', 500); };
            await assert.rejects(
                makeApi().setPolicy(makeUser(), {}),
                (e) => { assert.match(e.message, /create-fail/); return true; }
            );
        });

        it('setPolicyAsync starts a task and returns it immediately', async () => {
            let startedAction;
            taskManagerImpl.start = (action, userId) => {
                startedAction = { action, userId };
                return { taskId: 'task-async', expectation: 0 };
            };
            let createArgs;
            guardiansImpl.wizardPolicyCreateAsyncNew = async (config, owner, saveState, task) => {
                createArgs = { config, owner, saveState, task };
            };
            const cfg = { policy: { name: 'A' } };
            const out = await makeApi().setPolicyAsync(makeUser(), { wizardConfig: cfg, saveState: true });
            assert.deepEqual(out, { taskId: 'task-async', expectation: 0 });
            assert.equal(startedAction.userId, 'user-1');
            assert.equal(createArgs.config, cfg);
            assert.equal(createArgs.saveState, true);
            assert.ok(createArgs.owner instanceof MockEntityOwner);
            assert.deepEqual(createArgs.task, { taskId: 'task-async', expectation: 0 });
        });

        it('setPolicyAsync records the error on the task when the async run throws', async () => {
            let addedError;
            taskManagerImpl.addError = (taskId, error) => { addedError = { taskId, error }; };
            guardiansImpl.wizardPolicyCreateAsyncNew = async () => { throw new Error('async-boom'); };
            await makeApi().setPolicyAsync(makeUser(), { wizardConfig: {}, saveState: false });
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(addedError.taskId, 'task-1');
            assert.equal(addedError.error.code, 500);
            assert.equal(addedError.error.message, 'async-boom');
        });

        it('setPolicyConfig forwards policyId, config and an EntityOwner to wizardGetPolicyConfig', async () => {
            let seen;
            guardiansImpl.wizardGetPolicyConfig = async (policyId, config, owner) => {
                seen = { policyId, config, owner };
                return { preview: true };
            };
            const cfg = { policy: { name: 'C' } };
            const out = await makeApi().setPolicyConfig(makeUser(), 'p-cfg', cfg);
            assert.deepEqual(out, { preview: true });
            assert.equal(seen.policyId, 'p-cfg');
            assert.equal(seen.config, cfg);
            assert.ok(seen.owner instanceof MockEntityOwner);
        });

        it('setPolicyConfig maps a proxy error via InternalException', async () => {
            guardiansImpl.wizardGetPolicyConfig = async () => { throw new HttpLikeError('cfg-fail', 500); };
            await assert.rejects(
                makeApi().setPolicyConfig(makeUser(), 'p-cfg', {}),
                (e) => { assert.match(e.message, /cfg-fail/); return true; }
            );
        });
    });
});

class HttpLikeError extends Error {
    constructor(message, status) {
        super(message);
        this._status = status;
    }
    getStatus() { return this._status; }
}
