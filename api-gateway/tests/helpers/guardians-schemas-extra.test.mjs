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

describe('@unit Guardians schemas extra', () => {
    describe('tag schemas', () => {
        it('getTagSchemas forwards owner and paging', async () => {
            const { g, calls } = make();
            await g.getTagSchemas(owner, 2, 25);
            assert.deepEqual(calls[0], [MessageAPI.GET_TAG_SCHEMAS, { owner, pageIndex: 2, pageSize: 25 }]);
        });

        it('getTagSchemas with only owner sends undefined paging', async () => {
            const { g, calls } = make();
            await g.getTagSchemas(owner);
            assert.deepEqual(calls[0], [MessageAPI.GET_TAG_SCHEMAS, { owner, pageIndex: undefined, pageSize: undefined }]);
        });

        it('getTagSchemas returns the broker response', async () => {
            const { g } = make({ items: [1], count: 1 });
            const res = await g.getTagSchemas(owner, 0, 10);
            assert.deepEqual(res, { items: [1], count: 1 });
        });

        it('getTagSchemas uses GET_TAG_SCHEMAS subject', async () => {
            const { g, calls } = make();
            await g.getTagSchemas(owner, 1, 1);
            assert.equal(calls[0][0], MessageAPI.GET_TAG_SCHEMAS);
        });

        it('getTagSchemasV2 forwards fields owner and paging', async () => {
            const { g, calls } = make();
            await g.getTagSchemasV2(owner, ['a', 'b'], 3, 30);
            assert.deepEqual(calls[0], [MessageAPI.GET_TAG_SCHEMAS_V2, { fields: ['a', 'b'], owner, pageIndex: 3, pageSize: 30 }]);
        });

        it('getTagSchemasV2 with only fields and owner sends undefined paging', async () => {
            const { g, calls } = make();
            await g.getTagSchemasV2(owner, ['x']);
            assert.deepEqual(calls[0], [MessageAPI.GET_TAG_SCHEMAS_V2, { fields: ['x'], owner, pageIndex: undefined, pageSize: undefined }]);
        });

        it('getTagSchemasV2 places fields before owner in payload', async () => {
            const { g, calls } = make();
            await g.getTagSchemasV2(owner, ['f'], 1, 2);
            assert.deepEqual(Object.keys(calls[0][1]), ['fields', 'owner', 'pageIndex', 'pageSize']);
        });

        it('createTagSchema forwards item and owner', async () => {
            const { g, calls } = make();
            await g.createTagSchema({ name: 'TS' }, owner);
            assert.deepEqual(calls[0], [MessageAPI.CREATE_TAG_SCHEMA, { item: { name: 'TS' }, owner }]);
        });

        it('createTagSchema returns the broker response', async () => {
            const { g } = make({ id: 'tag-1' });
            const res = await g.createTagSchema({ name: 'TS' }, owner);
            assert.deepEqual(res, { id: 'tag-1' });
        });

        it('publishTagSchema forwards id version owner', async () => {
            const { g, calls } = make();
            await g.publishTagSchema('id-9', '2.0', owner);
            assert.deepEqual(calls[0], [MessageAPI.PUBLISH_TAG_SCHEMA, { id: 'id-9', version: '2.0', owner }]);
        });

        it('publishTagSchema uses PUBLISH_TAG_SCHEMA subject', async () => {
            const { g, calls } = make();
            await g.publishTagSchema('id-9', '2.0', owner);
            assert.equal(calls[0][0], MessageAPI.PUBLISH_TAG_SCHEMA);
        });

        it('getPublishedTagSchemas forwards user', async () => {
            const { g, calls } = make();
            await g.getPublishedTagSchemas(user);
            assert.deepEqual(calls[0], [MessageAPI.GET_PUBLISHED_TAG_SCHEMAS, { user }]);
        });

        it('getPublishedTagSchemas returns the broker response', async () => {
            const { g } = make([{ id: 's' }]);
            const res = await g.getPublishedTagSchemas(user);
            assert.deepEqual(res, [{ id: 's' }]);
        });
    });

    describe('compareSchemas', () => {
        it('forwards user type schemas idLvl', async () => {
            const { g, calls } = make();
            const schemas = [{ type: 'id', value: 'v1' }];
            await g.compareSchemas(owner, 'simple', schemas, '0');
            assert.deepEqual(calls[0], [MessageAPI.COMPARE_SCHEMAS, { user: owner, type: 'simple', schemas, idLvl: '0' }]);
        });

        it('accepts numeric idLvl', async () => {
            const { g, calls } = make();
            await g.compareSchemas(owner, 'full', [], 1);
            assert.equal(calls[0][1].idLvl, 1);
        });

        it('passes schemas array through unchanged', async () => {
            const { g, calls } = make();
            const schemas = [{ type: 'policy-message', value: 'm', policy: 'p' }];
            await g.compareSchemas(owner, 'x', schemas, '2');
            assert.equal(calls[0][1].schemas, schemas);
        });

        it('renames first arg to user in payload', async () => {
            const { g, calls } = make();
            await g.compareSchemas(owner, 't', [], '0');
            assert.equal(calls[0][1].user, owner);
            assert.deepEqual(Object.keys(calls[0][1]), ['user', 'type', 'schemas', 'idLvl']);
        });

        it('returns the broker response', async () => {
            const { g } = make({ total: 99 });
            const res = await g.compareSchemas(owner, 't', [], '0');
            assert.deepEqual(res, { total: 99 });
        });
    });

    describe('schema rules', () => {
        const rule = { id: 'r1', config: {} };

        it('createSchemaRule forwards rule and owner', async () => {
            const { g, calls } = make();
            await g.createSchemaRule(rule, owner);
            assert.deepEqual(calls[0], [MessageAPI.CREATE_SCHEMA_RULE, { rule, owner }]);
        });

        it('createSchemaRule returns the broker response', async () => {
            const { g } = make({ id: 'r1' });
            const res = await g.createSchemaRule(rule, owner);
            assert.deepEqual(res, { id: 'r1' });
        });

        it('getSchemaRules forwards filters and owner', async () => {
            const { g, calls } = make();
            await g.getSchemaRules({ policyId: 'p' }, owner);
            assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA_RULES, { filters: { policyId: 'p' }, owner }]);
        });

        it('getSchemaRules returns count response', async () => {
            const { g } = make({ items: [], count: 0 });
            const res = await g.getSchemaRules({}, owner);
            assert.deepEqual(res, { items: [], count: 0 });
        });

        it('getSchemaRuleById forwards ruleId and owner', async () => {
            const { g, calls } = make();
            await g.getSchemaRuleById('r1', owner);
            assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA_RULE, { ruleId: 'r1', owner }]);
        });

        it('getSchemaRuleById uses GET_SCHEMA_RULE subject', async () => {
            const { g, calls } = make();
            await g.getSchemaRuleById('r1', owner);
            assert.equal(calls[0][0], MessageAPI.GET_SCHEMA_RULE);
        });

        it('getSchemaRuleRelationships forwards ruleId and owner', async () => {
            const { g, calls } = make();
            await g.getSchemaRuleRelationships('r1', owner);
            assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA_RULE_RELATIONSHIPS, { ruleId: 'r1', owner }]);
        });

        it('updateSchemaRule forwards ruleId rule owner', async () => {
            const { g, calls } = make();
            await g.updateSchemaRule('r1', rule, owner);
            assert.deepEqual(calls[0], [MessageAPI.UPDATE_SCHEMA_RULE, { ruleId: 'r1', rule, owner }]);
        });

        it('updateSchemaRule keeps key order ruleId rule owner', async () => {
            const { g, calls } = make();
            await g.updateSchemaRule('r1', rule, owner);
            assert.deepEqual(Object.keys(calls[0][1]), ['ruleId', 'rule', 'owner']);
        });

        it('deleteSchemaRule forwards ruleId and owner', async () => {
            const { g, calls } = make();
            await g.deleteSchemaRule('r1', owner);
            assert.deepEqual(calls[0], [MessageAPI.DELETE_SCHEMA_RULE, { ruleId: 'r1', owner }]);
        });

        it('deleteSchemaRule returns boolean response', async () => {
            const { g } = make(true);
            const res = await g.deleteSchemaRule('r1', owner);
            assert.equal(res, true);
        });

        it('activateSchemaRule forwards ruleId and owner', async () => {
            const { g, calls } = make();
            await g.activateSchemaRule('r1', owner);
            assert.deepEqual(calls[0], [MessageAPI.ACTIVATE_SCHEMA_RULE, { ruleId: 'r1', owner }]);
        });

        it('inactivateSchemaRule forwards ruleId and owner', async () => {
            const { g, calls } = make();
            await g.inactivateSchemaRule('r1', owner);
            assert.deepEqual(calls[0], [MessageAPI.INACTIVATE_SCHEMA_RULE, { ruleId: 'r1', owner }]);
        });

        it('activate and inactivate use distinct subjects', async () => {
            const { g, calls } = make();
            await g.activateSchemaRule('r1', owner);
            await g.inactivateSchemaRule('r1', owner);
            assert.equal(calls[0][0], MessageAPI.ACTIVATE_SCHEMA_RULE);
            assert.equal(calls[1][0], MessageAPI.INACTIVATE_SCHEMA_RULE);
        });

        it('getSchemaRuleData forwards options and owner', async () => {
            const { g, calls } = make();
            await g.getSchemaRuleData({ policyId: 'p', schemaId: 's' }, owner);
            assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA_RULE_DATA, { options: { policyId: 'p', schemaId: 's' }, owner }]);
        });

        it('getSchemaRuleData returns array response', async () => {
            const { g } = make([{ id: 'd1' }]);
            const res = await g.getSchemaRuleData({}, owner);
            assert.deepEqual(res, [{ id: 'd1' }]);
        });

        it('importSchemaRule forwards zip policyId owner', async () => {
            const { g, calls } = make();
            const zip = { buf: 1 };
            await g.importSchemaRule(zip, 'p1', owner);
            assert.deepEqual(calls[0], [MessageAPI.IMPORT_SCHEMA_RULE_FILE, { zip, policyId: 'p1', owner }]);
        });

        it('importSchemaRule keeps key order zip policyId owner', async () => {
            const { g, calls } = make();
            await g.importSchemaRule({ b: 1 }, 'p1', owner);
            assert.deepEqual(Object.keys(calls[0][1]), ['zip', 'policyId', 'owner']);
        });

        it('exportSchemaRule forwards ruleId and owner', async () => {
            const b64 = Buffer.from('rulefile').toString('base64');
            const { g, calls } = make(b64);
            await g.exportSchemaRule('r1', owner);
            assert.deepEqual(calls[0], [MessageAPI.EXPORT_SCHEMA_RULE_FILE, { ruleId: 'r1', owner }]);
        });

        it('exportSchemaRule decodes base64 into a buffer', async () => {
            const b64 = Buffer.from('rulefile').toString('base64');
            const { g } = make(b64);
            const res = await g.exportSchemaRule('r1', owner);
            assert.ok(Buffer.isBuffer(res));
            assert.equal(res.toString(), 'rulefile');
        });

        it('previewSchemaRule forwards zip and owner', async () => {
            const { g, calls } = make();
            const zip = { buf: 2 };
            await g.previewSchemaRule(zip, owner);
            assert.deepEqual(calls[0], [MessageAPI.PREVIEW_SCHEMA_RULE_FILE, { zip, owner }]);
        });

        it('previewSchemaRule returns the broker response', async () => {
            const { g } = make({ preview: true });
            const res = await g.previewSchemaRule({}, owner);
            assert.deepEqual(res, { preview: true });
        });
    });

    describe('return-value passthrough and default-param branches', () => {
        it('getSchemasByOwner returns broker response', async () => {
            const { g } = make({ items: [{ id: 's' }], count: 1 });
            const res = await g.getSchemasByOwner({ category: 'c' }, owner);
            assert.deepEqual(res, { items: [{ id: 's' }], count: 1 });
        });

        it('getSchemasByOwnerV2 returns broker response', async () => {
            const { g } = make({ items: [], count: 0 });
            const res = await g.getSchemasByOwnerV2({}, owner);
            assert.deepEqual(res, { items: [], count: 0 });
        });

        it('getSchemasByUUID returns array response', async () => {
            const { g } = make([{ uuid: 'u' }]);
            const res = await g.getSchemasByUUID(owner, 'uuid-1');
            assert.deepEqual(res, [{ uuid: 'u' }]);
        });

        it('getSchemaByType omits owner key entirely when owner is empty string', async () => {
            const { g, calls } = make();
            await g.getSchemaByType(user, 'TypeA', '');
            assert.deepEqual(calls[0], [MessageAPI.GET_SCHEMA, { user, type: 'TypeA' }]);
            assert.ok(!('owner' in calls[0][1]));
        });

        it('getSchemaByType includes owner when truthy', async () => {
            const { g, calls } = make();
            await g.getSchemaByType(user, 'TypeA', 'own-x');
            assert.ok('owner' in calls[0][1]);
        });

        it('getSchemaById and getSchemaByType share the GET_SCHEMA subject', async () => {
            const { g, calls } = make();
            await g.getSchemaById(user, 'id-1');
            await g.getSchemaByType(user, 'T');
            assert.equal(calls[0][0], MessageAPI.GET_SCHEMA);
            assert.equal(calls[1][0], MessageAPI.GET_SCHEMA);
        });

        it('getSchemaTreePlantUML omits one explicit flag and keeps others default', async () => {
            const { g, calls } = make();
            await g.getSchemaTreePlantUML('id-1', owner, true, true);
            assert.deepEqual(calls[0][1], {
                id: 'id-1', owner, includeFields: true, includeFormulas: true, includeDependencies: false
            });
        });

        it('importSchemasByMessages returns broker response', async () => {
            const { g } = make([{ doc: 1 }]);
            const res = await g.importSchemasByMessages(['m1'], owner, 't');
            assert.deepEqual(res, [{ doc: 1 }]);
        });

        it('importSchemasByFile returns schemasMap errors shape', async () => {
            const { g } = make({ schemasMap: [1], errors: [] });
            const res = await g.importSchemasByFile({ f: 1 }, owner, 't');
            assert.deepEqual(res, { schemasMap: [1], errors: [] });
        });

        it('importSchemasByFileAsync without schemasIds sends undefined', async () => {
            const { g, calls } = make();
            await g.importSchemasByFileAsync({ f: 1 }, owner, 't', task);
            assert.equal(calls[0][1].schemasIds, undefined);
            assert.ok('schemasIds' in calls[0][1]);
        });

        it('previewSchemasByFile returns the same array reference and does not call broker', async () => {
            const { g, calls } = make();
            const files = [{ id: 1 }, { id: 2 }];
            const res = await g.previewSchemasByFile(files);
            assert.equal(res, files);
            assert.equal(calls.length, 0);
        });

        it('previewSchemasByFile returns empty array unchanged', async () => {
            const { g } = make();
            const files = [];
            const res = await g.previewSchemasByFile(files);
            assert.equal(res, files);
        });

        it('getSchemasDublicates with names and owner but no policyId', async () => {
            const { g, calls } = make();
            await g.getSchemasDublicates(['n1'], owner);
            assert.deepEqual(calls[0], [MessageAPI.SCHEMA_IMPORT_CHECK_FOR_DUBLICATES, { schemaNames: ['n1'], owner, policyId: undefined }]);
        });

        it('createSchema returns broker response', async () => {
            const { g } = make([{ id: 'new' }]);
            const res = await g.createSchema({ name: 'S' }, owner);
            assert.deepEqual(res, [{ id: 'new' }]);
        });

        it('copySchemaAsync forwards copyNested false', async () => {
            const { g, calls } = make();
            await g.copySchemaAsync('iri-1', 'topic-1', 'name-1', owner, task, false);
            assert.equal(calls[0][1].copyNested, false);
        });

        it('copySchemaAsync keeps payload key order', async () => {
            const { g, calls } = make();
            await g.copySchemaAsync('iri-1', 'topic-1', 'name-1', owner, task, true);
            assert.deepEqual(Object.keys(calls[0][1]), ['iri', 'topicId', 'name', 'task', 'owner', 'copyNested']);
        });

        it('deleteSchema explicit includeChildren false', async () => {
            const { g, calls } = make();
            await g.deleteSchema('s1', owner, task, false);
            assert.equal(calls[0][1].includeChildren, false);
        });

        it('deleteSchemasByIds honors includeChildren true', async () => {
            const { g, calls } = make();
            await g.deleteSchemasByIds(['s1'], owner, task, true);
            assert.equal(calls[0][1].includeChildren, true);
        });

        it('deleteSchemasByTopic returns broker response', async () => {
            const { g } = make(false);
            const res = await g.deleteSchemasByTopic('topic-1', owner);
            assert.equal(res, false);
        });

        it('publishSchema returns broker response', async () => {
            const { g } = make({ status: 'PUBLISHED' });
            const res = await g.publishSchema('id-1', '1.0', owner);
            assert.deepEqual(res, { status: 'PUBLISHED' });
        });

        it('exportSchemas returns broker response', async () => {
            const { g } = make([{ id: 'a' }]);
            const res = await g.exportSchemas(['a'], owner);
            assert.deepEqual(res, [{ id: 'a' }]);
        });

        it('createSystemSchema returns broker response', async () => {
            const { g } = make({ id: 'sys' });
            const res = await g.createSystemSchema({ name: 'S' }, owner);
            assert.deepEqual(res, { id: 'sys' });
        });

        it('getSystemSchemas forwards undefined paging when omitted', async () => {
            const { g, calls } = make();
            await g.getSystemSchemas(user);
            assert.deepEqual(calls[0], [MessageAPI.GET_SYSTEM_SCHEMAS, { user, pageIndex: undefined, pageSize: undefined }]);
        });

        it('getSystemSchemasV2 forwards undefined paging when omitted', async () => {
            const { g, calls } = make();
            await g.getSystemSchemasV2(user, ['f']);
            assert.deepEqual(calls[0], [MessageAPI.GET_SYSTEM_SCHEMAS_V2, { user, fields: ['f'], pageIndex: undefined, pageSize: undefined }]);
        });

        it('activeSchema returns broker response', async () => {
            const { g } = make({ active: true });
            const res = await g.activeSchema('id-1', owner);
            assert.deepEqual(res, { active: true });
        });

        it('getSchemaByEntity uses GET_SYSTEM_SCHEMA subject', async () => {
            const { g, calls } = make();
            await g.getSchemaByEntity(user, 'ENT');
            assert.equal(calls[0][0], MessageAPI.GET_SYSTEM_SCHEMA);
        });

        it('getListSchemas returns array response', async () => {
            const { g } = make([{ id: 'l' }]);
            const res = await g.getListSchemas(owner);
            assert.deepEqual(res, [{ id: 'l' }]);
        });

        it('getSubSchemas keeps payload key order topicId owner category', async () => {
            const { g, calls } = make();
            await g.getSubSchemas('cat', 'topic-1', owner);
            assert.deepEqual(Object.keys(calls[0][1]), ['topicId', 'owner', 'category']);
        });
    });

    describe('xlsx and template variants', () => {
        it('exportSchemasXlsx decodes empty broker payload to empty buffer', async () => {
            const { g } = make('');
            const res = await g.exportSchemasXlsx(owner, ['a']);
            assert.ok(Buffer.isBuffer(res));
            assert.equal(res.length, 0);
        });

        it('importSchemasByXlsx keeps payload key order owner xlsx topicId', async () => {
            const { g, calls } = make();
            const xlsx = new ArrayBuffer(4);
            await g.importSchemasByXlsx(owner, 'topic-1', xlsx);
            assert.deepEqual(Object.keys(calls[0][1]), ['owner', 'xlsx', 'topicId']);
        });

        it('importSchemasByXlsxAsync without schemasIds sends undefined', async () => {
            const { g, calls } = make();
            const xlsx = new ArrayBuffer(4);
            await g.importSchemasByXlsxAsync(owner, 'topic-1', xlsx, task);
            assert.equal(calls[0][1].schemasIds, undefined);
            assert.ok('schemasIds' in calls[0][1]);
        });

        it('previewSchemasByFileXlsx returns broker response', async () => {
            const { g } = make({ preview: 1 });
            const xlsx = new ArrayBuffer(4);
            const res = await g.previewSchemasByFileXlsx(owner, xlsx);
            assert.deepEqual(res, { preview: 1 });
        });

        it('getFileTemplate returns broker response', async () => {
            const { g } = make('csv-content');
            const res = await g.getFileTemplate(owner, 'file.csv');
            assert.equal(res, 'csv-content');
        });

        it('getFileTemplate keeps payload key order owner filename', async () => {
            const { g, calls } = make();
            await g.getFileTemplate(owner, 'file.csv');
            assert.deepEqual(Object.keys(calls[0][1]), ['owner', 'filename']);
        });
    });

    describe('async/task variants pass the task object through', () => {
        it('createSchemaAsync forwards the task reference', async () => {
            const { g, calls } = make();
            await g.createSchemaAsync({ name: 'S' }, owner, task);
            assert.equal(calls[0][1].task, task);
            assert.equal(calls[0][0], MessageAPI.CREATE_SCHEMA_ASYNC);
        });

        it('publishSchemaAsync forwards the task reference', async () => {
            const { g, calls } = make();
            await g.publishSchemaAsync('id-1', '1.0', owner, task);
            assert.equal(calls[0][1].task, task);
        });

        it('previewSchemasByMessagesAsync forwards the task reference', async () => {
            const { g, calls } = make();
            await g.previewSchemasByMessagesAsync(owner, ['m1'], task);
            assert.equal(calls[0][1].task, task);
            assert.equal(calls[0][0], MessageAPI.PREVIEW_SCHEMA_ASYNC);
        });

        it('importSchemasByMessagesAsync keeps payload key order', async () => {
            const { g, calls } = make();
            await g.importSchemasByMessagesAsync(['m1'], owner, 't', task, ['s1']);
            assert.deepEqual(Object.keys(calls[0][1]), ['messageIds', 'owner', 'topicId', 'task', 'schemasIds']);
        });

        it('importSchemasByFileAsync keeps payload key order', async () => {
            const { g, calls } = make();
            await g.importSchemasByFileAsync({ f: 1 }, owner, 't', task, ['s']);
            assert.deepEqual(Object.keys(calls[0][1]), ['files', 'owner', 'topicId', 'task', 'schemasIds']);
        });

        it('importSchemasByXlsxAsync keeps payload key order', async () => {
            const { g, calls } = make();
            await g.importSchemasByXlsxAsync(owner, 't', new ArrayBuffer(2), task, ['s']);
            assert.deepEqual(Object.keys(calls[0][1]), ['owner', 'xlsx', 'topicId', 'task', 'schemasIds']);
        });

        it('createSchemaAsync returns broker response', async () => {
            const { g } = make({ taskId: 't1' });
            const res = await g.createSchemaAsync({}, owner, task);
            assert.deepEqual(res, { taskId: 't1' });
        });

        it('publishSchemaAsync returns broker response', async () => {
            const { g } = make({ taskId: 't1' });
            const res = await g.publishSchemaAsync('id', 'v', owner, task);
            assert.deepEqual(res, { taskId: 't1' });
        });
    });

    describe('subject identity for gap methods', () => {
        it('compareSchemas uses COMPARE_SCHEMAS', async () => {
            const { g, calls } = make();
            await g.compareSchemas(owner, 't', [], '0');
            assert.equal(calls[0][0], MessageAPI.COMPARE_SCHEMAS);
        });

        it('createSchemaRule uses CREATE_SCHEMA_RULE', async () => {
            const { g, calls } = make();
            await g.createSchemaRule({}, owner);
            assert.equal(calls[0][0], MessageAPI.CREATE_SCHEMA_RULE);
        });

        it('getSchemaRules uses GET_SCHEMA_RULES', async () => {
            const { g, calls } = make();
            await g.getSchemaRules({}, owner);
            assert.equal(calls[0][0], MessageAPI.GET_SCHEMA_RULES);
        });

        it('getSchemaRuleRelationships uses GET_SCHEMA_RULE_RELATIONSHIPS', async () => {
            const { g, calls } = make();
            await g.getSchemaRuleRelationships('r', owner);
            assert.equal(calls[0][0], MessageAPI.GET_SCHEMA_RULE_RELATIONSHIPS);
        });

        it('updateSchemaRule uses UPDATE_SCHEMA_RULE', async () => {
            const { g, calls } = make();
            await g.updateSchemaRule('r', {}, owner);
            assert.equal(calls[0][0], MessageAPI.UPDATE_SCHEMA_RULE);
        });

        it('deleteSchemaRule uses DELETE_SCHEMA_RULE', async () => {
            const { g, calls } = make();
            await g.deleteSchemaRule('r', owner);
            assert.equal(calls[0][0], MessageAPI.DELETE_SCHEMA_RULE);
        });

        it('getSchemaRuleData uses GET_SCHEMA_RULE_DATA', async () => {
            const { g, calls } = make();
            await g.getSchemaRuleData({}, owner);
            assert.equal(calls[0][0], MessageAPI.GET_SCHEMA_RULE_DATA);
        });

        it('importSchemaRule uses IMPORT_SCHEMA_RULE_FILE', async () => {
            const { g, calls } = make();
            await g.importSchemaRule({}, 'p', owner);
            assert.equal(calls[0][0], MessageAPI.IMPORT_SCHEMA_RULE_FILE);
        });

        it('exportSchemaRule uses EXPORT_SCHEMA_RULE_FILE', async () => {
            const { g, calls } = make(Buffer.from('x').toString('base64'));
            await g.exportSchemaRule('r', owner);
            assert.equal(calls[0][0], MessageAPI.EXPORT_SCHEMA_RULE_FILE);
        });

        it('previewSchemaRule uses PREVIEW_SCHEMA_RULE_FILE', async () => {
            const { g, calls } = make();
            await g.previewSchemaRule({}, owner);
            assert.equal(calls[0][0], MessageAPI.PREVIEW_SCHEMA_RULE_FILE);
        });

        it('createTagSchema uses CREATE_TAG_SCHEMA', async () => {
            const { g, calls } = make();
            await g.createTagSchema({}, owner);
            assert.equal(calls[0][0], MessageAPI.CREATE_TAG_SCHEMA);
        });

        it('getTagSchemasV2 uses GET_TAG_SCHEMAS_V2', async () => {
            const { g, calls } = make();
            await g.getTagSchemasV2(owner, []);
            assert.equal(calls[0][0], MessageAPI.GET_TAG_SCHEMAS_V2);
        });

        it('getPublishedTagSchemas uses GET_PUBLISHED_TAG_SCHEMAS', async () => {
            const { g, calls } = make();
            await g.getPublishedTagSchemas(user);
            assert.equal(calls[0][0], MessageAPI.GET_PUBLISHED_TAG_SCHEMAS);
        });
    });

    describe('single broker call per method', () => {
        it('schema-rule methods each issue exactly one sendMessage', async () => {
            const { g, calls } = make();
            await g.createSchemaRule({}, owner);
            await g.getSchemaRules({}, owner);
            await g.getSchemaRuleById('r', owner);
            await g.getSchemaRuleRelationships('r', owner);
            await g.updateSchemaRule('r', {}, owner);
            await g.deleteSchemaRule('r', owner);
            await g.activateSchemaRule('r', owner);
            await g.inactivateSchemaRule('r', owner);
            await g.getSchemaRuleData({}, owner);
            await g.importSchemaRule({}, 'p', owner);
            await g.previewSchemaRule({}, owner);
            assert.equal(calls.length, 11);
        });

        it('tag-schema methods each issue exactly one sendMessage', async () => {
            const { g, calls } = make();
            await g.getTagSchemas(owner);
            await g.getTagSchemasV2(owner, []);
            await g.createTagSchema({}, owner);
            await g.publishTagSchema('i', 'v', owner);
            await g.getPublishedTagSchemas(user);
            assert.equal(calls.length, 5);
        });
    });
});
