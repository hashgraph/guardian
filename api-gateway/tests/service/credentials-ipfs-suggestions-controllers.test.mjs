import assert from 'node:assert/strict';
import esmock from 'esmock';

const CREDENTIALS_DIST = '../../dist/api/service/credentials.js';
const IPFS_DIST = '../../dist/api/service/ipfs.js';
const SUGGESTIONS_DIST = '../../dist/api/service/suggestions.js';

let guardiansStub;

class MockGuardians {
    constructor(tenantContext) {
        this.tenantContext = tenantContext;
    }
    getCredentials(...a) { return guardiansStub.getCredentials(...a); }
    setCredential(...a) { return guardiansStub.setCredential(...a); }
    deleteCredential(...a) { return guardiansStub.deleteCredential(...a); }
    addFileIpfs(...a) { return guardiansStub.addFileIpfs(...a); }
    addFileIpfsDirect(...a) { return guardiansStub.addFileIpfsDirect(...a); }
    addFileToDryRunStorage(...a) { return guardiansStub.addFileToDryRunStorage(...a); }
    getFileIpfs(...a) { return guardiansStub.getFileIpfs(...a); }
    getFileFromDryRunStorage(...a) { return guardiansStub.getFileFromDryRunStorage(...a); }
    deleteIpfsCid(...a) { return guardiansStub.deleteIpfsCid(...a); }
    policySuggestions(...a) { return guardiansStub.policySuggestions(...a); }
    setPolicySuggestionsConfig(...a) { return guardiansStub.setPolicySuggestionsConfig(...a); }
    getPolicySuggestionsConfig(...a) { return guardiansStub.getPolicySuggestionsConfig(...a); }
}

const middlewaresMock = new Proxy({}, {
    get: (_t, p) => {
        if (p === 'Examples') { return new Proxy({}, { get: () => 'ex' }); }
        if (p === 'ONLY_SR') { return ' sr'; }
        return class {};
    }
});

const helpersMock = {
    Guardians: MockGuardians,
    InternalException: async (error) => { throw error; },
    CacheService: class {},
    getCacheKey: (keys) => `ck:${(keys || []).join('|')}`,
    UseCache: () => () => undefined,
    ONLY_SR: ' sr',
};

const authMock = {
    Auth: () => () => undefined,
    AuthUser: () => () => undefined,
    checkPermission: () => () => undefined,
};

const constantsMock = {
    CACHE: { LONG_TTL: 60 },
    PREFIXES: { IPFS: 'ipfs' },
};

const commonMock = {
    PinoLogger: class {},
    RunFunctionAsync: (fn) => fn(),
};

function makeUser(over = {}) {
    return { id: 'user-1', did: 'did:u', tenantContext: { tenantId: 't1' }, ...over };
}

function makeLogger() {
    return { error: async () => undefined };
}

function makeCache() {
    const calls = [];
    return { calls, invalidate: async (key) => { calls.push(key); } };
}

const statusIs = (code) => (e) => { assert.equal(e.getStatus ? e.getStatus() : e.status, code); return true; };

