import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MessageAPI, ModuleStatus, PolicyStatus, SchemaCategory, SchemaStatus } from '@guardian/interfaces';
import {
    removePolicySchemaTemplateSnapshot,
    schemaTemplatesAPI,
} from '../../dist/api/schema-template.service.js';
import {
    callHandler,
    DatabaseServer,
    loadAPI,
    ok,
    register,
    restoreStubs,
    silentLogger,
    stub,
} from '../_handler-harness.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const importHelpersPath = path.resolve(__dirname, '../../dist/helpers/import-helpers/index.js');

const owner = {
    id: 'user-1',
    owner: 'did:owner',
    creator: 'did:owner-creator',
};

const policy = (overrides = {}) => ({
    id: 'policy-1',
    uuid: 'policy-uuid',
    owner: owner.owner,
    topicId: '0.0.10',
    status: PolicyStatus.DRAFT,
    ...overrides,
});

const templateBinding = {
    templateId: 'template-1',
    templateName: 'Template',
    templateVersion: '1.0.0',
    templateStatus: ModuleStatus.DRAFT,
    templateStateHash: 'hash-1',
    snapshotId: 'snapshot-1',
    appliedAt: '2026-01-01T00:00:00.000Z',
    schemaMap: {
        'template-schema-1': 'policy-schema-1',
    },
};

describe('schema template handlers', () => {
    let handlers;

    beforeEach(async () => {
        handlers = await register(schemaTemplatesAPI, silentLogger());
    });

    afterEach(() => restoreStubs());

    it('GET_APPLIED_SCHEMA_TEMPLATE returns the snapshot config instead of mutable template config', async () => {
        stub(DatabaseServer, 'getPolicy', async () => policy({
            schemaTemplate: templateBinding,
        }));
        stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
            id: 'template-1',
            uuid: 'template-uuid',
            name: 'Mutable Template',
            description: 'template description',
            owner: owner.owner,
            creator: owner.owner,
            status: ModuleStatus.DRAFT,
            version: '1.0.1',
            topicId: '0.0.20',
            messageId: '',
            config: {
                schemas: {
                    mutable: {
                        customFieldsLocked: false,
                    },
                },
            },
        }));
        stub(DatabaseServer, 'getSchemaTemplateSnapshotById', async () => ({
            id: 'snapshot-1',
            config: {
                schemas: {
                    'template-schema-1': {
                        customFieldsLocked: true,
                        fields: {
                            'template-field-1': {
                                locked: true,
                            },
                        },
                    },
                },
            },
        }));

        const response = await callHandler(
            handlers,
            MessageAPI.GET_APPLIED_SCHEMA_TEMPLATE,
            { topicId: '0.0.10', owner }
        );

        assert.equal(ok(response), true);
        assert.deepEqual(response.body.config, {
            schemas: {
                'template-schema-1': {
                    customFieldsLocked: true,
                    fields: {
                        'template-field-1': {
                            locked: true,
                        },
                    },
                },
            },
        });
        assert.equal(response.body.name, 'Template');
        assert.equal(response.body.version, '1.0.0');
        assert.equal(response.body.snapshotId, 'snapshot-1');
    });

    it('DETACH_SCHEMA_TEMPLATE removes snapshot, clears template metadata from bound schemas, and clears policy binding', async () => {
        const updatedSchemas = [];
        let removedSnapshot = null;
        let updatedPolicy = null;
        const boundDocument = {
            type: 'object',
            properties: {
                templateField: {
                    type: 'string',
                    templateFieldId: 'template-field-1',
                },
            },
        };
        const customDocument = {
            type: 'object',
            properties: {
                custom: {
                    type: 'string',
                },
            },
        };

        stub(DatabaseServer, 'getPolicyById', async () => policy({
            schemaTemplate: templateBinding,
        }));
        stub(DatabaseServer, 'getSchemas', async (filter) => {
            assert.deepEqual(filter, {
                topicId: '0.0.10',
                category: SchemaCategory.POLICY,
            });
            return [
                {
                    id: 'policy-schema-1',
                    templateId: 'template-1',
                    templateSchemaId: 'template-schema-1',
                    document: boundDocument,
                },
                {
                    id: 'custom-schema',
                    templateId: '',
                    templateSchemaId: '',
                    document: customDocument,
                },
            ];
        });
        stub(DatabaseServer, 'updateSchema', async (id, schema) => {
            updatedSchemas.push({ id, schema });
            return schema;
        });
        stub(DatabaseServer, 'getSchemaTemplateSnapshotById', async () => ({
            id: 'snapshot-1',
        }));
        stub(DatabaseServer, 'removeSchemaTemplateSnapshot', async (snapshot) => {
            removedSnapshot = snapshot;
        });
        stub(DatabaseServer, 'updatePolicy', async (item) => {
            updatedPolicy = item;
            return item;
        });

        const response = await callHandler(
            handlers,
            MessageAPI.DETACH_SCHEMA_TEMPLATE,
            { policyId: 'policy-1', owner }
        );

        assert.equal(ok(response), true);
        assert.deepEqual(response.body, {
            policyId: 'policy-1',
            templateId: 'template-1',
            detachedSchemas: 1,
        });
        assert.equal(updatedSchemas.length, 1);
        assert.equal(updatedSchemas[0].id, 'policy-schema-1');
        assert.equal(updatedSchemas[0].schema.templateId, '');
        assert.equal(updatedSchemas[0].schema.templateSchemaId, '');
        assert.equal(updatedSchemas[0].schema.document.properties.templateField.templateFieldId, undefined);
        assert.deepEqual(removedSnapshot, { id: 'snapshot-1' });
        assert.equal(updatedPolicy.schemaTemplate, null);
    });

    it('APPLY_SCHEMA_TEMPLATE rejects a policy that already has an applied template', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
            id: 'template-1',
            owner: owner.owner,
            status: ModuleStatus.DRAFT,
            topicId: '0.0.20',
        }));
        stub(DatabaseServer, 'getPolicyById', async () => policy({
            schemaTemplate: templateBinding,
        }));

        const response = await callHandler(
            handlers,
            MessageAPI.APPLY_SCHEMA_TEMPLATE,
            { templateId: 'template-1', policyId: 'policy-1', owner }
        );

        assert.equal(ok(response), false);
        assert.match(response.error, /already applied/);
    });
});

