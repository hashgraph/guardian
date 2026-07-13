import assert from 'node:assert/strict';
import {
    makeUser, makeRes, makeReq, makeCacheService, makeLogger,
    FakeEntityOwner, internalExceptionRethrow, loadController, guardiansInterfaces
} from './_controller-harness.mjs';

const DIST = '../../dist/api/service/module.js';

let stub;

class FakeGuardians {
    constructor(tc) { this.tc = tc; }
    createModule(...a) { return stub.createModule(...a); }
    getModule(...a) { return stub.getModule(...a); }
    getModuleV2(...a) { return stub.getModuleV2(...a); }
    getSchemasByOwner(...a) { return stub.getSchemasByOwner(...a); }
    createSchema(...a) { return stub.createSchema(...a); }
    deleteModule(...a) { return stub.deleteModule(...a); }
    getMenuModule(...a) { return stub.getMenuModule(...a); }
    getModuleById(...a) { return stub.getModuleById(...a); }
    updateModule(...a) { return stub.updateModule(...a); }
    exportModuleFile(...a) { return stub.exportModuleFile(...a); }
    exportModuleMessage(...a) { return stub.exportModuleMessage(...a); }
    importModuleMessage(...a) { return stub.importModuleMessage(...a); }
    importModuleFile(...a) { return stub.importModuleFile(...a); }
    previewModuleMessage(...a) { return stub.previewModuleMessage(...a); }
    previewModuleFile(...a) { return stub.previewModuleFile(...a); }
    publishModule(...a) { return stub.publishModule(...a); }
    validateModule(...a) { return stub.validateModule(...a); }
}

const SchemaUtils = {
    toOld: (x) => x,
    fromOld: () => undefined,
    clearIds: () => undefined
};

async function load() {
    return loadController(DIST, {
        '#helpers': {
            Guardians: FakeGuardians, SchemaUtils, UseCache: () => () => undefined,
            InternalException: internalExceptionRethrow, EntityOwner: FakeEntityOwner,
            CacheService: class {}, getCacheKey: (t) => `k:${t.join('|')}`
        },
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#constants': { CACHE_TAG: { MODULE: 'module' }, MODULE_REQUIRED_PROPS: { a: 'id' }, PREFIXES: { MODULES: 'modules/', SCHEMES: 'schemas/' } },
        '#middlewares': new Proxy({}, { get: () => class {} }),
        '@guardian/common': { PinoLogger: class {} },
        '@guardian/interfaces': guardiansInterfaces
    });
}

function makeApi(Api) { const cache = makeCacheService(); return { api: new Api(cache, makeLogger()), cache }; }