describe('CredentialsApi', function () {
    this.timeout(180000);

    let CredentialsApi;

    before(async () => {
        ({ CredentialsApi } = await esmock(CREDENTIALS_DIST, {
            '#helpers': helpersMock,
            '#auth': authMock,
            '#middlewares': middlewaresMock,
            '#constants': constantsMock,
            '@guardian/common': commonMock,
        }));
    });

    beforeEach(() => {
        guardiansStub = {};
    });

    function api() { return new CredentialsApi(makeLogger()); }

    it('getServiceSchemas returns the static schema list', async () => {
        const out = await api().getServiceSchemas(makeUser());
        assert.ok(Array.isArray(out));
    });

    it('getUserGlobalCredentials calls getCredentials(user, null)', async () => {
        let seen;
        guardiansStub.getCredentials = async (...a) => { seen = a; return [{ c: 1 }]; };
        const u = makeUser();
        const out = await api().getUserGlobalCredentials(u);
        assert.deepEqual(out, [{ c: 1 }]);
        assert.deepEqual(seen, [u, null]);
    });

    it('getUserGlobalCredentials maps proxy error via InternalException', async () => {
        guardiansStub.getCredentials = async () => { const e = new Error('x'); e.getStatus = () => 500; throw e; };
        await assert.rejects(api().getUserGlobalCredentials(makeUser()), statusIs(500));
    });

    it('setUserGlobalCredential calls setCredential(user, null, body)', async () => {
        let seen;
        guardiansStub.setCredential = async (...a) => { seen = a; return { ok: true }; };
        const u = makeUser();
        const out = await api().setUserGlobalCredential({ apiKey: 'k' }, u);
        assert.deepEqual(out, { ok: true });
        assert.deepEqual(seen, [u, null, { apiKey: 'k' }]);
    });

    it('deleteUserGlobalCredential maps dryRun string "true" to boolean true', async () => {
        let seen;
        guardiansStub.deleteCredential = async (...a) => { seen = a; return null; };
        const u = makeUser();
        await api().deleteUserGlobalCredential('svc', 'true', u);
        assert.deepEqual(seen, [u, null, 'svc', true]);
    });

    it('deleteUserGlobalCredential maps a non-"true" dryRun to boolean false', async () => {
        let seen;
        guardiansStub.deleteCredential = async (...a) => { seen = a; return null; };
        await api().deleteUserGlobalCredential('svc', 'false', makeUser());
        assert.equal(seen[3], false);
    });

    it('getUserPolicyCredentials forwards the policyId', async () => {
        let seen;
        guardiansStub.getCredentials = async (...a) => { seen = a; return []; };
        const u = makeUser();
        await api().getUserPolicyCredentials('pol-1', u);
        assert.deepEqual(seen, [u, 'pol-1']);
    });

    it('setUserPolicyCredential forwards policyId and body', async () => {
        let seen;
        guardiansStub.setCredential = async (...a) => { seen = a; return { ok: 1 }; };
        const u = makeUser();
        await api().setUserPolicyCredential('pol-2', { v: 1 }, u);
        assert.deepEqual(seen, [u, 'pol-2', { v: 1 }]);
    });

    it('deleteUserPolicyCredential forwards policyId, serviceType and dryRun', async () => {
        let seen;
        guardiansStub.deleteCredential = async (...a) => { seen = a; return null; };
        const u = makeUser();
        await api().deleteUserPolicyCredential('pol-3', 'svc', 'true', u);
        assert.deepEqual(seen, [u, 'pol-3', 'svc', true]);
    });

    it('getSrGlobalCredentialsForUser returns [] when user has no parent', async () => {
        guardiansStub.getCredentials = async () => { throw new Error('should not be called'); };
        const out = await api().getSrGlobalCredentialsForUser(makeUser({ parent: undefined }));
        assert.deepEqual(out, []);
    });

    it('getSrGlobalCredentialsForUser calls getCredentials(user, null, parent) when parent set', async () => {
        let seen;
        guardiansStub.getCredentials = async (...a) => { seen = a; return [{ c: 2 }]; };
        const u = makeUser({ parent: 'sr-did' });
        const out = await api().getSrGlobalCredentialsForUser(u);
        assert.deepEqual(out, [{ c: 2 }]);
        assert.deepEqual(seen, [u, null, 'sr-did']);
    });

    it('getSrPolicyCredentialsForUser returns [] when user has no parent', async () => {
        const out = await api().getSrPolicyCredentialsForUser('pol', makeUser());
        assert.deepEqual(out, []);
    });

    it('getSrPolicyCredentialsForUser calls getCredentials(user, policyId, parent)', async () => {
        let seen;
        guardiansStub.getCredentials = async (...a) => { seen = a; return []; };
        const u = makeUser({ parent: 'sr-did' });
        await api().getSrPolicyCredentialsForUser('pol-4', u);
        assert.deepEqual(seen, [u, 'pol-4', 'sr-did']);
    });

    it('getSrGlobalCredentials calls getCredentials(user, null)', async () => {
        let seen;
        guardiansStub.getCredentials = async (...a) => { seen = a; return ['g']; };
        const u = makeUser();
        const out = await api().getSrGlobalCredentials(u);
        assert.deepEqual(out, ['g']);
        assert.deepEqual(seen, [u, null]);
    });

    it('setSrGlobalCredential calls setCredential(user, null, body)', async () => {
        let seen;
        guardiansStub.setCredential = async (...a) => { seen = a; return {}; };
        const u = makeUser();
        await api().setSrGlobalCredential({ s: 1 }, u);
        assert.deepEqual(seen, [u, null, { s: 1 }]);
    });

    it('deleteSrGlobalCredential maps dryRun and forwards serviceType', async () => {
        let seen;
        guardiansStub.deleteCredential = async (...a) => { seen = a; return null; };
        const u = makeUser();
        await api().deleteSrGlobalCredential('svc', 'true', u);
        assert.deepEqual(seen, [u, null, 'svc', true]);
    });

    it('getSrPolicyCredentials forwards policyId', async () => {
        let seen;
        guardiansStub.getCredentials = async (...a) => { seen = a; return []; };
        const u = makeUser();
        await api().getSrPolicyCredentials('pol-5', u);
        assert.deepEqual(seen, [u, 'pol-5']);
    });

    it('setSrPolicyCredential forwards policyId and body', async () => {
        let seen;
        guardiansStub.setCredential = async (...a) => { seen = a; return {}; };
        const u = makeUser();
        await api().setSrPolicyCredential('pol-6', { b: 2 }, u);
        assert.deepEqual(seen, [u, 'pol-6', { b: 2 }]);
    });

    it('deleteSrPolicyCredential forwards policyId, serviceType, dryRun', async () => {
        let seen;
        guardiansStub.deleteCredential = async (...a) => { seen = a; return null; };
        const u = makeUser();
        await api().deleteSrPolicyCredential('pol-7', 'svc', 'no', u);
        assert.deepEqual(seen, [u, 'pol-7', 'svc', false]);
    });

    it('setSrPolicyCredential maps proxy error via InternalException', async () => {
        guardiansStub.setCredential = async () => { const e = new Error('x'); e.getStatus = () => 503; throw e; };
        await assert.rejects(api().setSrPolicyCredential('p', {}, makeUser()), statusIs(503));
    });
});

