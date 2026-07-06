import assert from 'node:assert/strict';
import { MessageAPI } from '@guardian/interfaces';
import { Guardians } from '../../dist/helpers/guardians.js';

function make(canned = { ok: true }) {
    const g = new Guardians(undefined);
    const calls = [];
    g.sendMessage = async (subject, data) => {
        calls.push([subject, data]);
        return canned;
    };
    return { g, calls };
}

const owner = { creator: 'did:owner', owner: 'did:owner', id: 'o1' };
const task = { taskId: 't1', userId: 'u1' };

describe('Guardians modules', () => {
    it('createModule forwards module and owner', async () => {
        const { g, calls } = make();
        await g.createModule({ name: 'M' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.CREATE_MODULE, { module: { name: 'M' }, owner }]);
    });

    it('getModule forwards filters and owner', async () => {
        const { g, calls } = make();
        await g.getModule({ f: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_MODULES, { filters: { f: 1 }, owner }]);
    });

    it('getModuleV2 forwards filters and owner', async () => {
        const { g, calls } = make();
        await g.getModuleV2({ f: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_MODULES_V2, { filters: { f: 1 }, owner }]);
    });

    it('deleteModule forwards uuid and owner', async () => {
        const { g, calls } = make();
        await g.deleteModule('u1', owner);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_MODULES, { uuid: 'u1', owner }]);
    });

    it('getMenuModule forwards owner', async () => {
        const { g, calls } = make();
        await g.getMenuModule(owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_MENU_MODULES, { owner }]);
    });

    it('updateModule forwards uuid module owner', async () => {
        const { g, calls } = make();
        await g.updateModule('u1', { name: 'M' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.UPDATE_MODULES, { uuid: 'u1', module: { name: 'M' }, owner }]);
    });

    it('getModuleById forwards uuid and owner', async () => {
        const { g, calls } = make();
        await g.getModuleById('u1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_MODULE, { uuid: 'u1', owner }]);
    });

    it('exportModuleFile returns base64 decoded buffer', async () => {
        const b64 = Buffer.from('moduledata').toString('base64');
        const { g, calls } = make(b64);
        const res = await g.exportModuleFile('u1', owner);
        assert.ok(Buffer.isBuffer(res));
        assert.equal(res.toString(), 'moduledata');
        assert.deepEqual(calls[0], [MessageAPI.MODULE_EXPORT_FILE, { uuid: 'u1', owner }]);
    });

    it('exportModuleMessage forwards uuid and owner', async () => {
        const { g, calls } = make();
        await g.exportModuleMessage('u1', owner);
        assert.deepEqual(calls[0], [MessageAPI.MODULE_EXPORT_MESSAGE, { uuid: 'u1', owner }]);
    });

    it('importModuleFile forwards zip and owner', async () => {
        const { g, calls } = make();
        await g.importModuleFile({ z: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.MODULE_IMPORT_FILE, { zip: { z: 1 }, owner }]);
    });

    it('importModuleMessage forwards messageId and owner', async () => {
        const { g, calls } = make();
        await g.importModuleMessage('m1', owner);
        assert.deepEqual(calls[0], [MessageAPI.MODULE_IMPORT_MESSAGE, { messageId: 'm1', owner }]);
    });

    it('previewModuleFile forwards zip and owner', async () => {
        const { g, calls } = make();
        await g.previewModuleFile({ z: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.MODULE_IMPORT_FILE_PREVIEW, { zip: { z: 1 }, owner }]);
    });

    it('previewModuleMessage forwards messageId and owner', async () => {
        const { g, calls } = make();
        await g.previewModuleMessage('m1', owner);
        assert.deepEqual(calls[0], [MessageAPI.MODULE_IMPORT_MESSAGE_PREVIEW, { messageId: 'm1', owner }]);
    });

    it('publishModule forwards uuid owner module', async () => {
        const { g, calls } = make();
        await g.publishModule('u1', owner, { name: 'M' });
        assert.deepEqual(calls[0], [MessageAPI.PUBLISH_MODULES, { uuid: 'u1', owner, module: { name: 'M' } }]);
    });

    it('validateModule forwards owner and module', async () => {
        const { g, calls } = make();
        await g.validateModule(owner, { name: 'M' });
        assert.deepEqual(calls[0], [MessageAPI.VALIDATE_MODULES, { owner, module: { name: 'M' } }]);
    });
});

