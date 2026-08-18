import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MessageAPI, ModuleStatus, PolicyStatus, SchemaCategory } from '@guardian/interfaces';
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