describe('schema template CRUD and query handlers', () => {
    let handlers;

    beforeEach(async () => {
        handlers = await register(schemaTemplatesAPI, silentLogger());
    });

    afterEach(() => restoreStubs());

    it('GET_SCHEMA_TEMPLATES returns paginated list with per-template schema counts', async () => {
        stub(DatabaseServer, 'getSchemaTemplatesAndCount', async () => [[
            { id: 'template-1', owner: owner.owner, topicId: '0.0.20', name: 'T', status: ModuleStatus.DRAFT }
        ], 1]);
        stub(DatabaseServer, 'getPolicies', async () => []);
        stub(DatabaseServer, 'getSchemasCount', async () => 5);

        const response = await callHandler(handlers, MessageAPI.GET_SCHEMA_TEMPLATES, {
            filters: { pageIndex: '0', pageSize: '10' },
            owner
        });

        assert.equal(ok(response), true);
        assert.equal(response.body.count, 1);
        assert.equal(response.body.items[0].schemasCount, 5);
        assert.equal(response.body.items[0].usedByPoliciesCount, 0);
    });

    it('GET_SCHEMA_TEMPLATE returns a draft template owned by the caller', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
            id: 'template-1',
            owner: owner.owner,
            status: ModuleStatus.DRAFT,
            topicId: null,
            config: {}
        }));
        stub(DatabaseServer, 'getSchemas', async () => []);

        const response = await callHandler(handlers, MessageAPI.GET_SCHEMA_TEMPLATE, {
            id: 'template-1',
            owner
        });

        assert.equal(ok(response), true);
        assert.equal(response.body.id, 'template-1');
    });

    // forged topicId / GridFS handles in a hand-crafted zip: see the sanitizer in
    // schema-template.service.ts for what each one reaches
    it('CREATE_SCHEMA_TEMPLATE strips server-managed fields from the payload', async () => {
        let saved = null;
        stub(DatabaseServer, 'saveSchemaTemplate', async (payload) => {
            saved = payload;
            return { ...payload, id: 'template-new' };
        });
        // createTemplateTopic needs Hedera and throws here; the sanitization under
        // test already happened, and the payload is captured above.
        stub(DatabaseServer, 'removeSchemaTemplate', async () => undefined);

        const response = await callHandler(handlers, MessageAPI.CREATE_SCHEMA_TEMPLATE, {
            template: {
                name: 'Forged',
                config: {},
                _id: 'forged-id',
                id: 'forged-id',
                status: ModuleStatus.PUBLISHED,
                owner: 'did:victim',
                creator: 'did:victim',
                messageId: 'forged-message',
                version: '9.9.9',
                previousVersion: '9.9.8',
                topicId: '0.0.999',
                contentFileId: '64b7f1e2d3a4b5c6d7e8f901',
                configFileId: '64b7f1e2d3a4b5c6d7e8f902',
                _configFileId: '64b7f1e2d3a4b5c6d7e8f903',
                uuid: 'forged-uuid'
            },
            owner
        });

        void response;
        assert.ok(saved, 'the sanitized payload should have reached saveSchemaTemplate');

        assert.equal(saved.topicId, undefined, 'a forged topicId must not survive import');
        assert.equal(saved.contentFileId, undefined, 'a forged GridFS handle must not survive import');
        assert.equal(saved.configFileId, undefined, 'a forged GridFS handle must not survive import');
        assert.equal(saved._configFileId, undefined, 'a forged GridFS handle must not survive import');

        assert.equal(saved.messageId, undefined);
        assert.equal(saved.version, undefined);
        assert.equal(saved.previousVersion, undefined);

        assert.equal(saved.uuid, undefined, 'a pinned uuid must not survive import');

        assert.equal(saved.owner, owner.owner);
        // guards the assertion below: without a creator on the fixture it would
        // compare undefined to undefined
        assert.notEqual(owner.creator, undefined);
        assert.equal(saved.creator, owner.creator);
        assert.equal(saved.status, ModuleStatus.DRAFT);
        assert.equal(saved.name, 'Forged', 'legitimate fields are untouched');
    });

    it('CHECK_SCHEMA_TEMPLATE returns not-found when messageId is absent', async () => {
        const response = await callHandler(handlers, MessageAPI.CHECK_SCHEMA_TEMPLATE, {
            messageId: '',
            owner
        });

        assert.equal(ok(response), true);
        assert.equal(response.body.status, 'not-found');
    });

    it('CHECK_SCHEMA_TEMPLATE returns local status when template exists in the database', async () => {
        stub(DatabaseServer, 'getSchemaTemplate', async () => ({
            id: 'template-1',
            name: 'My Template',
            version: '1.0.0',
            messageId: 'msg-1',
            status: ModuleStatus.PUBLISHED
        }));

        const response = await callHandler(handlers, MessageAPI.CHECK_SCHEMA_TEMPLATE, {
            messageId: 'msg-1',
            owner
        });

        assert.equal(ok(response), true);
        assert.equal(response.body.status, 'local');
        assert.equal(response.body.template.name, 'My Template');
        assert.equal(response.body.template.version, '1.0.0');
    });

    it('UPDATE_SCHEMA_TEMPLATE persists name, description and config', async () => {
        let saved = null;
        stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
            id: 'template-1',
            owner: owner.owner,
            status: ModuleStatus.DRAFT,
            name: 'Old',
            description: 'Old desc',
            config: {}
        }));
        stub(DatabaseServer, 'updateSchemaTemplate', async (item) => { saved = item; return item; });

        const response = await callHandler(handlers, MessageAPI.UPDATE_SCHEMA_TEMPLATE, {
            id: 'template-1',
            template: { name: 'New', description: 'New desc', config: { schemas: {} } },
            owner
        });

        assert.equal(ok(response), true);
        assert.equal(saved.name, 'New');
        assert.equal(saved.description, 'New desc');
        assert.deepEqual(saved.config, { schemas: {} });
    });

    it('DELETE_SCHEMA_TEMPLATE removes a draft not bound to any policy', async () => {
        let removed = null;
        stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
            id: 'template-1',
            owner: owner.owner,
            status: ModuleStatus.DRAFT,
            topicId: null
        }));
        stub(DatabaseServer, 'getPolicies', async () => []);
        stub(DatabaseServer, 'removeSchemaTemplate', async (item) => { removed = item; });

        const response = await callHandler(handlers, MessageAPI.DELETE_SCHEMA_TEMPLATE, {
            id: 'template-1',
            owner
        });

        assert.equal(ok(response), true);
        assert.ok(removed, 'removeSchemaTemplate was not called');
    });

    /*
     * ensureEditable only blocks a PUBLISHED template, so a PUBLISH_ERROR one is
     * deletable - but its schemas may already have been flipped to PUBLISHED by the
     * attempt that then failed. The cleanup removes only DRAFT and ERROR rows, so
     * those published ones survived the template and were left pointing at a
     * templateId that no longer exists.
     */
    it('DELETE_SCHEMA_TEMPLATE refuses to strand schemas an earlier publish attempt published', async () => {
        const deleted = [];
        stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
            id: 'template-1',
            owner: owner.owner,
            status: ModuleStatus.PUBLISH_ERROR,
            topicId: '0.0.20'
        }));
        stub(DatabaseServer, 'getPolicies', async () => []);
        stub(DatabaseServer, 'getSchemas', async () => [
            { id: 'schema-1', name: 'Draft One', status: SchemaStatus.DRAFT },
            { id: 'schema-2', name: 'Published One', status: SchemaStatus.PUBLISHED },
        ]);
        stub(DatabaseServer, 'removeSchemaTemplate', async (value) => {
            deleted.push(value);
        });

        const response = await callHandler(handlers, MessageAPI.DELETE_SCHEMA_TEMPLATE, {
            id: 'template-1',
            owner
        });

        assert.equal(ok(response), false);
        assert.match(response.error, /published schemas and cannot be deleted/);
        assert.match(response.error, /Published One/, 'the owner is told what to resolve');
        assert.deepEqual(deleted, [], 'the template must survive the refusal');
    });

    it('DELETE_SCHEMA_TEMPLATE still removes a template whose schemas are all unpublished', async () => {
        const deleted = [];
        const removedSchemas = [];
        const fakeDb = {
            getSchemaTemplateById: async () => ({
                id: 'template-1',
                owner: owner.owner,
                status: ModuleStatus.PUBLISH_ERROR,
                topicId: '0.0.20'
            }),
            getPolicies: async () => [],
            getSchemas: async () => [
                { id: 'schema-1', name: 'Draft One', status: SchemaStatus.DRAFT },
                { id: 'schema-2', name: 'Errored One', status: SchemaStatus.ERROR },
            ],
            removeSchemaTemplate: async (value) => { deleted.push(value); },
        };

        const { handlers: isolated } = await loadAPI(
            '../dist/api/schema-template.service.js',
            'schemaTemplatesAPI',
            {
                '@guardian/common': {
                    DatabaseServer: fakeDb,
                    NewNotifier: Object.assign(() => {}, { empty: () => ({}) }),
                },
                [importHelpersPath]: {
                    createSchemaAndArtifacts: async () => ({}),
                    deleteSchema: async (id) => { removedSchemas.push(id); },
                    SchemaImportExportHelper: class {},
                    updateSchemaDefs: async () => {}
                }
            }
        );

        const response = await isolated[MessageAPI.DELETE_SCHEMA_TEMPLATE]({
            id: 'template-1',
            owner
        });

        assert.equal(ok(response), true);
        assert.equal(deleted.length, 1);
        assert.deepEqual(removedSchemas, ['schema-1', 'schema-2'],
            'the guard must not stop the ordinary cleanup');
    });

    it('DELETE_SCHEMA_TEMPLATE rejects when the template is applied to a policy', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
            id: 'template-1',
            owner: owner.owner,
            status: ModuleStatus.DRAFT,
            topicId: null
        }));
        stub(DatabaseServer, 'getPolicies', async () => [
            { id: 'policy-1', name: 'Active Policy', schemaTemplate: { templateId: 'template-1' } }
        ]);

        const response = await callHandler(handlers, MessageAPI.DELETE_SCHEMA_TEMPLATE, {
            id: 'template-1',
            owner
        });

        assert.equal(ok(response), false);
        assert.match(response.error, /cannot be deleted/);
    });
});

