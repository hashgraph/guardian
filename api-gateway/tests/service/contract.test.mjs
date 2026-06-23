import assert from 'node:assert/strict';
import {
    makeUser, makeRes, makeReq, makeCacheService, makeLogger,
    FakeEntityOwner, internalExceptionRethrow, loadController
} from './_controller-harness.mjs';

const DIST = '../../dist/api/service/contract.js';

let stub;

class FakeGuardians {
    constructor(tc) { this.tc = tc; }
}
const methods = [
    'getContracts', 'createContract', 'createContractV2', 'importContract', 'checkContractPermissions',
    'removeContract', 'getWipeRequests', 'enableWipeRequests', 'disableWipeRequests', 'approveWipeRequest',
    'rejectWipeRequest', 'clearWipeRequests', 'addWipeAdmin', 'removeWipeAdmin', 'addWipeManager',
    'removeWipeManager', 'addWipeWiper', 'removeWipeWiper', 'syncRetirePools', 'getRetireRequests',
    'getRetirePools', 'clearRetireRequests', 'clearRetirePools', 'setRetirePool', 'unsetRetirePool',
    'unsetRetireRequest', 'retire', 'approveRetire', 'cancelRetire', 'addRetireAdmin', 'removeRetireAdmin',
    'getRetireVCs', 'getRetireVCsFromIndexer'
];
for (const m of methods) {
    FakeGuardians.prototype[m] = function (...a) { return stub[m](...a); };
}

async function load() {
    return loadController(DIST, {
        '#helpers': {
            Guardians: FakeGuardians, EntityOwner: FakeEntityOwner, CacheService: class {},
            InternalException: internalExceptionRethrow, getCacheKey: (t) => `k:${t.join('|')}`,
            UseCache: () => () => undefined
        },
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#middlewares': new Proxy({}, { get: () => class {} }),
        '@guardian/common': { PinoLogger: class {} }
    });
}

function makeApi(Api) { const cache = makeCacheService(); return { api: new Api(cache, makeLogger()), cache }; }

