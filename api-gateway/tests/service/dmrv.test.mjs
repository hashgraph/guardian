import assert from 'node:assert/strict';
import esmock from 'esmock';

const DMRV_DIST = '../../dist/api/service/dmrv.js';

let engineStub;
let invalidatedKeys;

class MockPolicyEngine {
    constructor(tenantContext) {
        this.tenantContext = tenantContext;
    }
    getPolicy(...args) { return engineStub.getPolicy(...args); }
    setBlockDataByTag(...args) { return engineStub.setBlockDataByTag(...args); }
    getBlockDataByTag(...args) { return engineStub.getBlockDataByTag(...args); }
}

const helpersMock = {
    PolicyEngine: MockPolicyEngine,
    EntityOwner: class { constructor(user) { this.user = user; } },
    getCacheKey: (tags) => `cache:${tags.join('|')}`,
    InternalException: async (error) => { throw error; },
    CacheService: class {},
};

async function loadDmrv() {
    return await esmock(DMRV_DIST, {
        '#helpers': helpersMock,
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#constants': { PREFIXES: { POLICIES: 'policies/' } },
        '#middlewares': { InternalServerErrorDTO: class {} },
        '@guardian/common': { PinoLogger: class {} },
    });
}

function makeUser() {
    return { id: 'user-1', did: 'did:hedera:user', tenantContext: { tenantId: 't1' } };
}

function makeReq({ alias, method = 'GET', url = '/api/v1/dmrv/p1/x' }) {
    return { params: { '*': alias }, method, url };
}

function makeApi(DmrvApi) {
    invalidatedKeys = [];
    const cacheService = { invalidate: async (key) => { invalidatedKeys.push(key); } };
    const logger = { error: () => undefined };
    return new DmrvApi(cacheService, logger);
}

describe('DmrvApi.proxyByAlias — alias resolution', function () {
    this.timeout(60000);

    let DmrvApi;

    before(async () => {
        ({ DmrvApi } = await loadDmrv());
    });

    beforeEach(() => {
        engineStub = {
            getPolicy: async () => ({
                policyDocumentation: [
                    { alias: 'monitoring-reports/create', method: 'POST', target: 'tag_create' },
                    { alias: 'monitoring-reports', method: 'GET', target: 'tag_list' },
                    { alias: 'status', method: 'Both', target: 'tag_status' },
                ],
            }),
            getBlockDataByTag: async (user, policyId, tag) => ({ ok: 'get', tag }),
            setBlockDataByTag: async (user, policyId, tag) => ({ ok: 'set', tag }),
        };
    });

    it('resolves a valid nested alias on a GET and forwards to getBlockDataByTag', async () => {
        const api = makeApi(DmrvApi);
        const res = await api.proxyByAlias(
            makeUser(), 'p1', {}, undefined,
            makeReq({ alias: 'monitoring-reports', method: 'GET' })
        );
        assert.deepEqual(res, { ok: 'get', tag: 'tag_list' });
    });

    it('resolves a valid flat alias', async () => {
        engineStub.getPolicy = async () => ({
            policyDocumentation: [{ alias: 'create', method: 'GET', target: 'tag_flat' }],
        });
        const api = makeApi(DmrvApi);
        const res = await api.proxyByAlias(
            makeUser(), 'p1', {}, undefined,
            makeReq({ alias: 'create', method: 'GET' })
        );
        assert.equal(res.tag, 'tag_flat');
    });

    it('rejects an uppercase alias with 400', async () => {
        const api = makeApi(DmrvApi);
        await assert.rejects(
            api.proxyByAlias(makeUser(), 'p1', {}, undefined, makeReq({ alias: 'Monitoring-Reports' })),
            (err) => { assert.equal(err.getStatus(), 400); return true; }
        );
    });

    it('rejects a double-slash alias with 400', async () => {
        const api = makeApi(DmrvApi);
        await assert.rejects(
            api.proxyByAlias(makeUser(), 'p1', {}, undefined, makeReq({ alias: 'monitoring-reports//create' })),
            (err) => { assert.equal(err.getStatus(), 400); return true; }
        );
    });

    it('rejects an empty alias with 400', async () => {
        const api = makeApi(DmrvApi);
        await assert.rejects(
            api.proxyByAlias(makeUser(), 'p1', {}, undefined, makeReq({ alias: '' })),
            (err) => { assert.equal(err.getStatus(), 400); return true; }
        );
    });

    it('returns 404 when the policy does not exist', async () => {
        engineStub.getPolicy = async () => null;
        const api = makeApi(DmrvApi);
        await assert.rejects(
            api.proxyByAlias(makeUser(), 'p1', {}, undefined, makeReq({ alias: 'monitoring-reports' })),
            (err) => { assert.equal(err.getStatus(), 404); assert.match(err.message, /Policy does not exist/); return true; }
        );
    });

    it('returns 404 when no documented entry matches the alias', async () => {
        const api = makeApi(DmrvApi);
        await assert.rejects(
            api.proxyByAlias(makeUser(), 'p1', {}, undefined, makeReq({ alias: 'unknown-alias', method: 'GET' })),
            (err) => { assert.equal(err.getStatus(), 404); assert.match(err.message, /No documented endpoint/); return true; }
        );
    });

    it('returns 404 when the alias exists but the method does not match', async () => {
        const api = makeApi(DmrvApi);
        await assert.rejects(
            api.proxyByAlias(makeUser(), 'p1', {}, undefined, makeReq({ alias: 'monitoring-reports/create', method: 'GET' })),
            (err) => { assert.equal(err.getStatus(), 404); return true; }
        );
    });

    it('matches a "Both" entry on a GET request', async () => {
        const api = makeApi(DmrvApi);
        const res = await api.proxyByAlias(
            makeUser(), 'p1', {}, undefined,
            makeReq({ alias: 'status', method: 'GET' })
        );
        assert.deepEqual(res, { ok: 'get', tag: 'tag_status' });
    });

    it('matches a "Both" entry on a POST request and invalidates navigation/groups cache', async () => {
        const api = makeApi(DmrvApi);
        const res = await api.proxyByAlias(
            makeUser(), 'p1', {}, { payload: 1 },
            makeReq({ alias: 'status', method: 'POST', url: '/api/v1/dmrv/p1/status' })
        );
        assert.deepEqual(res, { ok: 'set', tag: 'tag_status' });
        assert.equal(invalidatedKeys.length, 1, 'POST should invalidate cache once');
    });

    it('forwards the resolved target tag to setBlockDataByTag on a POST', async () => {
        let seenTag;
        engineStub.setBlockDataByTag = async (user, policyId, tag) => { seenTag = tag; return { ok: true }; };
        const api = makeApi(DmrvApi);
        await api.proxyByAlias(
            makeUser(), 'p1', {}, { payload: 1 },
            makeReq({ alias: 'monitoring-reports/create', method: 'POST' })
        );
        assert.equal(seenTag, 'tag_create');
    });

    it('parses a savepointIds JSON string on a GET before forwarding', async () => {
        let seenQuery;
        engineStub.getBlockDataByTag = async (user, policyId, tag, query) => { seenQuery = query; return {}; };
        const api = makeApi(DmrvApi);
        await api.proxyByAlias(
            makeUser(), 'p1', { savepointIds: '["s1","s2"]' }, undefined,
            makeReq({ alias: 'monitoring-reports', method: 'GET' })
        );
        assert.deepEqual(seenQuery.savepointIds, ['s1', 's2']);
    });
});