describe('APPLY_SCHEMA_TEMPLATE success path', () => {
    const templateSchema = {
        id: 'ts-1',
        templateSchemaId: 'tpl-schema-1',
        iri: '#ts-uuid&1.0.0',
        uuid: 'ts-uuid',
        name: 'Site',
        topicId: '0.0.20',
        category: SchemaCategory.TEMPLATE,
        document: {
            $id: '#ts-uuid&1.0.0',
            type: 'object',
            properties: {
                field_1: { title: 'F', description: 'F', type: 'string', templateFieldId: 'tpl-field-1' }
            },
            required: [],
            additionalProperties: false
        }
    };
    const copiedSchema = {
        id: 'ps-1',
        templateSchemaId: 'tpl-schema-1',
        iri: '#copy-uuid&1.0.0',
        document: templateSchema.document
    };

    it('creates snapshot with state hash and sets policy binding', async () => {
        let savedSnapshot = null;
        let updatedPolicy = null;

        const fakeDb = {
            getSchemaTemplateById: async () => ({
                id: 'template-1',
                uuid: 'tpl-uuid',
                name: 'My Template',
                version: '1.0.0',
                owner: owner.owner,
                status: ModuleStatus.DRAFT,
                topicId: '0.0.20',
                messageId: 'msg-1',
                config: { schemas: {} }
            }),
            getPolicyById: async () => ({
                id: 'policy-1',
                uuid: 'pol-uuid',
                owner: owner.owner,
                topicId: '0.0.10',
                status: PolicyStatus.DRAFT,
                schemaTemplate: null
            }),
            getSchemas: async () => [templateSchema],
            updateSchema: async () => null,
            saveSchemaTemplateSnapshot: async (s) => { savedSnapshot = s; return { ...s, id: 'snap-1' }; },
            updatePolicy: async (p) => { updatedPolicy = p; return p; },
        };

        const { handlers } = await loadAPI(
            '../dist/api/schema-template.service.js',
            'schemaTemplatesAPI',
            {
                '@guardian/common': {
                    DatabaseServer: fakeDb,
                    NewNotifier: Object.assign(() => {}, { empty: () => ({}) }),
                },
                [importHelpersPath]: {
                    createSchemaAndArtifacts: async () => copiedSchema,
                    deleteSchema: async () => {},
                    SchemaImportExportHelper: class {},
                    updateSchemaDefs: async () => {}
                }
            }
        );

        const response = await handlers[MessageAPI.APPLY_SCHEMA_TEMPLATE]({
            templateId: 'template-1',
            policyId: 'policy-1',
            owner
        });

        assert.equal(ok(response), true);
        assert.ok(savedSnapshot, 'snapshot was not saved');
        assert.equal(typeof savedSnapshot.templateStateHash, 'string');
        assert.ok(savedSnapshot.templateStateHash.length > 0, 'state hash is empty');
        assert.equal(savedSnapshot.templateId, 'template-1');
        assert.deepEqual(savedSnapshot.schemaMap, { 'tpl-schema-1': 'ps-1' });

        assert.ok(updatedPolicy, 'policy was not updated');
        assert.equal(updatedPolicy.schemaTemplate.templateId, 'template-1');
        assert.equal(updatedPolicy.schemaTemplate.snapshotId, 'snap-1');
        assert.equal(updatedPolicy.schemaTemplate.templateStateHash, savedSnapshot.templateStateHash);
    });
});

