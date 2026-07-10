import assert from 'node:assert/strict';
import esmock from 'esmock';

const MODULE_DIST = '../../dist/api/service/module.js';
const TOOL_DIST = '../../dist/api/service/tool.js';
const TAGS_DIST = '../../dist/api/service/tags.js';
const THEMES_DIST = '../../dist/api/service/themes.js';

let guardiansStub;
let taskManagerStub;

class MockGuardians {
    constructor(tenantContext) {
        this.tenantContext = tenantContext;
        MockGuardians.lastTenantContext = tenantContext;
    }
}
const guardianMethods = [
    'createModule', 'getModule', 'getModuleV2', 'getSchemasByOwner', 'createSchema',
    'deleteModule', 'getMenuModule', 'getModuleById', 'updateModule', 'exportModuleMessage',
    'importModuleMessage', 'previewModuleMessage', 'publishModule', 'validateModule',
    'createTool', 'getTools', 'getToolsV2', 'deleteTool', 'getToolById', 'updateTool',
    'publishTool', 'dryRunTool', 'draftTool', 'validateTool', 'exportToolMessage',
    'previewToolMessage', 'importToolMessage', 'getMenuTool', 'checkTool',
    'createTag', 'getTags', 'getTagCache', 'synchronizationTags', 'deleteTag',
    'getTagSchemas', 'getTagSchemasV2', 'createTagSchema', 'getSchemaById', 'deleteSchema',
    'updateSchema', 'publishTagSchema', 'getPublishedTagSchemas',
    'createTheme', 'getThemeById', 'updateTheme', 'deleteTheme', 'getThemes', 'importThemeFile',
];
for (const m of guardianMethods) {
    MockGuardians.prototype[m] = function (...args) { return guardiansStub[m](...args); };
}

class MockTaskManager {
    start(...args) { return taskManagerStub.start(...args); }
    addError(...args) { return taskManagerStub.addError(...args); }
}

const schemaUtilsStub = {
    toOld: (x) => x,
    fromOld: () => undefined,
    clearIds: () => undefined,
    checkPermission: () => null,
};

const helpersMock = {
    Guardians: MockGuardians,
    EntityOwner: class { constructor(user) { this.user = user; this.owner = user?.did; this.creator = user?.did; } },
    InternalException: async (error) => { throw error; },
    CacheService: class {},
    getCacheKey: (tags) => `cache:${tags.join('|')}`,
    UseCache: () => () => undefined,
    ONLY_SR: ' Only SR.',
    TaskManager: MockTaskManager,
    ServiceError: class extends Error {},
    SchemaUtils: schemaUtilsStub,
    RunFunctionAsync: undefined,
    MultipartFile: class {},
    UploadedFiles: () => () => undefined,
    AnyFilesInterceptor: () => class {},
};

const commonMock = {
    PinoLogger: class {},
    RunFunctionAsync: (fn) => { fn(); },
};

function loadController(dist) {
    return esmock(dist, {
        '#helpers': helpersMock,
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined, checkPermission: () => () => undefined },
        '#constants': {
            PREFIXES: { MODULES: 'modules/', SCHEMES: 'schemas/', TAGS: 'tags/', THEMES: 'themes/' },
            CACHE_TAG: { MODULE: 'MODULE' },
            CACHE_PREFIXES: { TAG: 'tag' },
            MODULE_REQUIRED_PROPS: { a: 'name', b: 'uuid' },
            TOOL_REQUIRED_PROPS: { a: 'name', b: 'uuid' },
            SCHEMA_REQUIRED_PROPS: { a: 'name', b: 'uuid' },
        },
        '#middlewares': {
            ModuleDTO: class {}, ExportMessageDTO: class {}, ImportMessageDTO: class {},
            ModuleImportFileResponseDTO: class {}, ModulePublishResponseDTO: class {},
            ModulePreviewDTO: class {}, SchemaDTO: class {}, ModuleValidationDTO: class {},
            Examples: {}, pageHeader: {}, InternalServerErrorDTO: class {},
            ObjectExamples: {}, UnprocessableEntityErrorDTO: class {}, Response451_DTO: class {},
            CreateToolDTO: class {}, TaskDTO: class {}, ToolDTO: class {},
            ToolDryRunResponseDTO: class {}, ToolExportMessageDTO: class {},
            ToolImportResponseDTO: class {}, ToolListV1ItemDTO: class {},
            ToolListV2ItemDTO: class {}, ToolMenuItemDTO: class {}, ToolPreviewDTO: class {},
            ToolPublishResponseDTO: class {}, ToolValidationDTO: class {}, ToolVersionDTO: class {},
            ForbiddenErrorDTO: class {}, TagDTO: class {}, TagFilterDTO: class {},
            TagMapDTO: class {}, ThemeDTO: class {},
        },
        '@guardian/common': commonMock,
    });
}