describe('ModulesApi controller logic', function () {
    this.timeout(60000);
    let Api;
    before(async () => { ({ ModulesApi: Api } = await load()); });

    beforeEach(() => {
        stub = {
            createModule: async () => ({ created: true }),
            getModule: async () => ({ items: [{ m: 1 }], count: 4 }),
            getModuleV2: async () => ({ items: [{ m: 2 }], count: 8 }),
            getSchemasByOwner: async () => ({ items: [{ id: 's1', owner: 'owner-did' }], count: 2 }),
            createSchema: async () => ([{ id: 'newschema' }]),
            deleteModule: async () => ({ deleted: true }),
            getMenuModule: async () => ([{ menu: 1 }]),
            getModuleById: async () => ({ id: 'mod1' }),
            updateModule: async () => ({ updated: true }),
            exportModuleFile: async () => Buffer.from('zip'),
            exportModuleMessage: async () => ({ messageId: 'mid' }),
            importModuleMessage: async () => ({ imported: true }),
            importModuleFile: async () => ({ importedFile: true }),
            previewModuleMessage: async () => ({ preview: true }),
            previewModuleFile: async () => ({ previewFile: true }),
            publishModule: async () => ({ published: true }),
            validateModule: async () => ({ valid: true })
        };
    });

    const goodConfig = { config: { blockType: 'module' } };

    it('postModules throws 422 with invalid config', async () => {
        await assert.rejects(makeApi(Api).api.postModules(makeUser(), { config: { blockType: 'x' } }, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('postModules creates module and invalidates cache', async () => {
        const { api, cache } = makeApi(Api);
        const out = await api.postModules(makeUser(), goodConfig, makeReq());
        assert.deepEqual(out, { created: true });
        assert.equal(cache.calls.invalidate.length, 1);
    });

    it('getModules sets count header', async () => {
        const res = makeRes();
        await makeApi(Api).api.getModules(makeUser(), res, 0, 10);
        assert.equal(res.headers['X-Total-Count'], 4);
    });

    it('getModules passes paging options', async () => {
        let seen;
        stub.getModule = async (o) => { seen = o; return { items: [], count: 0 }; };
        await makeApi(Api).api.getModules(makeUser(), makeRes(), 3, 15);
        assert.deepEqual(seen, { pageIndex: 3, pageSize: 15 });
    });

    it('getModulesV2 sets count header and fields', async () => {
        let seen;
        stub.getModuleV2 = async (o) => { seen = o; return { items: [], count: 8 }; };
        const res = makeRes();
        await makeApi(Api).api.getModulesV2(makeUser(), res, 0, 10);
        assert.deepEqual(seen.fields, ['id']);
    });

    it('getModuleSchemas sets count header and req.locals', async () => {
        const req = makeReq();
        const res = makeRes();
        await makeApi(Api).api.getModuleSchemas(makeUser(), req, res, 0, 10, 'topic');
        assert.equal(res.headers['X-Total-Count'], 2);
        assert.ok(Array.isArray(req.locals));
    });

    it('getModuleSchemas marks readonly when owner differs', async () => {
        stub.getSchemasByOwner = async () => ({ items: [{ id: 's', owner: 'other-did', readonly: false }], count: 1 });
        const req = makeReq();
        await makeApi(Api).api.getModuleSchemas(makeUser(), req, makeRes(), 0, 10, 't');
        assert.equal(req.locals[0].readonly, true);
    });

    it('getModuleSchemas wraps error in 500', async () => {
        stub.getSchemasByOwner = async () => { throw new Error('boom'); };
        await assert.rejects(makeApi(Api).api.getModuleSchemas(makeUser(), makeReq(), makeRes(), 0, 10, 't'), (e) => { assert.equal(e.getStatus(), 500); return true; });
    });

    it('postSchemas throws 500 when schema missing', async () => {
        await assert.rejects(makeApi(Api).api.postSchemas(makeUser(), null, makeReq()), (e) => { assert.equal(e.getStatus(), 500); return true; });
    });

    it('postSchemas creates schema and invalidates cache', async () => {
        const { api, cache } = makeApi(Api);
        const out = await api.postSchemas(makeUser(), { name: 's' }, makeReq());
        assert.deepEqual(out, [{ id: 'newschema' }]);
        assert.equal(cache.calls.invalidate.length, 1);
    });

    it('deleteModule throws when uuid missing', async () => {
        await assert.rejects(makeApi(Api).api.deleteModule(makeUser(), '', makeReq()));
    });

    it('deleteModule delegates and invalidates cache', async () => {
        const { api, cache } = makeApi(Api);
        const out = await api.deleteModule(makeUser(), 'uuid1', makeReq());
        assert.deepEqual(out, { deleted: true });
        assert.equal(cache.calls.invalidate.length, 1);
    });

    it('getMenu delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.getMenu(makeUser()), [{ menu: 1 }]);
    });

    it('getModule throws 422 without uuid', async () => {
        await assert.rejects(makeApi(Api).api.getModule(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getModule delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.getModule(makeUser(), 'uuid1'), { id: 'mod1' });
    });

    it('putModule throws 422 without uuid', async () => {
        await assert.rejects(makeApi(Api).api.putModule(makeUser(), '', goodConfig, makeReq({ params: {} })), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('putModule throws 422 with invalid config', async () => {
        await assert.rejects(makeApi(Api).api.putModule(makeUser(), 'uuid1', { config: { blockType: 'x' } }, makeReq({ params: { uuid: 'uuid1' } })), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('putModule delegates when valid', async () => {
        const { api } = makeApi(Api);
        const out = await api.putModule(makeUser(), 'uuid1', goodConfig, makeReq({ params: { uuid: 'uuid1' } }));
        assert.deepEqual(out, { updated: true });
    });

    it('moduleExportFile sets zip headers', async () => {
        const res = makeRes();
        await makeApi(Api).api.moduleExportFile(makeUser(), 'uuid1', res);
        assert.equal(res.headers['Content-type'], 'application/zip');
    });

    it('moduleExportMessage delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.moduleExportMessage(makeUser(), 'uuid1'), { messageId: 'mid' });
    });

    it('moduleImportMessage throws 422 without messageId', async () => {
        await assert.rejects(makeApi(Api).api.moduleImportMessage(makeUser(), {}, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('moduleImportMessage delegates messageId', async () => {
        let seen;
        stub.importModuleMessage = async (msg) => { seen = msg; return {}; };
        await makeApi(Api).api.moduleImportMessage(makeUser(), { messageId: 'M1' }, makeReq());
        assert.equal(seen, 'M1');
    });

    it('moduleImportFile delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.moduleImportFile(makeUser(), { b: 1 }, makeReq()), { importedFile: true });
    });

    it('moduleImportMessagePreview throws 422 without messageId', async () => {
        await assert.rejects(makeApi(Api).api.moduleImportMessagePreview(makeUser(), {}, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('moduleImportMessagePreview delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.moduleImportMessagePreview(makeUser(), { messageId: 'M' }, makeReq()), { preview: true });
    });

    it('moduleImportFilePreview delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.moduleImportFilePreview(makeUser(), { b: 1 }, makeReq()), { previewFile: true });
    });

    it('publishModule delegates and invalidates cache', async () => {
        const { api, cache } = makeApi(Api);
        const out = await api.publishModule(makeUser(), 'uuid1', {}, makeReq({ params: { uuid: 'uuid1' } }));
        assert.deepEqual(out, { published: true });
        assert.equal(cache.calls.invalidate.length, 1);
    });

    it('validateModule delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.validateModule(makeUser(), {}), { valid: true });
    });
});