/*
 * removeSchemaTemplateSnapshot was only ever called from this module's own
 * detach/update paths; none of the three policy delete flows called it. Deleting a
 * draft policy with a template applied left the snapshot row behind forever, along
 * with its two GridFS payloads - one orphan per apply/delete cycle.
 */
describe('removePolicySchemaTemplateSnapshot', () => {
    afterEach(() => restoreStubs());

    const arrange = (snapshot) => {
        const removed = [];
        stub(DatabaseServer, 'getSchemaTemplateSnapshotById', async () => snapshot);
        stub(DatabaseServer, 'removeSchemaTemplateSnapshot', async (value) => {
            removed.push(value);
        });
        return removed;
    };

    it('removes the snapshot a deleted policy was bound to', async () => {
        const snapshot = { id: 'snapshot-1' };
        const removed = arrange(snapshot);

        await removePolicySchemaTemplateSnapshot({
            id: 'policy-1',
            schemaTemplate: { templateId: 'template-1', snapshotId: 'snapshot-1' },
        });

        assert.deepEqual(removed, [snapshot]);
    });

    it('does nothing for a policy with no template applied', async () => {
        const removed = arrange({ id: 'snapshot-1' });

        await removePolicySchemaTemplateSnapshot({ id: 'policy-1' });
        await removePolicySchemaTemplateSnapshot(null);

        assert.deepEqual(removed, []);
    });

    it('does nothing when the snapshot is already gone', async () => {
        const removed = arrange(null);

        await removePolicySchemaTemplateSnapshot({
            schemaTemplate: { snapshotId: 'snapshot-1' },
        });

        assert.deepEqual(removed, []);
    });

    it('never fails the delete it is cleaning up after', async () => {
        stub(DatabaseServer, 'getSchemaTemplateSnapshotById', async () => {
            throw new Error('database is down');
        });
        const logged = [];

        await assert.doesNotReject(() => removePolicySchemaTemplateSnapshot(
            { schemaTemplate: { snapshotId: 'snapshot-1' } },
            { error: async (error) => { logged.push(error); } }
        ));

        assert.equal(logged.length, 1, 'the failure is logged rather than swallowed silently');
    });
});

