import assert from 'node:assert/strict';
import {
    makeUser, makeRes, makeReq, makeCacheService, makeLogger,
    FakeEntityOwner, internalExceptionRethrow, loadController, guardiansInterfaces
} from './_controller-harness.mjs';

const DIST = '../../dist/api/service/tool.js';

let stub;

class FakeGuardians {
    constructor(tc) { this.tc = tc; }
    createTool(...a) { return stub.createTool(...a); }
    createToolAsync(...a) { return stub.createToolAsync(...a); }
    getTools(...a) { return stub.getTools(...a); }
    getToolsV2(...a) { return stub.getToolsV2(...a); }
    deleteTool(...a) { return stub.deleteTool(...a); }
    getToolById(...a) { return stub.getToolById(...a); }
    updateTool(...a) { return stub.updateTool(...a); }
    publishTool(...a) { return stub.publishTool(...a); }
    publishToolAsync(...a) { return stub.publishToolAsync(...a); }
    dryRunTool(...a) { return stub.dryRunTool(...a); }
    draftTool(...a) { return stub.draftTool(...a); }
    validateTool(...a) { return stub.validateTool(...a); }
    exportToolFile(...a) { return stub.exportToolFile(...a); }
    exportToolMessage(...a) { return stub.exportToolMessage(...a); }
    previewToolMessage(...a) { return stub.previewToolMessage(...a); }
    importToolMessage(...a) { return stub.importToolMessage(...a); }
    previewToolFile(...a) { return stub.previewToolFile(...a); }
    importToolFile(...a) { return stub.importToolFile(...a); }
    importToolMessageAsync(...a) { return stub.importToolMessageAsync(...a); }
    getMenuTool(...a) { return stub.getMenuTool(...a); }
    checkTool(...a) { return stub.checkTool(...a); }
}

class FakeTaskManager {
    start(action, userId) { return { taskId: 'task-1', action, userId }; }
    addError() {}
}

async function load() {
    return loadController(DIST, {
        '#helpers': {
            UseCache: () => () => undefined, TaskManager: FakeTaskManager, Guardians: FakeGuardians,
            InternalException: internalExceptionRethrow, ONLY_SR: '', UploadedFiles: () => () => undefined,
            AnyFilesInterceptor: () => class {}, EntityOwner: FakeEntityOwner, CacheService: class {}
        },
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#constants': { CACHE_PREFIXES: { TAG: 'tag' }, TOOL_REQUIRED_PROPS: { a: 'id' } },
        '#middlewares': new Proxy({}, { get: () => class {} }),
        '@guardian/common': { PinoLogger: class {}, RunFunctionAsync: () => undefined },
        '@guardian/interfaces': guardiansInterfaces
    });
}

function makeApi(Api) { const cache = makeCacheService(); return { api: new Api(cache, makeLogger()), cache }; }

