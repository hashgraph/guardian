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
const user = { id: 'u1', did: 'did:u' };
const task = { taskId: 't1', userId: 'u1' };

describe('Guardians schemas', () => {
    it('getSchemasByOwner forwards options and owner', async () => {
        const { g, calls } = make();
        await g.getSchemasByOwner({ category: 'c' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMAS, { options: { category: 'c' }, owner }]);
    });

    it('getSchemasByOwnerV2 forwards options and owner', async () => {
        const { g, calls } = make();
        await g.getSchemasByOwnerV2({ category: 'c' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMAS_V2, { options: { category: 'c' }, owner }]);
    });

    it('getSchemasByUUID forwards owner and uuid', async () => {
        const { g, calls } = make();
        await g.getSchemasByUUID(owner, 'uuid-1');
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMAS_BY_UUID, { owner, uuid: 'uuid-1' }]);
    });

    it('getSchemaByType includes owner when present', async () => {
        const { g, calls } = make();
        await g.getSchemaByType(user, 'TypeA', 'own-x');
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA, { user, type: 'TypeA', owner: 'own-x' }]);
    });

    it('getSchemaByType omits owner when absent', async () => {
        const { g, calls } = make();
        await g.getSchemaByType(user, 'TypeA');
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA, { user, type: 'TypeA' }]);
    });

    it('getSchemaById forwards user and id', async () => {
        const { g, calls } = make();
        await g.getSchemaById(user, 'id-1');
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA, { user, id: 'id-1' }]);
    });

    it('getSchemaParents forwards id and owner', async () => {
        const { g, calls } = make();
        await g.getSchemaParents('id-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA_PARENTS, { id: 'id-1', owner }]);
    });

    it('getSchemaDeletionPreview forwards schemaIds and owner', async () => {
        const { g, calls } = make();
        await g.getSchemaDeletionPreview(['a', 'b'], owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA_DELETION_PREVIEW, { schemaIds: ['a', 'b'], owner }]);
    });

    it('getSchemaTree forwards id and owner', async () => {
        const { g, calls } = make();
        await g.getSchemaTree('id-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA_TREE, { id: 'id-1', owner }]);
    });

    it('getSchemaTreePlantUML uses defaults', async () => {
        const { g, calls } = make();
        await g.getSchemaTreePlantUML('id-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA_TREE_PLANTUML, {
            id: 'id-1', owner, includeFields: true, includeFormulas: false, includeDependencies: false
        }]);
    });

    it('getSchemaTreePlantUML forwards explicit flags', async () => {
        const { g, calls } = make();
        await g.getSchemaTreePlantUML('id-1', owner, false, true, true);
        assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA_TREE_PLANTUML, {
            id: 'id-1', owner, includeFields: false, includeFormulas: true, includeDependencies: true
        }]);
    });

    it('importSchemasByMessages forwards args', async () => {
        const { g, calls } = make();
        await g.importSchemasByMessages(['m1'], owner, 'topic-1');
        assert.deepEqual(calls[0], [MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES, { messageIds: ['m1'], owner, topicId: 'topic-1' }]);
    });

    it('importSchemasByMessagesAsync forwards task and optional schemasIds', async () => {
        const { g, calls } = make();
        await g.importSchemasByMessagesAsync(['m1'], owner, 'topic-1', task, ['s1']);
        assert.deepEqual(calls[0], [MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES_ASYNC, { messageIds: ['m1'], owner, topicId: 'topic-1', task, schemasIds: ['s1'] }]);
    });

    it('importSchemasByMessagesAsync without schemasIds sends undefined', async () => {
        const { g, calls } = make();
        await g.importSchemasByMessagesAsync(['m1'], owner, 'topic-1', task);
        assert.deepEqual(calls[0][1].schemasIds, undefined);
    });

    it('importSchemasByFile forwards args', async () => {
        const { g, calls } = make();
        await g.importSchemasByFile({ f: 1 }, owner, 'topic-1');
        assert.deepEqual(calls[0], [MessageAPI.IMPORT_SCHEMAS_BY_FILE, { files: { f: 1 }, owner, topicId: 'topic-1' }]);
    });

    it('importSchemasByFileAsync forwards task and schemasIds', async () => {
        const { g, calls } = make();
        await g.importSchemasByFileAsync({ f: 1 }, owner, 'topic-1', task, ['s']);
        assert.deepEqual(calls[0], [MessageAPI.IMPORT_SCHEMAS_BY_FILE_ASYNC, { files: { f: 1 }, owner, topicId: 'topic-1', task, schemasIds: ['s'] }]);
    });

    it('previewSchemasByMessages forwards args', async () => {
        const { g, calls } = make();
        await g.previewSchemasByMessages(owner, ['m1']);
        assert.deepEqual(calls[0], [MessageAPI.PREVIEW_SCHEMA, { owner, messageIds: ['m1'] }]);
    });

    it('previewSchemasByMessagesAsync forwards task', async () => {
        const { g, calls } = make();
        await g.previewSchemasByMessagesAsync(owner, ['m1'], task);
        assert.deepEqual(calls[0], [MessageAPI.PREVIEW_SCHEMA_ASYNC, { owner, messageIds: ['m1'], task }]);
    });

    it('previewSchemasByFile returns files directly without sendMessage', async () => {
        const { g, calls } = make();
        const files = [{ id: 1 }];
        const res = await g.previewSchemasByFile(files);
        assert.equal(res, files);
        assert.equal(calls.length, 0);
    });

    it('getSchemasDublicates forwards args', async () => {
        const { g, calls } = make();
        await g.getSchemasDublicates(['n1'], owner, 'p1');
        assert.deepEqual(calls[0], [MessageAPI.SCHEMA_IMPORT_CHECK_FOR_DUBLICATES, { schemaNames: ['n1'], owner, policyId: 'p1' }]);
    });

    it('getSchemasDublicates with only names', async () => {
        const { g, calls } = make();
        await g.getSchemasDublicates(['n1']);
        assert.deepEqual(calls[0], [MessageAPI.SCHEMA_IMPORT_CHECK_FOR_DUBLICATES, { schemaNames: ['n1'], owner: undefined, policyId: undefined }]);
    });

    it('createSchema forwards item and owner', async () => {
        const { g, calls } = make();
        await g.createSchema({ name: 'S' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.CREATE_SCHEMA, { item: { name: 'S' }, owner }]);
    });

    it('createSchemaAsync forwards task', async () => {
        const { g, calls } = make();
        await g.createSchemaAsync({ name: 'S' }, owner, task);
        assert.deepEqual(calls[0], [MessageAPI.CREATE_SCHEMA_ASYNC, { item: { name: 'S' }, owner, task }]);
    });

    it('copySchemaAsync forwards args in expected order', async () => {
        const { g, calls } = make();
        await g.copySchemaAsync('iri-1', 'topic-1', 'name-1', owner, task, true);
        assert.deepEqual(calls[0], [MessageAPI.COPY_SCHEMA_ASYNC, { iri: 'iri-1', topicId: 'topic-1', name: 'name-1', task, owner, copyNested: true }]);
    });

    it('updateSchema forwards item and owner', async () => {
        const { g, calls } = make();
        await g.updateSchema({ id: 'S' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.UPDATE_SCHEMA, { item: { id: 'S' }, owner }]);
    });

    it('deleteSchema wraps schemaId into array with default includeChildren false', async () => {
        const { g, calls } = make();
        await g.deleteSchema('s1', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_SCHEMAS, { schemaIds: ['s1'], owner, task, includeChildren: false }]);
    });

    it('deleteSchema honors includeChildren true', async () => {
        const { g, calls } = make();
        await g.deleteSchema('s1', owner, task, true);
        assert.equal(calls[0][1].includeChildren, true);
    });

    it('deleteSchemasByTopic forwards args', async () => {
        const { g, calls } = make();
        await g.deleteSchemasByTopic('topic-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_SCHEMAS_BY_TOPIC, { topicId: 'topic-1', owner }]);
    });

    it('deleteSchemasByIds default includeChildren false', async () => {
        const { g, calls } = make();
        await g.deleteSchemasByIds(['s1', 's2'], owner, task);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_SCHEMAS, { schemaIds: ['s1', 's2'], owner, task, includeChildren: false }]);
    });

    it('publishSchema forwards args', async () => {
        const { g, calls } = make();
        await g.publishSchema('id-1', '1.0', owner);
        assert.deepEqual(calls[0], [MessageAPI.PUBLISH_SCHEMA, { id: 'id-1', version: '1.0', owner }]);
    });

    it('publishSchemaAsync forwards task', async () => {
        const { g, calls } = make();
        await g.publishSchemaAsync('id-1', '1.0', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.PUBLISH_SCHEMA_ASYNC, { id: 'id-1', version: '1.0', owner, task }]);
    });

    it('exportSchemas forwards ids and owner', async () => {
        const { g, calls } = make();
        await g.exportSchemas(['a'], owner);
        assert.deepEqual(calls[0], [MessageAPI.EXPORT_SCHEMAS, { ids: ['a'], owner }]);
    });

    it('getUserRoles forwards did', async () => {
        const { g, calls } = make();
        await g.getUserRoles('did:x');
        assert.deepEqual(calls[0], [MessageAPI.GET_USER_ROLES, { did: 'did:x' }]);
    });

    it('createSystemSchema forwards item and owner', async () => {
        const { g, calls } = make();
        await g.createSystemSchema({ name: 'S' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.CREATE_SYSTEM_SCHEMA, { item: { name: 'S' }, owner }]);
    });

    it('getSystemSchemas forwards paging', async () => {
        const { g, calls } = make();
        await g.getSystemSchemas(user, 1, 10);
        assert.deepEqual(calls[0], [MessageAPI.GET_SYSTEM_SCHEMAS, { user, pageIndex: 1, pageSize: 10 }]);
    });

    it('getSystemSchemasV2 forwards fields and paging', async () => {
        const { g, calls } = make();
        await g.getSystemSchemasV2(user, ['f'], 1, 10);
        assert.deepEqual(calls[0], [MessageAPI.GET_SYSTEM_SCHEMAS_V2, { user, fields: ['f'], pageIndex: 1, pageSize: 10 }]);
    });

    it('activeSchema forwards id and owner', async () => {
        const { g, calls } = make();
        await g.activeSchema('id-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.ACTIVE_SCHEMA, { id: 'id-1', owner }]);
    });

    it('getSchemaByEntity forwards user and entity', async () => {
        const { g, calls } = make();
        await g.getSchemaByEntity(user, 'ENT');
        assert.deepEqual(calls[0], [MessageAPI.GET_SYSTEM_SCHEMA, { user, entity: 'ENT' }]);
    });

    it('getListSchemas forwards owner', async () => {
        const { g, calls } = make();
        await g.getListSchemas(owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_LIST_SCHEMAS, { owner }]);
    });

    it('getSubSchemas forwards category topicId owner', async () => {
        const { g, calls } = make();
        await g.getSubSchemas('cat', 'topic-1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_SUB_SCHEMAS, { topicId: 'topic-1', owner, category: 'cat' }]);
    });

    it('exportSchemasXlsx returns base64 decoded buffer', async () => {
        const b64 = Buffer.from('hello').toString('base64');
        const { g, calls } = make(b64);
        const res = await g.exportSchemasXlsx(owner, ['a']);
        assert.ok(Buffer.isBuffer(res));
        assert.equal(res.toString(), 'hello');
        assert.deepEqual(calls[0], [MessageAPI.SCHEMA_EXPORT_XLSX, { ids: ['a'], owner }]);
    });

    it('importSchemasByXlsx forwards args', async () => {
        const { g, calls } = make();
        const xlsx = new ArrayBuffer(4);
        await g.importSchemasByXlsx(owner, 'topic-1', xlsx);
        assert.deepEqual(calls[0], [MessageAPI.SCHEMA_IMPORT_XLSX, { owner, xlsx, topicId: 'topic-1' }]);
    });

    it('importSchemasByXlsxAsync forwards task and schemasIds', async () => {
        const { g, calls } = make();
        const xlsx = new ArrayBuffer(4);
        await g.importSchemasByXlsxAsync(owner, 'topic-1', xlsx, task, ['s']);
        assert.deepEqual(calls[0], [MessageAPI.SCHEMA_IMPORT_XLSX_ASYNC, { owner, xlsx, topicId: 'topic-1', task, schemasIds: ['s'] }]);
    });

    it('previewSchemasByFileXlsx forwards args', async () => {
        const { g, calls } = make();
        const xlsx = new ArrayBuffer(4);
        await g.previewSchemasByFileXlsx(owner, xlsx);
        assert.deepEqual(calls[0], [MessageAPI.SCHEMA_IMPORT_XLSX_PREVIEW, { owner, xlsx }]);
    });

    it('getFileTemplate forwards owner and filename', async () => {
        const { g, calls } = make();
        await g.getFileTemplate(owner, 'file.csv');
        assert.deepEqual(calls[0], [MessageAPI.GET_TEMPLATE, { owner, filename: 'file.csv' }]);
    });
});