/*
 * Normalization assigns any missing templateSchemaId / templateFieldId values.
 * It used to persist them from wherever it ran - including GET and export, which
 * any user with TEMPLATES_TEMPLATE_READ can call on a published template. A
 * non-owner's read therefore mutated the owner's schema documents, and two
 * concurrent readers stored different random ids for the same field. The ids are
 * still filled in memory, so responses are unchanged; only writers persist them.
 */
describe('schema template reads must not write', () => {
    let handlers;

    beforeEach(async () => {
        handlers = await register(schemaTemplatesAPI, silentLogger());
    });

    afterEach(() => restoreStubs());

    const arrangeRead = () => {
        const writes = [];
        // no templateSchemaId, and a field with no templateFieldId: exactly what
        // normalization wants to fill in
        const schema = {
            id: 'tpl-schema-1',
            iri: '#Alpha',
            topicId: '0.0.20',
            category: SchemaCategory.TEMPLATE,
            templateId: 'template-1',
            document: { $id: '#Alpha', properties: { a: { type: 'string' } } },
        };
        stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
            id: 'template-1',
            name: 'Template',
            // published and owned by somebody else: the read is legitimate
            owner: 'did:other-owner',
            status: ModuleStatus.PUBLISHED,
            topicId: '0.0.20',
            config: { schemas: [] },
        }));
        stub(DatabaseServer, 'getSchemas', async () => [schema]);
        stub(DatabaseServer, 'updateSchema', async (id, value) => {
            writes.push({ id, value });
            return value;
        });
        return { writes, schema };
    };

    it('GET_SCHEMA_TEMPLATE does not persist the ids it fills in', async () => {
        const { writes, schema } = arrangeRead();

        const response = await handlers[MessageAPI.GET_SCHEMA_TEMPLATE]({
            id: 'template-1',
            owner,
        });

        assert.equal(ok(response), true);
        assert.ok(schema.templateSchemaId,
            'normalization did not run, so this test proves nothing');
        assert.ok(schema.document.properties.a.templateFieldId,
            'field ids must still be filled in memory, or the response changes');
        assert.deepEqual(writes, [],
            'a read on a published template wrote to the owner\'s schemas');
    });

    it('SCHEMA_TEMPLATE_EXPORT_FILE does not persist them either', async () => {
        const { writes, schema } = arrangeRead();

        await handlers[MessageAPI.SCHEMA_TEMPLATE_EXPORT_FILE]({
            id: 'template-1',
            owner,
        });

        assert.ok(schema.templateSchemaId,
            'normalization did not run, so this test proves nothing');
        assert.deepEqual(writes, [], 'export is a read');
    });
});

