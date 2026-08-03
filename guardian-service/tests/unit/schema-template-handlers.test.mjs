import assert from 'node:assert/strict';
import { MessageAPI, ModuleStatus, PolicyStatus, SchemaCategory } from '@guardian/interfaces';
import { schemaTemplatesAPI } from '../../dist/api/schema-template.service.js';
import {
    callHandler,
    DatabaseServer,
    ok,
    register,
    restoreStubs,
    silentLogger,
    stub,
} from '../_handler-harness.mjs';

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