function makeUser(extra = {}) {
    return { id: 'user-1', did: 'did:hedera:user', tenantContext: { tenantId: 't1' }, ...extra };
}

function makeRes() {
    const headers = {};
    const res = {
        header(k, v) { headers[k] = v; return res; },
        send(payload) { res.sent = payload; return payload; },
        headers,
    };
    return res;
}

function makeApi(ApiClass) {
    const invalidated = [];
    const cacheService = {
        invalidate: async (key) => { invalidated.push(key); },
        invalidateAllTagsByPrefixes: async (prefixes) => { invalidated.push(prefixes); },
    };
    const logger = { error: () => undefined };
    const api = new ApiClass(cacheService, logger);
    api.__invalidated = invalidated;
    return api;
}

let ModulesApi, ToolsApi, TagsApi, ThemesApi;

before(async function () {
    this.timeout(300000);
    ({ ModulesApi } = await loadController(MODULE_DIST));
    ({ ToolsApi } = await loadController(TOOL_DIST));
    ({ TagsApi } = await loadController(TAGS_DIST));
    ({ ThemesApi } = await loadController(THEMES_DIST));
});

beforeEach(() => {
    guardiansStub = {};
    taskManagerStub = {
        start: () => ({ taskId: 'task-1' }),
        addError: () => undefined,
    };
});