/*
 * usedByPolicyNames is built from the *template owner's* policies, drafts
 * included, while the listing is visible to every user with
 * TEMPLATES_TEMPLATE_READ. Returning the names to everyone disclosed another
 * Standard Registry's private draft-policy names. The count stays public: it says
 * how widely a template is used without naming anything.
 */
describe('GET_SCHEMA_TEMPLATES usedByPolicyNames', () => {
    let handlers;

    beforeEach(async () => {
        handlers = await register(schemaTemplatesAPI, silentLogger());
    });

    afterEach(() => restoreStubs());

    const arrangeList = (templateOwner) => {
        stub(DatabaseServer, 'getSchemaTemplatesAndCount', async () => [[{
            id: 'template-1',
            name: 'Template',
            owner: templateOwner,
            status: ModuleStatus.PUBLISHED,
            topicId: '0.0.20',
        }], 1]);
        stub(DatabaseServer, 'getPolicies', async () => [
            { id: 'policy-1', name: 'Secret Draft', schemaTemplate: { templateId: 'template-1' } },
        ]);
        stub(DatabaseServer, 'getSchemasCount', async () => 3);
    };

    it('withholds the names from a user who does not own the template', async () => {
        arrangeList('did:other-owner');

        const response = await handlers[MessageAPI.GET_SCHEMA_TEMPLATES]({ owner });
        const [item] = response.body.items;

        assert.deepEqual(item.usedByPolicyNames, [],
            'another registry\'s draft-policy names must not be disclosed');
        assert.equal(item.usedByPoliciesCount, 1,
            'the count is not sensitive and stays');
    });

    it('returns them to the owner', async () => {
        arrangeList(owner.owner);

        const response = await handlers[MessageAPI.GET_SCHEMA_TEMPLATES]({ owner });
        const [item] = response.body.items;

        assert.deepEqual(item.usedByPolicyNames, ['Secret Draft']);
        assert.equal(item.usedByPoliciesCount, 1);
    });
});