describe('IpfsApi', function () {
    this.timeout(180000);

    let IpfsApi;

    before(async () => {
        ({ IpfsApi } = await esmock(IPFS_DIST, {
            '#helpers': helpersMock,
            '#auth': authMock,
            '#middlewares': middlewaresMock,
            '#constants': constantsMock,
            '@guardian/common': commonMock,
        }));
    });

    beforeEach(() => {
        guardiansStub = {};
    });

    function api(cache) { return new IpfsApi(cache || makeCache(), makeLogger()); }
    function makeReq(over = {}) { return { url: '/api/v1/ipfs/file', user: { id: 'user-1' }, ...over }; }

    it('postFile throws 422 when the body is empty', async () => {
        await assert.rejects(api().postFile({}, makeUser(), makeReq()), statusIs(422));
    });

    it('postFile uploads the body and returns the cid as JSON', async () => {
        let seen;
        guardiansStub.addFileIpfs = async (...a) => { seen = a; return { cid: 'CID1' }; };
        const u = makeUser();
        const body = { 0: 1, 1: 2 };
        const out = await api().postFile(body, u, makeReq());
        assert.equal(out, JSON.stringify('CID1'));
        assert.deepEqual(seen, [u, body]);
    });

    it('postFile invalidates the cache after upload', async () => {
        guardiansStub.addFileIpfs = async () => ({ cid: 'CID1' });
        const cache = makeCache();
        await api(cache).postFile({ 0: 1 }, makeUser(), makeReq());
        assert.equal(cache.calls.length, 1);
    });

    it('postFile throws 400 when no cid is returned', async () => {
        guardiansStub.addFileIpfs = async () => ({ cid: null });
        await assert.rejects(api().postFile({ 0: 1 }, makeUser(), makeReq()), statusIs(400));
    });

    it('postFileDirect uploads via addFileIpfsDirect', async () => {
        let seen;
        guardiansStub.addFileIpfsDirect = async (...a) => { seen = a; return { cid: 'CID2' }; };
        const u = makeUser();
        const out = await api().postFileDirect({ 0: 9 }, u, makeReq());
        assert.equal(out, JSON.stringify('CID2'));
        assert.deepEqual(seen, [u, { 0: 9 }]);
    });

    it('postFileDirect throws 422 on empty body', async () => {
        await assert.rejects(api().postFileDirect({}, makeUser(), makeReq()), statusIs(422));
    });

    it('postFileDirect throws 400 when no cid is returned', async () => {
        guardiansStub.addFileIpfsDirect = async () => ({ cid: undefined });
        await assert.rejects(api().postFileDirect({ 0: 1 }, makeUser(), makeReq()), statusIs(400));
    });

    it('postFileDryRun forwards body and policyId to dry-run storage', async () => {
        let seen;
        guardiansStub.addFileToDryRunStorage = async (...a) => { seen = a; return { cid: 'DRY' }; };
        const u = makeUser();
        const out = await api().postFileDryRun('pol-1', { 0: 1 }, u, makeReq());
        assert.equal(out, JSON.stringify('DRY'));
        assert.deepEqual(seen, [u, { 0: 1 }, 'pol-1']);
    });

    it('postFileDryRun throws 422 on empty body', async () => {
        await assert.rejects(api().postFileDryRun('pol-1', {}, makeUser(), makeReq()), statusIs(422));
    });

    it('getFile returns a StreamableFile when proxy returns a Buffer payload', async () => {
        let seen;
        guardiansStub.getFileIpfs = async (...a) => { seen = a; return { type: 'Buffer', data: [1, 2, 3] }; };
        const u = makeUser();
        const out = await api().getFile(u, 'cid-x');
        assert.ok(out);
        assert.deepEqual(seen, [u, 'cid-x', 'raw']);
    });

    it('getFile throws 404 when the payload is not a Buffer', async () => {
        guardiansStub.getFileIpfs = async () => ({ type: 'NotBuffer' });
        await assert.rejects(api().getFile(makeUser(), 'cid-x'), statusIs(404));
    });

    it('getFileDryRun returns a StreamableFile for a Buffer payload', async () => {
        let seen;
        guardiansStub.getFileFromDryRunStorage = async (...a) => { seen = a; return { type: 'Buffer', data: [1] }; };
        const u = makeUser();
        const out = await api().getFileDryRun(u, 'cid-d');
        assert.ok(out);
        assert.deepEqual(seen, [u, 'cid-d', 'raw']);
    });

    it('getFileDryRun throws 404 when the payload is not a Buffer', async () => {
        guardiansStub.getFileFromDryRunStorage = async () => ({ type: 'x' });
        await assert.rejects(api().getFileDryRun(makeUser(), 'cid-d'), statusIs(404));
    });

    it('deleteFile calls deleteIpfsCid and invalidates the cache', async () => {
        let seen;
        guardiansStub.deleteIpfsCid = async (...a) => { seen = a; };
        const u = makeUser();
        const cache = makeCache();
        await api(cache).deleteFile('cid-del', u, makeReq());
        assert.deepEqual(seen, [u, 'cid-del']);
        assert.equal(cache.calls.length, 1);
    });

    it('deleteFile maps proxy errors via InternalException', async () => {
        guardiansStub.deleteIpfsCid = async () => { const e = new Error('x'); e.getStatus = () => 500; throw e; };
        await assert.rejects(api().deleteFile('cid', makeUser(), makeReq()), statusIs(500));
    });
});