describe('ContractsApi controller logic', function () {
    this.timeout(60000);
    let Api;
    before(async () => { ({ ContractsApi: Api } = await load()); });

    beforeEach(() => {
        stub = {
            getContracts: async () => [[{ id: 'c1' }], 2],
            createContract: async () => ({ created: true }),
            createContractV2: async () => ({ createdV2: true }),
            importContract: async () => ({ imported: true }),
            checkContractPermissions: async () => ({ perm: true }),
            removeContract: async () => ({ removed: true }),
            getWipeRequests: async () => [[{ w: 1 }], 5],
            enableWipeRequests: async () => ({ enabled: true }),
            disableWipeRequests: async () => ({ disabled: true }),
            approveWipeRequest: async () => ({ approved: true }),
            rejectWipeRequest: async () => ({ rejected: true }),
            clearWipeRequests: async () => ({ cleared: true }),
            addWipeAdmin: async () => ({ a: 1 }),
            removeWipeAdmin: async () => ({ a: 2 }),
            addWipeManager: async () => ({ a: 3 }),
            removeWipeManager: async () => ({ a: 4 }),
            addWipeWiper: async () => ({ a: 5 }),
            removeWipeWiper: async () => ({ a: 6 }),
            syncRetirePools: async () => ({ synced: true }),
            getRetireRequests: async () => [[{ r: 1 }], 3],
            getRetirePools: async () => [[{ p: 1 }], 4],
            clearRetireRequests: async () => ({ c: 1 }),
            clearRetirePools: async () => ({ c: 2 }),
            setRetirePool: async () => ({ set: true }),
            unsetRetirePool: async () => ({ unset: true }),
            unsetRetireRequest: async () => ({ unsetReq: true }),
            retire: async () => ({ retired: true }),
            approveRetire: async () => ({ approvedRetire: true }),
            cancelRetire: async () => ({ canceled: true }),
            addRetireAdmin: async () => ({ ra: 1 }),
            removeRetireAdmin: async () => ({ ra: 2 }),
            getRetireVCs: async () => [[{ vc: 1 }], 8],
            getRetireVCsFromIndexer: async () => [[{ vc: 2 }], 9]
        };
    });

    it('getContracts sets count header from tuple', async () => {
        const { api } = makeApi(Api);
        const res = makeRes();
        await api.getContracts(makeUser(), res, 'wipe', 0, 10);
        assert.equal(res.headers['X-Total-Count'], 2);
    });

    it('getContracts passes owner+type+paging', async () => {
        let seen;
        stub.getContracts = async (owner, type, pi, ps) => { seen = { type, pi, ps, owner }; return [[], 0]; };
        const { api } = makeApi(Api);
        await api.getContracts(makeUser(), makeRes(), 'retire', 2, 25);
        assert.equal(seen.type, 'retire');
        assert.equal(seen.pi, 2);
        assert.ok(seen.owner instanceof FakeEntityOwner);
    });

    it('createContract extracts description+type and invalidates cache', async () => {
        let seen;
        stub.createContract = async (owner, desc, type) => { seen = { desc, type }; return {}; };
        const { api, cache } = makeApi(Api);
        await api.createContract(makeUser(), { description: 'd', type: 'wipe' }, makeReq());
        assert.deepEqual(seen, { desc: 'd', type: 'wipe' });
        assert.equal(cache.calls.invalidate.length, 1);
    });

    it('createContractV2 delegates to createContractV2', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.createContractV2(makeUser(), { description: 'd', type: 't' }, makeReq()), { createdV2: true });
    });

    it('importContract extracts contractId+description', async () => {
        let seen;
        stub.importContract = async (owner, contractId, desc) => { seen = { contractId, desc }; return {}; };
        const { api } = makeApi(Api);
        await api.importContract(makeUser(), { contractId: 'C1', description: 'd' });
        assert.deepEqual(seen, { contractId: 'C1', desc: 'd' });
    });

    it('contractPermissions delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.contractPermissions(makeUser(), 'c1'), { perm: true });
    });

    it('removeContract delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.removeContract(makeUser(), 'c1'), { removed: true });
    });

    it('getWipeRequests sets count header', async () => {
        const { api } = makeApi(Api);
        const res = makeRes();
        await api.getWipeRequests(makeUser(), res, 'c1', 0, 10);
        assert.equal(res.headers['X-Total-Count'], 5);
    });

    it('enableWipeRequests delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.enableWipeRequests(makeUser(), 'c1'), { enabled: true });
    });

    it('disableWipeRequests delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.disableWipeRequests(makeUser(), 'c1'), { disabled: true });
    });

    it('approveWipeRequest delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.approveWipeRequest(makeUser(), 'req1'), { approved: true });
    });

    it('rejectWipeRequest converts ban="true" to boolean true', async () => {
        let seen;
        stub.rejectWipeRequest = async (owner, requestId, ban) => { seen = ban; return {}; };
        const { api } = makeApi(Api);
        await api.rejectWipeRequest(makeUser(), 'req1', 'true');
        assert.equal(seen, true);
    });

    it('rejectWipeRequest treats other values as false', async () => {
        let seen;
        stub.rejectWipeRequest = async (owner, requestId, ban) => { seen = ban; return {}; };
        const { api } = makeApi(Api);
        await api.rejectWipeRequest(makeUser(), 'req1', 'no');
        assert.equal(seen, false);
    });

    it('clearWipeRequests delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.clearWipeRequests(makeUser(), 'c1'), { cleared: true });
    });

    it('clearWipeRequestsWithHederaId passes hederaId', async () => {
        let seen;
        stub.clearWipeRequests = async (owner, contractId, hederaId) => { seen = hederaId; return {}; };
        const { api } = makeApi(Api);
        await api.clearWipeRequestsWithHederaId(makeUser(), 'c1', '0.0.5');
        assert.equal(seen, '0.0.5');
    });

    it('wipeAddAdmin delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.wipeAddAdmin(makeUser(), 'c1', '0.0.1'), { a: 1 });
    });

    it('wipeRemoveAdmin delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.wipeRemoveAdmin(makeUser(), 'c1', '0.0.1'), { a: 2 });
    });

    it('wipeAddManager delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.wipeAddManager(makeUser(), 'c1', '0.0.1'), { a: 3 });
    });

    it('wipeRemoveManager delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.wipeRemoveManager(makeUser(), 'c1', '0.0.1'), { a: 4 });
    });

    it('wipeAddWiper delegates without tokenId', async () => {
        let seen;
        stub.addWipeWiper = async (owner, cid, hid, tokenId) => { seen = tokenId; return { a: 5 }; };
        const { api } = makeApi(Api);
        await api.wipeAddWiper(makeUser(), 'c1', '0.0.1');
        assert.equal(seen, undefined);
    });

    it('wipeAddWiperWithToken passes tokenId', async () => {
        let seen;
        stub.addWipeWiper = async (owner, cid, hid, tokenId) => { seen = tokenId; return {}; };
        const { api } = makeApi(Api);
        await api.wipeAddWiperWithToken(makeUser(), 'c1', '0.0.1', 'tok1');
        assert.equal(seen, 'tok1');
    });

    it('wipeRemoveWiper delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.wipeRemoveWiper(makeUser(), 'c1', '0.0.1'), { a: 6 });
    });

    it('wipeRemoveWiperWithToken passes tokenId', async () => {
        let seen;
        stub.removeWipeWiper = async (owner, cid, hid, tokenId) => { seen = tokenId; return {}; };
        const { api } = makeApi(Api);
        await api.wipeRemoveWiperWithToken(makeUser(), 'c1', '0.0.1', 'tok2');
        assert.equal(seen, 'tok2');
    });

    it('retireSyncPools delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.retireSyncPools(makeUser(), 'c1'), { synced: true });
    });

    it('getRetireRequests sets count header', async () => {
        const { api } = makeApi(Api);
        const res = makeRes();
        await api.getRetireRequests(makeUser(), res, 'c1', 0, 10);
        assert.equal(res.headers['X-Total-Count'], 3);
    });

    it('getRetirePools splits tokens csv', async () => {
        let seen;
        stub.getRetirePools = async (owner, tokens) => { seen = tokens; return [[], 0]; };
        const { api } = makeApi(Api);
        await api.getRetirePools(makeUser(), makeRes(), 'c1', 'a,b,c', 0, 10);
        assert.deepEqual(seen, ['a', 'b', 'c']);
    });

    it('getRetirePools handles undefined tokens', async () => {
        let seen = 'x';
        stub.getRetirePools = async (owner, tokens) => { seen = tokens; return [[], 0]; };
        const { api } = makeApi(Api);
        await api.getRetirePools(makeUser(), makeRes(), 'c1', undefined, 0, 10);
        assert.equal(seen, undefined);
    });

    it('clearRetireRequests delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.clearRetireRequests(makeUser(), 'c1'), { c: 1 });
    });

    it('clearRetirePools delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.clearRetirePools(makeUser(), 'c1'), { c: 2 });
    });

    it('setRetirePool passes body', async () => {
        let seen;
        stub.setRetirePool = async (owner, cid, body) => { seen = body; return {}; };
        const { api } = makeApi(Api);
        await api.setRetirePool(makeUser(), 'c1', { tokens: [] });
        assert.deepEqual(seen, { tokens: [] });
    });

    it('unsetRetirePool delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.unsetRetirePool(makeUser(), 'p1'), { unset: true });
    });

    it('unsetRetireRequest delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.unsetRetireRequest(makeUser(), 'r1'), { unsetReq: true });
    });

    it('retire throws when body is not an array', async () => {
        const { api } = makeApi(Api);
        await assert.rejects(api.retire(makeUser(), 'p1', { not: 'array' }));
    });

    it('retire delegates when body is array', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.retire(makeUser(), 'p1', [{ count: 1 }]), { retired: true });
    });

    it('approveRetire delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.approveRetire(makeUser(), 'r1'), { approvedRetire: true });
    });

    it('cancelRetireRequest delegates to cancelRetire', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.cancelRetireRequest(makeUser(), 'r1'), { canceled: true });
    });

    it('retireAddAdmin delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.retireAddAdmin(makeUser(), 'c1', '0.0.1'), { ra: 1 });
    });

    it('retireRemoveAdmin delegates', async () => {
        const { api } = makeApi(Api);
        assert.deepEqual(await api.retireRemoveAdmin(makeUser(), 'c1', '0.0.1'), { ra: 2 });
    });

    it('getRetireVCs sets count header', async () => {
        const { api } = makeApi(Api);
        const res = makeRes();
        await api.getRetireVCs(makeUser(), res, 0, 10);
        assert.equal(res.headers['X-Total-Count'], 8);
    });

    it('getRetireVCsFromIndexer passes contractTopicId', async () => {
        let seen;
        stub.getRetireVCsFromIndexer = async (owner, topic) => { seen = topic; return [[], 0]; };
        const { api } = makeApi(Api);
        await api.getRetireVCsFromIndexer(makeUser(), makeRes(), 'topic-1');
        assert.equal(seen, 'topic-1');
    });

    it('getContracts rethrows error', async () => {
        stub.getContracts = async () => { throw new Error('x'); };
        const { api } = makeApi(Api);
        await assert.rejects(api.getContracts(makeUser(), makeRes(), 'wipe', 0, 10));
    });
});