describe('Guardians tools', () => {
    it('createTool forwards tool and owner', async () => {
        const { g, calls } = make();
        await g.createTool({ name: 'T' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.CREATE_TOOL, { tool: { name: 'T' }, owner }]);
    });

    it('createToolAsync forwards task', async () => {
        const { g, calls } = make();
        await g.createToolAsync({ name: 'T' }, owner, task);
        assert.deepEqual(calls[0], [MessageAPI.CREATE_TOOL_ASYNC, { tool: { name: 'T' }, owner, task }]);
    });

    it('getTools forwards filters and owner', async () => {
        const { g, calls } = make();
        await g.getTools({ f: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_TOOLS, { filters: { f: 1 }, owner }]);
    });

    it('getToolsV2 forwards fields filters owner', async () => {
        const { g, calls } = make();
        await g.getToolsV2(['a'], { f: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_TOOLS_V2, { fields: ['a'], filters: { f: 1 }, owner }]);
    });

    it('deleteTool forwards id and owner', async () => {
        const { g, calls } = make();
        await g.deleteTool('id-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_TOOL, { id: 'id-1', owner }]);
    });

    it('getToolById forwards id and owner', async () => {
        const { g, calls } = make();
        await g.getToolById('id-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_TOOL, { id: 'id-1', owner }]);
    });

    it('updateTool forwards id tool owner', async () => {
        const { g, calls } = make();
        await g.updateTool('id-1', { name: 'T' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.UPDATE_TOOL, { id: 'id-1', tool: { name: 'T' }, owner }]);
    });

    it('publishTool forwards id owner body', async () => {
        const { g, calls } = make();
        await g.publishTool('id-1', owner, { v: 1 });
        assert.deepEqual(calls[0], [MessageAPI.PUBLISH_TOOL, { id: 'id-1', owner, body: { v: 1 } }]);
    });

    it('publishToolAsync forwards id owner body task', async () => {
        const { g, calls } = make();
        await g.publishToolAsync('id-1', owner, { v: 1 }, task);
        assert.deepEqual(calls[0], [MessageAPI.PUBLISH_TOOL_ASYNC, { id: 'id-1', owner, body: { v: 1 }, task }]);
    });

    it('dryRunTool forwards id and owner', async () => {
        const { g, calls } = make();
        await g.dryRunTool('id-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.DRY_RUN_TOOL, { id: 'id-1', owner }]);
    });

    it('draftTool forwards id and owner', async () => {
        const { g, calls } = make();
        await g.draftTool('id-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.DRAFT_TOOL, { id: 'id-1', owner }]);
    });

    it('validateTool forwards owner and tool', async () => {
        const { g, calls } = make();
        await g.validateTool(owner, { name: 'T' });
        assert.deepEqual(calls[0], [MessageAPI.VALIDATE_TOOL, { owner, tool: { name: 'T' } }]);
    });

    it('getMenuTool forwards owner', async () => {
        const { g, calls } = make();
        await g.getMenuTool(owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_MENU_TOOLS, { owner }]);
    });

    it('checkTool forwards messageId and owner', async () => {
        const { g, calls } = make();
        await g.checkTool('m1', owner);
        assert.deepEqual(calls[0], [MessageAPI.CHECK_TOOL, { messageId: 'm1', owner }]);
    });

    it('exportToolFile returns base64 decoded buffer', async () => {
        const b64 = Buffer.from('tooldata').toString('base64');
        const { g, calls } = make(b64);
        const res = await g.exportToolFile('id-1', owner);
        assert.ok(Buffer.isBuffer(res));
        assert.equal(res.toString(), 'tooldata');
        assert.deepEqual(calls[0], [MessageAPI.TOOL_EXPORT_FILE, { id: 'id-1', owner }]);
    });

    it('exportToolMessage forwards id and owner', async () => {
        const { g, calls } = make();
        await g.exportToolMessage('id-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.TOOL_EXPORT_MESSAGE, { id: 'id-1', owner }]);
    });

    it('importToolFile forwards optional metadata', async () => {
        const { g, calls } = make();
        await g.importToolFile({ z: 1 }, owner, { m: 1 });
        assert.deepEqual(calls[0], [MessageAPI.TOOL_IMPORT_FILE, { zip: { z: 1 }, owner, metadata: { m: 1 } }]);
    });

    it('importToolFile without metadata sends undefined', async () => {
        const { g, calls } = make();
        await g.importToolFile({ z: 1 }, owner);
        assert.equal(calls[0][1].metadata, undefined);
    });

    it('importToolMessage forwards messageId and owner', async () => {
        const { g, calls } = make();
        await g.importToolMessage('m1', owner);
        assert.deepEqual(calls[0], [MessageAPI.TOOL_IMPORT_MESSAGE, { messageId: 'm1', owner }]);
    });

    it('previewToolFile forwards zip and owner', async () => {
        const { g, calls } = make();
        await g.previewToolFile({ z: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.TOOL_IMPORT_FILE_PREVIEW, { zip: { z: 1 }, owner }]);
    });

    it('previewToolMessage forwards messageId and owner', async () => {
        const { g, calls } = make();
        await g.previewToolMessage('m1', owner);
        assert.deepEqual(calls[0], [MessageAPI.TOOL_IMPORT_MESSAGE_PREVIEW, { messageId: 'm1', owner }]);
    });

    it('importToolFileAsync forwards task and metadata', async () => {
        const { g, calls } = make();
        await g.importToolFileAsync({ z: 1 }, owner, task, { m: 1 });
        assert.deepEqual(calls[0], [MessageAPI.TOOL_IMPORT_FILE_ASYNC, { zip: { z: 1 }, owner, task, metadata: { m: 1 } }]);
    });

    it('importToolMessageAsync forwards messageId owner task', async () => {
        const { g, calls } = make();
        await g.importToolMessageAsync('m1', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.TOOL_IMPORT_MESSAGE_ASYNC, { messageId: 'm1', owner, task }]);
    });
});

describe('Guardians tags and themes', () => {
    const user = { id: 'u1' };

    it('getSentinelApiKey forwards user', async () => {
        const { g, calls } = make();
        await g.getSentinelApiKey(user);
        assert.deepEqual(calls[0], [MessageAPI.GET_SENTINEL_API_KEY, { user }]);
    });

    it('createTag forwards tag and owner', async () => {
        const { g, calls } = make();
        await g.createTag({ name: 'T' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.CREATE_TAG, { tag: { name: 'T' }, owner }]);
    });

    it('getTags forwards entity targets linkedItems', async () => {
        const { g, calls } = make();
        await g.getTags(owner, 'ENT', ['t1'], ['l1']);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAGS, { owner, entity: 'ENT', targets: ['t1'], linkedItems: ['l1'] }]);
    });

    it('deleteTag forwards uuid and owner', async () => {
        const { g, calls } = make();
        await g.deleteTag('u1', owner);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_TAG, { uuid: 'u1', owner }]);
    });

    it('exportTags forwards entity targets', async () => {
        const { g, calls } = make();
        await g.exportTags(owner, 'ENT', ['t1']);
        assert.deepEqual(calls[0], [MessageAPI.EXPORT_TAGS, { owner, entity: 'ENT', targets: ['t1'], linkedItems: undefined }]);
    });

    it('getTagCache forwards args', async () => {
        const { g, calls } = make();
        await g.getTagCache(owner, 'ENT', ['t1'], ['l1']);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAG_CACHE, { owner, entity: 'ENT', targets: ['t1'], linkedItems: ['l1'] }]);
    });

    it('synchronizationTags forwards single target', async () => {
        const { g, calls } = make();
        await g.synchronizationTags(owner, 'ENT', 't1', ['l1']);
        assert.deepEqual(calls[0], [MessageAPI.GET_SYNCHRONIZATION_TAGS, { owner, entity: 'ENT', target: 't1', linkedItems: ['l1'] }]);
    });

    it('getTagSchemas forwards paging', async () => {
        const { g, calls } = make();
        await g.getTagSchemas(owner, 1, 10);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAG_SCHEMAS, { owner, pageIndex: 1, pageSize: 10 }]);
    });

    it('getTagSchemasV2 forwards fields and paging', async () => {
        const { g, calls } = make();
        await g.getTagSchemasV2(owner, ['a'], 1, 10);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAG_SCHEMAS_V2, { fields: ['a'], owner, pageIndex: 1, pageSize: 10 }]);
    });

    it('createTagSchema forwards item and owner', async () => {
        const { g, calls } = make();
        await g.createTagSchema({ name: 'S' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.CREATE_TAG_SCHEMA, { item: { name: 'S' }, owner }]);
    });

    it('publishTagSchema forwards id version owner', async () => {
        const { g, calls } = make();
        await g.publishTagSchema('id-1', '1.0', owner);
        assert.deepEqual(calls[0], [MessageAPI.PUBLISH_TAG_SCHEMA, { id: 'id-1', version: '1.0', owner }]);
    });

    it('getPublishedTagSchemas forwards user', async () => {
        const { g, calls } = make();
        await g.getPublishedTagSchemas(user);
        assert.deepEqual(calls[0], [MessageAPI.GET_PUBLISHED_TAG_SCHEMAS, { user }]);
    });

    it('createTheme forwards theme and owner', async () => {
        const { g, calls } = make();
        await g.createTheme({ name: 'X' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.CREATE_THEME, { theme: { name: 'X' }, owner }]);
    });

    it('updateTheme forwards themeId theme owner', async () => {
        const { g, calls } = make();
        await g.updateTheme('t1', { name: 'X' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.UPDATE_THEME, { themeId: 't1', theme: { name: 'X' }, owner }]);
    });

    it('getThemes forwards owner', async () => {
        const { g, calls } = make();
        await g.getThemes(owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_THEMES, { owner }]);
    });

    it('getThemeById forwards themeId and owner', async () => {
        const { g, calls } = make();
        await g.getThemeById('t1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_THEME, { themeId: 't1', owner }]);
    });

    it('deleteTheme forwards themeId and owner', async () => {
        const { g, calls } = make();
        await g.deleteTheme('t1', owner);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_THEME, { themeId: 't1', owner }]);
    });

    it('importThemeFile forwards zip and owner', async () => {
        const { g, calls } = make();
        await g.importThemeFile({ z: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.THEME_IMPORT_FILE, { zip: { z: 1 }, owner }]);
    });

    it('exportThemeFile returns base64 decoded buffer', async () => {
        const b64 = Buffer.from('themedata').toString('base64');
        const { g, calls } = make(b64);
        const res = await g.exportThemeFile('t1', owner);
        assert.ok(Buffer.isBuffer(res));
        assert.equal(res.toString(), 'themedata');
        assert.deepEqual(calls[0], [MessageAPI.THEME_EXPORT_FILE, { themeId: 't1', owner }]);
    });
});