describe('SuggestionsApi', function () {
    this.timeout(180000);

    let SuggestionsApi;

    before(async () => {
        ({ SuggestionsApi } = await esmock(SUGGESTIONS_DIST, {
            '#helpers': helpersMock,
            '#auth': authMock,
            '#middlewares': middlewaresMock,
            '@guardian/common': commonMock,
        }));
    });

    beforeEach(() => {
        guardiansStub = {};
    });

    function api() { return new SuggestionsApi(); }

    it('policySuggestions forwards body and user to the proxy', async () => {
        let seen;
        guardiansStub.policySuggestions = async (...a) => { seen = a; return { next: 'n', nested: 'm' }; };
        const u = makeUser();
        const body = { blockType: 'interfaceContainerBlock' };
        const out = await api().policySuggestions(u, body);
        assert.deepEqual(out, { next: 'n', nested: 'm' });
        assert.deepEqual(seen, [body, u]);
    });

    it('policySuggestions propagates proxy errors (no InternalException wrapper)', async () => {
        guardiansStub.policySuggestions = async () => { throw new Error('boom'); };
        await assert.rejects(api().policySuggestions(makeUser(), {}), /boom/);
    });

    it('setPolicySuggestionsConfig forwards body.items and wraps the result in { items }', async () => {
        let seen;
        guardiansStub.setPolicySuggestionsConfig = async (...a) => { seen = a; return [{ id: '1' }]; };
        const u = makeUser();
        const out = await api().setPolicySuggestionsConfig(u, { items: [{ id: '1', type: 'block', index: 0 }] });
        assert.deepEqual(out, { items: [{ id: '1' }] });
        assert.deepEqual(seen, [[{ id: '1', type: 'block', index: 0 }], u]);
    });

    it('getPolicySuggestionsConfig wraps the proxy result in { items }', async () => {
        let seen;
        guardiansStub.getPolicySuggestionsConfig = async (...a) => { seen = a; return [{ id: '2' }]; };
        const u = makeUser();
        const out = await api().getPolicySuggestionsConfig(u);
        assert.deepEqual(out, { items: [{ id: '2' }] });
        assert.deepEqual(seen, [u]);
    });
});