describe('ToolsApi controller logic', function () {
    this.timeout(60000);
    let Api;
    before(async () => { ({ ToolsApi: Api } = await load()); });

    beforeEach(() => {
        stub = {
            createTool: async () => ({ created: true }),
            createToolAsync: async () => ({}),
            getTools: async () => ({ items: [{ t: 1 }], count: 5 }),
            getToolsV2: async () => ({ items: [{ t: 2 }], count: 9 }),
            deleteTool: async () => ({ deleted: true }),
            getToolById: async () => ({ id: 't1' }),
            updateTool: async () => ({ updated: true }),
            publishTool: async () => ({ published: true }),
            publishToolAsync: async () => ({}),
            dryRunTool: async () => ({ dry: true }),
            draftTool: async () => ({ draft: true }),
            validateTool: async () => ({ valid: true }),
            exportToolFile: async () => Buffer.from('zip'),
            exportToolMessage: async () => ({ messageId: 'mid' }),
            previewToolMessage: async () => ({ preview: true }),
            importToolMessage: async () => ({ imported: true }),
            previewToolFile: async () => ({ previewFile: true }),
            importToolFile: async () => ({ importedFile: true }),
            importToolMessageAsync: async () => ({}),
            getMenuTool: async () => ([{ menu: 1 }]),
            checkTool: async () => ({ checked: true })
        };
    });

    const goodTool = { config: { blockType: 'tool' } };

    it('createNewTool throws 422 with invalid config', async () => {
        await assert.rejects(makeApi(Api).api.createNewTool(makeUser(), { config: { blockType: 'x' } }, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('createNewTool delegates and invalidates prefixes', async () => {
        const { api, cache } = makeApi(Api);
        const out = await api.createNewTool(makeUser(), goodTool, makeReq());
        assert.deepEqual(out, { created: true });
        assert.equal(cache.calls.invalidateAllTagsByPrefixes.length, 1);
    });

    it('createNewToolAsync throws 422 with invalid config', async () => {
        await assert.rejects(makeApi(Api).api.createNewToolAsync(makeUser(), {}, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('createNewToolAsync returns a task', async () => {
        const out = await makeApi(Api).api.createNewToolAsync(makeUser(), goodTool, makeReq());
        assert.equal(out.taskId, 'task-1');
    });

    it('getTools sets count header', async () => {
        const res = makeRes();
        await makeApi(Api).api.getTools(makeUser(), res, 0, 10);
        assert.equal(res.headers['X-Total-Count'], 5);
    });

    it('getTools passes paging options', async () => {
        let seen;
        stub.getTools = async (o) => { seen = o; return { items: [], count: 0 }; };
        await makeApi(Api).api.getTools(makeUser(), makeRes(), 2, 20);
        assert.deepEqual(seen, { pageIndex: 2, pageSize: 20 });
    });

    it('getToolsV2 passes search/tag/fields', async () => {
        let seenFields, seenOpts;
        stub.getToolsV2 = async (fields, opts) => { seenFields = fields; seenOpts = opts; return { items: [], count: 9 }; };
        await makeApi(Api).api.getToolsV2(makeUser(), makeRes(), 0, 10, 'srch', 'tag1');
        assert.deepEqual(seenFields, ['id']);
        assert.equal(seenOpts.search, 'srch');
        assert.equal(seenOpts.tag, 'tag1');
    });

    it('deleteTool throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).api.deleteTool(makeUser(), '', makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('deleteTool delegates and invalidates prefixes', async () => {
        const { api, cache } = makeApi(Api);
        await api.deleteTool(makeUser(), 't1', makeReq());
        assert.equal(cache.calls.invalidateAllTagsByPrefixes.length, 1);
    });

    it('getToolById throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).api.getToolById(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getToolById delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.getToolById(makeUser(), 't1'), { id: 't1' });
    });

    it('updateTool throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).api.updateTool(makeUser(), '', goodTool, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('updateTool throws 422 with invalid config', async () => {
        await assert.rejects(makeApi(Api).api.updateTool(makeUser(), 't1', {}, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('updateTool delegates when valid', async () => {
        assert.deepEqual(await makeApi(Api).api.updateTool(makeUser(), 't1', goodTool, makeReq()), { updated: true });
    });

    it('publishTool throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).api.publishTool(makeUser(), '', {}, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('publishTool delegates with body', async () => {
        let seen;
        stub.publishTool = async (id, owner, body) => { seen = { id, body }; return { published: true }; };
        await makeApi(Api).api.publishTool(makeUser(), 't1', { v: 2 }, makeReq());
        assert.deepEqual(seen, { id: 't1', body: { v: 2 } });
    });

    it('publishToolAsync throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).api.publishToolAsync(makeUser(), '', {}, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('publishToolAsync returns task', async () => {
        const out = await makeApi(Api).api.publishToolAsync(makeUser(), 't1', {}, makeReq());
        assert.equal(out.taskId, 'task-1');
    });

    it('dryRunPolicy throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).api.dryRunPolicy(makeUser(), '', makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('dryRunPolicy delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.dryRunPolicy(makeUser(), 't1', makeReq()), { dry: true });
    });

    it('draftPolicy throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).api.draftPolicy(makeUser(), '', makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('draftPolicy delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.draftPolicy(makeUser(), 't1', makeReq()), { draft: true });
    });

    it('validateTool delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.validateTool(makeUser(), {}), { valid: true });
    });

    it('toolExportFile throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).api.toolExportFile(makeUser(), '', makeRes()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('toolExportFile sets zip headers', async () => {
        const res = makeRes();
        await makeApi(Api).api.toolExportFile(makeUser(), 't1', res);
        assert.equal(res.headers['Content-type'], 'application/zip');
    });

    it('toolExportMessage throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).api.toolExportMessage(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('toolExportMessage delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.toolExportMessage(makeUser(), 't1'), { messageId: 'mid' });
    });

    it('toolImportMessagePreview throws 422 without messageId', async () => {
        await assert.rejects(makeApi(Api).api.toolImportMessagePreview(makeUser(), {}), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('toolImportMessagePreview delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.toolImportMessagePreview(makeUser(), { messageId: 'M' }), { preview: true });
    });

    it('toolImportMessage throws 422 without messageId', async () => {
        await assert.rejects(makeApi(Api).api.toolImportMessage(makeUser(), {}), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('toolImportMessage delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.toolImportMessage(makeUser(), { messageId: 'M' }), { imported: true });
    });

    it('toolImportFilePreview delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.toolImportFilePreview(makeUser(), { b: 1 }), { previewFile: true });
    });

    it('toolImportFile delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.toolImportFile(makeUser(), { b: 1 }, makeReq()), { importedFile: true });
    });

    it('toolImportMessageAsync throws 422 without messageId', async () => {
        await assert.rejects(makeApi(Api).api.toolImportMessageAsync(makeUser(), {}), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('toolImportMessageAsync returns task', async () => {
        const out = await makeApi(Api).api.toolImportMessageAsync(makeUser(), { messageId: 'M' });
        assert.equal(out.taskId, 'task-1');
    });

    it('getMenu delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.getMenu(makeUser()), [{ menu: 1 }]);
    });

    it('checkTool delegates messageId', async () => {
        let seen;
        stub.checkTool = async (messageId) => { seen = messageId; return { checked: true }; };
        await makeApi(Api).api.checkTool(makeUser(), 'M9');
        assert.equal(seen, 'M9');
    });
});