describe('ModulesApi', function () {
    this.timeout(300000);

    it('postModules forwards config to createModule with EntityOwner', async () => {
        let seen;
        guardiansStub.createModule = async (module, owner) => { seen = { module, owner }; return { id: 'm1' }; };
        const api = makeApi(ModulesApi);
        const body = { config: { blockType: 'module' }, name: 'M' };
        const res = await api.postModules(makeUser(), body, { url: '/api/v1/modules' });
        assert.deepEqual(res, { id: 'm1' });
        assert.equal(seen.module, body);
        assert.equal(seen.owner.user.id, 'user-1');
    });

    it('postModules rejects invalid config with 422', async () => {
        const api = makeApi(ModulesApi);
        await assert.rejects(
            api.postModules(makeUser(), { config: { blockType: 'x' } }, { url: '/u' }),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('postModules maps proxy error via InternalException', async () => {
        guardiansStub.createModule = async () => { throw new Error('boom'); };
        const api = makeApi(ModulesApi);
        await assert.rejects(
            api.postModules(makeUser(), { config: { blockType: 'module' } }, { url: '/u' }),
            /boom/
        );
    });

    it('getModules passes pagination to getModule and sets X-Total-Count', async () => {
        let seen;
        guardiansStub.getModule = async (options, owner) => { seen = { options, owner }; return { items: [1, 2], count: 7 }; };
        const api = makeApi(ModulesApi);
        const res = makeRes();
        await api.getModules(makeUser(), res, 1, 20);
        assert.deepEqual(seen.options, { pageIndex: 1, pageSize: 20 });
        assert.equal(res.headers['X-Total-Count'], 7);
        assert.deepEqual(res.sent, [1, 2]);
    });

    it('getModules maps error via InternalException', async () => {
        guardiansStub.getModule = async () => { throw new Error('listfail'); };
        const api = makeApi(ModulesApi);
        await assert.rejects(api.getModules(makeUser(), makeRes(), 0, 10), /listfail/);
    });

    it('getModulesV2 sends fields plus pagination to getModuleV2', async () => {
        let seen;
        guardiansStub.getModuleV2 = async (options, owner) => { seen = options; return { items: [], count: 0 }; };
        const api = makeApi(ModulesApi);
        await api.getModulesV2(makeUser(), makeRes(), 2, 5);
        assert.deepEqual(seen.fields, ['name', 'uuid']);
        assert.equal(seen.pageIndex, 2);
        assert.equal(seen.pageSize, 5);
    });

    it('deleteModule forwards uuid + owner to deleteModule', async () => {
        let seen;
        guardiansStub.deleteModule = async (uuid, owner) => { seen = { uuid, owner }; return true; };
        const api = makeApi(ModulesApi);
        const res = await api.deleteModule(makeUser(), 'uuid-1', { url: '/u', params: { uuid: 'uuid-1' } });
        assert.equal(res, true);
        assert.equal(seen.uuid, 'uuid-1');
        assert.equal(seen.owner.user.id, 'user-1');
    });

    it('deleteModule throws on empty uuid (mapped via InternalException)', async () => {
        const api = makeApi(ModulesApi);
        await assert.rejects(
            api.deleteModule(makeUser(), '', { url: '/u', params: {} }),
            /Invalid uuid/
        );
    });

    it('getMenu forwards EntityOwner to getMenuModule', async () => {
        let seen;
        guardiansStub.getMenuModule = async (owner) => { seen = owner; return [{ id: 'menu' }]; };
        const api = makeApi(ModulesApi);
        const res = await api.getMenu(makeUser());
        assert.deepEqual(res, [{ id: 'menu' }]);
        assert.equal(seen.user.id, 'user-1');
    });

    it('getModule forwards uuid to getModuleById', async () => {
        let seen;
        guardiansStub.getModuleById = async (uuid, owner) => { seen = { uuid, owner }; return { id: 'm' }; };
        const api = makeApi(ModulesApi);
        const res = await api.getModule(makeUser(), 'uuid-9');
        assert.deepEqual(res, { id: 'm' });
        assert.equal(seen.uuid, 'uuid-9');
    });

    it('getModule rejects empty uuid with 422', async () => {
        const api = makeApi(ModulesApi);
        await assert.rejects(
            api.getModule(makeUser(), ''),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('putModule forwards uuid, body and owner to updateModule', async () => {
        let seen;
        guardiansStub.updateModule = async (uuid, module, owner) => { seen = { uuid, module, owner }; return { id: 'u' }; };
        const api = makeApi(ModulesApi);
        const body = { config: { blockType: 'module' } };
        const res = await api.putModule(makeUser(), 'uuid-2', body, { url: '/u', params: { uuid: 'uuid-2' } });
        assert.deepEqual(res, { id: 'u' });
        assert.equal(seen.uuid, 'uuid-2');
        assert.equal(seen.module, body);
    });

    it('putModule throws 422 for invalid config (outside try)', async () => {
        const api = makeApi(ModulesApi);
        await assert.rejects(
            api.putModule(makeUser(), 'uuid-2', { config: { blockType: 'x' } }, { url: '/u', params: {} }),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('moduleExportMessage forwards uuid to exportModuleMessage', async () => {
        let seen;
        guardiansStub.exportModuleMessage = async (uuid, owner) => { seen = uuid; return { messageId: 'mid' }; };
        const api = makeApi(ModulesApi);
        const res = await api.moduleExportMessage(makeUser(), 'uuid-3');
        assert.deepEqual(res, { messageId: 'mid' });
        assert.equal(seen, 'uuid-3');
    });

    it('moduleImportMessage forwards messageId to importModuleMessage', async () => {
        let seen;
        guardiansStub.importModuleMessage = async (messageId, owner) => { seen = messageId; return { id: 'imported' }; };
        const api = makeApi(ModulesApi);
        const res = await api.moduleImportMessage(makeUser(), { messageId: 'msg-1' }, { url: '/u' });
        assert.deepEqual(res, { id: 'imported' });
        assert.equal(seen, 'msg-1');
    });

    it('moduleImportMessage throws 422 when messageId missing', async () => {
        const api = makeApi(ModulesApi);
        await assert.rejects(
            api.moduleImportMessage(makeUser(), {}, { url: '/u' }),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('moduleImportMessagePreview forwards messageId to previewModuleMessage', async () => {
        let seen;
        guardiansStub.previewModuleMessage = async (messageId, owner) => { seen = messageId; return { preview: true }; };
        const api = makeApi(ModulesApi);
        const res = await api.moduleImportMessagePreview(makeUser(), { messageId: 'msg-2' }, { url: '/u' });
        assert.deepEqual(res, { preview: true });
        assert.equal(seen, 'msg-2');
    });

    it('publishModule forwards uuid, owner and module to publishModule', async () => {
        let seen;
        guardiansStub.publishModule = async (uuid, owner, module) => { seen = { uuid, owner, module }; return { isValid: true }; };
        const api = makeApi(ModulesApi);
        const body = { x: 1 };
        const res = await api.publishModule(makeUser(), 'uuid-4', body, { url: '/u', params: { uuid: 'uuid-4' } });
        assert.deepEqual(res, { isValid: true });
        assert.equal(seen.uuid, 'uuid-4');
        assert.equal(seen.module, body);
    });

    it('validateModule forwards owner and module to validateModule', async () => {
        let seen;
        guardiansStub.validateModule = async (owner, module) => { seen = { owner, module }; return { results: {} }; };
        const api = makeApi(ModulesApi);
        const body = { config: {} };
        const res = await api.validateModule(makeUser(), body);
        assert.deepEqual(res, { results: {} });
        assert.equal(seen.module, body);
        assert.equal(seen.owner.user.id, 'user-1');
    });
});

describe('ToolsApi', function () {
    this.timeout(300000);

    it('createNewTool forwards tool + owner to createTool', async () => {
        let seen;
        guardiansStub.createTool = async (tool, owner) => { seen = { tool, owner }; return { id: 't1' }; };
        const api = makeApi(ToolsApi);
        const tool = { config: { blockType: 'tool' } };
        const res = await api.createNewTool(makeUser(), tool, {});
        assert.deepEqual(res, { id: 't1' });
        assert.equal(seen.tool, tool);
        assert.equal(seen.owner.user.id, 'user-1');
    });

    it('createNewTool rejects invalid config with 422', async () => {
        const api = makeApi(ToolsApi);
        await assert.rejects(
            api.createNewTool(makeUser(), { config: { blockType: 'x' } }, {}),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('createNewTool maps proxy error via InternalException', async () => {
        guardiansStub.createTool = async () => { throw new Error('toolboom'); };
        const api = makeApi(ToolsApi);
        await assert.rejects(
            api.createNewTool(makeUser(), { config: { blockType: 'tool' } }, {}),
            /toolboom/
        );
    });

    it('getTools forwards pagination to getTools and sets count header', async () => {
        let seen;
        guardiansStub.getTools = async (options, owner) => { seen = options; return { items: ['a'], count: 3 }; };
        const api = makeApi(ToolsApi);
        const res = makeRes();
        await api.getTools(makeUser(), res, 0, 10);
        assert.deepEqual(seen, { pageIndex: 0, pageSize: 10 });
        assert.equal(res.headers['X-Total-Count'], 3);
        assert.deepEqual(res.sent, ['a']);
    });

    it('getToolsV2 forwards fields and search/tag filters', async () => {
        let seen;
        guardiansStub.getToolsV2 = async (fields, options, owner) => { seen = { fields, options }; return { items: [], count: 0 }; };
        const api = makeApi(ToolsApi);
        await api.getToolsV2(makeUser(), makeRes(), 1, 5, 'query', 'mytag');
        assert.deepEqual(seen.fields, ['name', 'uuid']);
        assert.deepEqual(seen.options, { pageIndex: 1, pageSize: 5, search: 'query', tag: 'mytag' });
    });

    it('deleteTool forwards id + owner to deleteTool', async () => {
        let seen;
        guardiansStub.deleteTool = async (id, owner) => { seen = { id, owner }; return true; };
        const api = makeApi(ToolsApi);
        const res = await api.deleteTool(makeUser(), 'id-1', {});
        assert.equal(res, true);
        assert.equal(seen.id, 'id-1');
    });

    it('deleteTool rejects empty id with 422', async () => {
        const api = makeApi(ToolsApi);
        await assert.rejects(
            api.deleteTool(makeUser(), '', {}),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('getToolById forwards id to getToolById', async () => {
        let seen;
        guardiansStub.getToolById = async (id, owner) => { seen = id; return { id: 'x' }; };
        const api = makeApi(ToolsApi);
        const res = await api.getToolById(makeUser(), 'id-2');
        assert.deepEqual(res, { id: 'x' });
        assert.equal(seen, 'id-2');
    });

    it('getToolById rejects empty id with 422', async () => {
        const api = makeApi(ToolsApi);
        await assert.rejects(
            api.getToolById(makeUser(), ''),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('updateTool forwards id, tool, owner to updateTool', async () => {
        let seen;
        guardiansStub.updateTool = async (id, tool, owner) => { seen = { id, tool, owner }; return { id: 'u' }; };
        const api = makeApi(ToolsApi);
        const tool = { config: { blockType: 'tool' } };
        const res = await api.updateTool(makeUser(), 'id-3', tool, {});
        assert.deepEqual(res, { id: 'u' });
        assert.equal(seen.id, 'id-3');
        assert.equal(seen.tool, tool);
    });

    it('updateTool throws 422 for invalid config (outside try)', async () => {
        const api = makeApi(ToolsApi);
        await assert.rejects(
            api.updateTool(makeUser(), 'id-3', { config: { blockType: 'x' } }, {}),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('publishTool forwards id, owner and body to publishTool', async () => {
        let seen;
        guardiansStub.publishTool = async (id, owner, body) => { seen = { id, owner, body }; return { isValid: true }; };
        const api = makeApi(ToolsApi);
        const body = { toolVersion: '1.0.0' };
        const res = await api.publishTool(makeUser(), 'id-4', body, {});
        assert.deepEqual(res, { isValid: true });
        assert.equal(seen.id, 'id-4');
        assert.equal(seen.body, body);
    });

    it('dryRunPolicy forwards id + owner to dryRunTool', async () => {
        let seen;
        guardiansStub.dryRunTool = async (id, owner) => { seen = id; return { isValid: true }; };
        const api = makeApi(ToolsApi);
        const res = await api.dryRunPolicy(makeUser(), 'id-5', {});
        assert.deepEqual(res, { isValid: true });
        assert.equal(seen, 'id-5');
    });

    it('draftPolicy forwards id + owner to draftTool', async () => {
        let seen;
        guardiansStub.draftTool = async (id, owner) => { seen = id; return true; };
        const api = makeApi(ToolsApi);
        const res = await api.draftPolicy(makeUser(), 'id-6', {});
        assert.equal(res, true);
        assert.equal(seen, 'id-6');
    });

    it('validateTool forwards owner + tool to validateTool', async () => {
        let seen;
        guardiansStub.validateTool = async (owner, tool) => { seen = { owner, tool }; return { results: {} }; };
        const api = makeApi(ToolsApi);
        const tool = { config: {} };
        const res = await api.validateTool(makeUser(), tool);
        assert.deepEqual(res, { results: {} });
        assert.equal(seen.tool, tool);
    });

    it('toolExportMessage forwards id to exportToolMessage', async () => {
        let seen;
        guardiansStub.exportToolMessage = async (id, owner) => { seen = id; return { messageId: 'm' }; };
        const api = makeApi(ToolsApi);
        const res = await api.toolExportMessage(makeUser(), 'id-7');
        assert.deepEqual(res, { messageId: 'm' });
        assert.equal(seen, 'id-7');
    });

    it('toolImportMessagePreview forwards messageId to previewToolMessage', async () => {
        let seen;
        guardiansStub.previewToolMessage = async (messageId, owner) => { seen = messageId; return { preview: true }; };
        const api = makeApi(ToolsApi);
        const res = await api.toolImportMessagePreview(makeUser(), { messageId: 'mid-1' });
        assert.deepEqual(res, { preview: true });
        assert.equal(seen, 'mid-1');
    });

    it('toolImportMessagePreview throws 422 when messageId missing', async () => {
        const api = makeApi(ToolsApi);
        await assert.rejects(
            api.toolImportMessagePreview(makeUser(), {}),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('toolImportMessage forwards messageId to importToolMessage', async () => {
        let seen;
        guardiansStub.importToolMessage = async (messageId, owner) => { seen = messageId; return { id: 'imp' }; };
        const api = makeApi(ToolsApi);
        const res = await api.toolImportMessage(makeUser(), { messageId: 'mid-2' });
        assert.deepEqual(res, { id: 'imp' });
        assert.equal(seen, 'mid-2');
    });

    it('getMenu forwards owner to getMenuTool', async () => {
        let seen;
        guardiansStub.getMenuTool = async (owner) => { seen = owner; return [{ id: 'menu' }]; };
        const api = makeApi(ToolsApi);
        const res = await api.getMenu(makeUser());
        assert.deepEqual(res, [{ id: 'menu' }]);
        assert.equal(seen.user.id, 'user-1');
    });

    it('checkTool forwards messageId to checkTool', async () => {
        let seen;
        guardiansStub.checkTool = async (messageId, owner) => { seen = messageId; return true; };
        const api = makeApi(ToolsApi);
        const res = await api.checkTool(makeUser(), 'mid-3');
        assert.equal(res, true);
        assert.equal(seen, 'mid-3');
    });
});

describe('TagsApi', function () {
    this.timeout(300000);

    it('setTags forwards body + owner to createTag', async () => {
        let seen;
        guardiansStub.createTag = async (body, owner) => { seen = { body, owner }; return { id: 'tag1' }; };
        const api = makeApi(TagsApi);
        const body = { name: 'tag', entity: 'PolicyDocument' };
        const res = await api.setTags(makeUser(), body, { url: '/u' });
        assert.deepEqual(res, { id: 'tag1' });
        assert.equal(seen.body, body);
    });

    it('setTags maps proxy error via InternalException', async () => {
        guardiansStub.createTag = async () => { throw new Error('tagboom'); };
        const api = makeApi(TagsApi);
        await assert.rejects(
            api.setTags(makeUser(), { name: 'x' }, { url: '/u' }),
            /tagboom/
        );
    });

    it('searchTags builds a tag map keyed by localTarget for a single target', async () => {
        guardiansStub.getTags = async (owner, entity, targets) => [
            { localTarget: 'tgt-1', name: 'a' },
            { localTarget: 'tgt-1', name: 'b' },
        ];
        guardiansStub.getTagCache = async () => [{ localTarget: 'tgt-1', date: '2026-01-01' }];
        const api = makeApi(TagsApi);
        const res = await api.searchTags(
            makeUser(), { entity: 'PolicyDocument', target: 'tgt-1' }, { url: '/u' }
        );
        assert.equal(res['tgt-1'].tags.length, 2);
        assert.equal(res['tgt-1'].refreshDate, '2026-01-01');
        assert.equal(res['tgt-1'].entity, 'PolicyDocument');
    });

    it('searchTags throws 422 when entity missing', async () => {
        const api = makeApi(TagsApi);
        await assert.rejects(
            api.searchTags(makeUser(), { target: 'x' }, { url: '/u' }),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('searchTags throws 422 when no target nor targets', async () => {
        const api = makeApi(TagsApi);
        await assert.rejects(
            api.searchTags(makeUser(), { entity: 'PolicyDocument' }, { url: '/u' }),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('synchronizationTags forwards entity/target to synchronizationTags and stamps refreshDate', async () => {
        let seen;
        guardiansStub.synchronizationTags = async (owner, entity, target) => { seen = { entity, target }; return [{ name: 't' }]; };
        const api = makeApi(TagsApi);
        const res = await api.synchronizationTags(
            makeUser(), { entity: 'PolicyDocument', target: 'tgt-2' }, { url: '/u' }
        );
        assert.equal(seen.entity, 'PolicyDocument');
        assert.equal(seen.target, 'tgt-2');
        assert.deepEqual(res.tags, [{ name: 't' }]);
        assert.equal(typeof res.refreshDate, 'string');
    });

    it('synchronizationTags throws 422 when target is not a string', async () => {
        const api = makeApi(TagsApi);
        await assert.rejects(
            api.synchronizationTags(makeUser(), { entity: 'PolicyDocument', target: 123 }, { url: '/u' }),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('deleteTag forwards uuid + owner to deleteTag', async () => {
        let seen;
        guardiansStub.deleteTag = async (uuid, owner) => { seen = uuid; return true; };
        const api = makeApi(TagsApi);
        const res = await api.deleteTag(makeUser(), 'uuid-x', { url: '/u' });
        assert.equal(res, true);
        assert.equal(seen, 'uuid-x');
    });

    it('deleteTag rejects empty uuid with 422', async () => {
        const api = makeApi(TagsApi);
        await assert.rejects(
            api.deleteTag(makeUser(), '', { url: '/u' }),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('getSchemas forwards pagination to getTagSchemas and sets count', async () => {
        let seen;
        guardiansStub.getTagSchemas = async (owner, pageIndex, pageSize) => { seen = { pageIndex, pageSize }; return { items: [{ owner: 'did:hedera:user' }], count: 4 }; };
        const api = makeApi(TagsApi);
        const res = makeRes();
        const req = {};
        await api.getSchemas(makeUser(), req, res, 0, 25);
        assert.deepEqual(seen, { pageIndex: 0, pageSize: 25 });
        assert.equal(res.headers['X-Total-Count'], 4);
    });

    it('getPublished forwards user to getPublishedTagSchemas', async () => {
        let seen;
        guardiansStub.getPublishedTagSchemas = async (user) => { seen = user; return [{ id: 's' }]; };
        const api = makeApi(TagsApi);
        const res = await api.getPublished(makeUser());
        assert.deepEqual(res, [{ id: 's' }]);
        assert.equal(seen.id, 'user-1');
    });

    it('publishTag forwards schemaId + version to publishTagSchema', async () => {
        let seen;
        guardiansStub.getSchemaById = async () => ({ id: 's' });
        guardiansStub.publishTagSchema = async (schemaId, version, owner) => { seen = { schemaId, version }; return { id: 's', status: 'PUBLISHED' }; };
        const api = makeApi(TagsApi);
        const res = await api.publishTag(makeUser(), 'schema-1', { url: '/u' });
        assert.equal(seen.schemaId, 'schema-1');
        assert.equal(seen.version, '1.0.0');
        assert.equal(res.status, 'PUBLISHED');
    });

    it('publishTag throws 403 when permission check fails', async () => {
        guardiansStub.getSchemaById = async () => ({ id: 's' });
        const localHelpers = { ...helpersMock, SchemaUtils: { ...schemaUtilsStub, checkPermission: () => 'no permission' } };
        const { TagsApi: LocalTagsApi } = await esmock(TAGS_DIST, {
            '#helpers': localHelpers,
            '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined, checkPermission: () => () => undefined },
            '#constants': { PREFIXES: { TAGS: 'tags/', SCHEMES: 'schemas/' }, SCHEMA_REQUIRED_PROPS: {} },
            '#middlewares': {
                Examples: {}, ForbiddenErrorDTO: class {}, InternalServerErrorDTO: class {},
                ObjectExamples: {}, SchemaDTO: class {}, TagDTO: class {}, TagFilterDTO: class {},
                TagMapDTO: class {}, TaskDTO: class {}, UnprocessableEntityErrorDTO: class {},
                pageHeader: {}, Response451_DTO: class {},
            },
            '@guardian/common': commonMock,
        });
        const api = makeApi(LocalTagsApi);
        await assert.rejects(
            api.publishTag(makeUser(), 'schema-1', { url: '/u' }),
            (err) => { assert.equal(err.getStatus(), 403); return true; }
        );
    });

    it('updateSchema forwards updated schema + owner to updateSchema', async () => {
        let seen;
        guardiansStub.getSchemaById = async () => ({ id: 's' });
        guardiansStub.updateSchema = async (schema, owner) => { seen = { schema, owner }; return [{ id: 's' }]; };
        const api = makeApi(TagsApi);
        const newSchema = { id: 'schema-2', document: { $id: '#schema-2' } };
        const res = await api.updateSchema(makeUser(), 'schema-2', newSchema, { url: '/u' });
        assert.deepEqual(res, [{ id: 's' }]);
        assert.equal(seen.schema, newSchema);
    });
});

describe('ThemesApi', function () {
    this.timeout(300000);

    it('setThemes forwards theme + owner to createTheme', async () => {
        let seen;
        guardiansStub.createTheme = async (theme, owner) => { seen = { theme, owner }; return { id: 'th1' }; };
        const api = makeApi(ThemesApi);
        const theme = { name: 'dark' };
        const res = await api.setThemes(makeUser(), theme, { url: '/u', user: makeUser() });
        assert.deepEqual(res, { id: 'th1' });
        assert.equal(seen.theme, theme);
        assert.equal(seen.owner.user.id, 'user-1');
    });

    it('setThemes maps proxy error via InternalException', async () => {
        guardiansStub.createTheme = async () => { throw new Error('themeboom'); };
        const api = makeApi(ThemesApi);
        await assert.rejects(
            api.setThemes(makeUser(), { name: 'x' }, { url: '/u' }),
            /themeboom/
        );
    });

    it('updateTheme forwards themeId, theme, owner to updateTheme', async () => {
        let seen;
        guardiansStub.getThemeById = async () => ({ id: 'old' });
        guardiansStub.updateTheme = async (themeId, theme, owner) => { seen = { themeId, theme, owner }; return { id: 'upd' }; };
        const api = makeApi(ThemesApi);
        const theme = { name: 'dark2' };
        const res = await api.updateTheme(makeUser(), 'theme-1', theme, { url: '/u', params: { themeId: 'theme-1' } });
        assert.deepEqual(res, { id: 'upd' });
        assert.equal(seen.themeId, 'theme-1');
        assert.equal(seen.theme, theme);
    });

    it('updateTheme throws 422 on empty themeId', async () => {
        const api = makeApi(ThemesApi);
        await assert.rejects(
            api.updateTheme(makeUser(), '', { name: 'x' }, { url: '/u', params: {} }),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('updateTheme throws 404 when theme not found', async () => {
        guardiansStub.getThemeById = async () => null;
        const api = makeApi(ThemesApi);
        await assert.rejects(
            api.updateTheme(makeUser(), 'theme-1', { name: 'x' }, { url: '/u', params: { themeId: 'theme-1' } }),
            (err) => { assert.equal(err.getStatus(), 404); return true; }
        );
    });

    it('deleteTheme forwards themeId + owner to deleteTheme', async () => {
        let seen;
        guardiansStub.deleteTheme = async (themeId, owner) => { seen = themeId; return true; };
        const api = makeApi(ThemesApi);
        const res = await api.deleteTheme(makeUser(), 'theme-2', { url: '/u', params: { themeId: 'theme-2' } });
        assert.equal(res, true);
        assert.equal(seen, 'theme-2');
    });

    it('deleteTheme rejects empty themeId with 422', async () => {
        const api = makeApi(ThemesApi);
        await assert.rejects(
            api.deleteTheme(makeUser(), '', { url: '/u', params: {} }),
            (err) => { assert.equal(err.getStatus(), 422); return true; }
        );
    });

    it('getThemes returns guardian themes for a user with did', async () => {
        let seen;
        guardiansStub.getThemes = async (owner) => { seen = owner; return [{ id: 'th' }]; };
        const api = makeApi(ThemesApi);
        const res = await api.getThemes(makeUser());
        assert.deepEqual(res, [{ id: 'th' }]);
        assert.equal(seen.user.id, 'user-1');
    });

    it('getThemes returns empty array when user has no did', async () => {
        const api = makeApi(ThemesApi);
        const res = await api.getThemes(makeUser({ did: undefined }));
        assert.deepEqual(res, []);
    });

    it('importTheme forwards zip + owner to importThemeFile', async () => {
        let seen;
        guardiansStub.importThemeFile = async (zip, owner) => { seen = { zip, owner }; return { id: 'imp' }; };
        const api = makeApi(ThemesApi);
        const zip = Buffer.from('zip');
        const res = await api.importTheme(makeUser(), zip, { url: '/u' });
        assert.deepEqual(res, { id: 'imp' });
        assert.equal(seen.zip, zip);
    });
});