/*
 * configFileId has the _configFileId "previous handle" mechanism on the entity,
 * cleaned up by its @AfterUpdate hook. contentFileId had no equivalent, so every
 * publish attempt overwrote the handle and stranded the file it replaced - a
 * permanent GridFS orphan per re-publish.
 */
describe('PUBLISH_SCHEMA_TEMPLATE content file', () => {
    const stepNotifier = () => ({
        addStep() {}, start() {}, startStep() {}, completeStep() {}, complete() {},
        fail() {}, result() {}, getStep() { return stepNotifier(); },
    });

    const publishHandlers = async (template, gridFsDeletes) => {
        const fakeDb = {
            getSchemaTemplateById: async () => template,
            getSchemaTemplates: async () => [],
            getSchemas: async () => [],
            updateSchemas: async () => {},
            updateSchemaTemplate: async (value) => value,
            getTopicById: async () => ({ topicId: '0.0.20' }),
            saveFile: async () => 'content-file-2',
        };
        const { handlers } = await loadAPI(
            '../dist/api/schema-template.service.js',
            'schemaTemplatesAPI',
            {
                '@guardian/common': {
                    DatabaseServer: fakeDb,
                    DataBaseHelper: {
                        gridFS: { delete: async (id) => { gridFsDeletes.push(id); } },
                    },
                    NewNotifier: Object.assign(() => {}, { empty: () => stepNotifier() }),
                    Users: class { async getHederaAccount() { return {}; } },
                    TopicConfig: { fromObject: async () => ({}) },
                    MessageServer: class {
                        setTopicObject() { return this; }
                        async sendMessage() { return { getId: () => 'message-1' }; }
                    },
                    SchemaTemplateImportExport: {
                        generate: async () => ({ generateAsync: async () => new ArrayBuffer(8) }),
                    },
                },
                [importHelpersPath]: {
                    createSchemaAndArtifacts: async () => ({}),
                    deleteSchema: async () => {},
                    SchemaImportExportHelper: class {},
                    updateSchemaDefs: async () => {}
                }
            }
        );
        return handlers;
    };

    it('deletes the package the previous publish attempt left behind', async () => {
        const gridFsDeletes = [];
        const template = {
            id: 'template-1',
            owner: owner.owner,
            status: ModuleStatus.PUBLISH_ERROR,
            topicId: '0.0.20',
            contentFileId: 'content-file-1',
            config: { schemas: {} },
        };

        const handlers = await publishHandlers(template, gridFsDeletes);
        const response = await handlers[MessageAPI.PUBLISH_SCHEMA_TEMPLATE]({
            id: 'template-1',
            owner,
            body: { templateVersion: '1.0.0' },
        });

        assert.equal(ok(response), true, response.error);
        assert.equal(template.contentFileId, 'content-file-2', 'the new package is stored');
        assert.deepEqual(gridFsDeletes, ['content-file-1'],
            'the superseded package must not be left in GridFS forever');
    });

    it('deletes nothing on a first publish', async () => {
        const gridFsDeletes = [];
        const template = {
            id: 'template-1',
            owner: owner.owner,
            status: ModuleStatus.DRAFT,
            topicId: '0.0.20',
            config: { schemas: {} },
        };

        const handlers = await publishHandlers(template, gridFsDeletes);
        await handlers[MessageAPI.PUBLISH_SCHEMA_TEMPLATE]({
            id: 'template-1',
            owner,
            body: { templateVersion: '1.0.0' },
        });

        assert.deepEqual(gridFsDeletes, []);
    });
});
