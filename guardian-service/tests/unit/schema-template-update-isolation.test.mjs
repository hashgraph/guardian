import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MessageAPI, ModuleStatus, PolicyStatus, SchemaCategory } from '@guardian/interfaces';
import {
    buildTemplateSchemasSnapshot,
} from '../../dist/api/schema-template.service.js';
import {
    DatabaseServer,
    loadAPI,
    ok,
} from '../_handler-harness.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const importHelpersPath = path.resolve(__dirname, '../../dist/helpers/import-helpers/index.js');

/*
 * Every existing UPDATE_APPLIED_SCHEMA_TEMPLATE test either rejects the update or
 * runs against a policy with a single binding, so "update one of two applied
 * templates and confirm only that binding/snapshot/schema changes" - the case that
 * would have caught the filter().concat() reordering hazard fixed in step 3 - was
 * not pinned by anything. This drives the real handler against a policy bound to
 * two templates and asserts the untouched template's binding, snapshot, and policy
 * schema all survive verbatim.
 */

const owner = {
    id: 'user-1',
    owner: 'did:owner',
    creator: 'did:owner-creator',
};

const binding = (templateId, overrides = {}) => ({
    templateId,
    templateName: `Template ${templateId}`,
    templateVersion: '1.0.0',
    templateStatus: ModuleStatus.DRAFT,
    templateStateHash: `hash-${templateId}`,
    snapshotId: `snapshot-${templateId}`,
    appliedAt: '2026-01-01T00:00:00.000Z',
    schemaMap: { [`tsid-${templateId}`]: `policy-schema-${templateId}` },
    ...overrides,
});

const policy = (overrides = {}) => ({
    id: 'policy-1',
    uuid: 'policy-uuid',
    owner: owner.owner,
    topicId: '0.0.10',
    status: PolicyStatus.DRAFT,
    schemaTemplates: [],
    ...overrides,
});

const template = (id, overrides = {}) => ({
    id,
    uuid: `${id}-uuid`,
    name: `Template ${id}`,
    version: '1.0.0',
    owner: owner.owner,
    status: ModuleStatus.DRAFT,
    topicId: '0.0.20',
    messageId: `msg-${id}`,
    config: { schemas: {} },
    ...overrides,
});

const templateSchema = (templateId, name) => ({
    id: `ts-${templateId}-${name}`,
    templateId,
    templateSchemaId: `tsid-${templateId}`,
    iri: `#${templateId}-${name}&1.0.0`,
    uuid: `${templateId}-${name}-uuid`,
    name,
    topicId: '0.0.20',
    category: SchemaCategory.TEMPLATE,
    document: {
        $id: `#${templateId}-${name}&1.0.0`,
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
    },
});

const policySchema = (id, name, templateId = '') => ({
    id,
    name,
    templateId,
    templateSchemaId: templateId ? `tsid-${templateId}` : '',
    topicId: '0.0.10',
    category: SchemaCategory.POLICY,
    document: { $id: `#${id}`, type: 'object', properties: {} },
});

describe('multi-template: UPDATE_APPLIED_SCHEMA_TEMPLATE isolation between two bindings', () => {
    it('updating template-1 leaves template-2\'s binding, snapshot and schema untouched', async () => {
        const ts1 = templateSchema('template-1', 'Project Description');
        const ps1 = policySchema('policy-schema-template-1', 'Project Description', 'template-1');
        const ps2 = policySchema('policy-schema-template-2', 'Monitoring Report', 'template-2');
        const binding1 = binding('template-1');
        const binding2 = binding('template-2');
        const policyRow = policy({ schemaTemplates: [binding1, binding2] });

        const updatedSchemaCalls = [];
        const removedSnapshots = [];
        const savedSnapshots = [];
        let updatedPolicy = null;

        const snapshotById = {
            'snapshot-template-1': {
                id: 'snapshot-template-1',
                config: { schemas: {} },
                schemas: buildTemplateSchemasSnapshot([ts1]),
            },
            'snapshot-template-2': {
                id: 'snapshot-template-2',
                config: { schemas: {} },
                schemas: buildTemplateSchemasSnapshot([templateSchema('template-2', 'Monitoring Report')]),
            },
        };

        const fakeDb = {
            getSchemaTemplateById: async (id) => template(id),
            getPolicyById: async () => policyRow,
            getSchemas: async (filter) => (filter.category === SchemaCategory.TEMPLATE
                ? [ts1]
                : [ps1, ps2]),
            getSchemasCount: async () => 0,
            getSchemaTemplateSnapshotById: async (id) => snapshotById[id],
            updateSchema: async (id, item) => {
                updatedSchemaCalls.push(id);
                return item;
            },
            saveSchemaTemplateSnapshot: async (snapshot) => {
                const saved = { ...snapshot, id: `snap-new-${savedSnapshots.length + 1}` };
                savedSnapshots.push(saved);
                return saved;
            },
            removeSchemaTemplateSnapshot: async (snapshot) => {
                removedSnapshots.push(snapshot.id);
            },
            updatePolicy: async (item) => {
                updatedPolicy = item;
                return item;
            },
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
                    createSchemaAndArtifacts: async () => {
                        throw new Error('template-1\'s only schema is already mapped; this update must not add one');
                    },
                    deleteSchema: async () => {},
                    SchemaImportExportHelper: class {},
                    updateSchemaDefs: async () => {},
                },
            }
        );

        const response = await handlers[MessageAPI.UPDATE_APPLIED_SCHEMA_TEMPLATE]({
            templateId: 'template-1',
            policyId: 'policy-1',
            owner,
            options: {},
        });

        assert.equal(ok(response), true, response && response.error);

        assert.ok(!updatedSchemaCalls.includes('policy-schema-template-2'),
            'updating template-1 must never touch template-2\'s policy schema');
        assert.ok(updatedSchemaCalls.includes('policy-schema-template-1'),
            'template-1\'s own mapped schema must have been updated');

        assert.deepEqual(removedSnapshots, ['snapshot-template-1'],
            'only template-1\'s superseded snapshot may be removed');

        assert.equal(savedSnapshots.length, 1);
        assert.equal(savedSnapshots[0].templateId, 'template-1');

        assert.equal(updatedPolicy.schemaTemplates.length, 2,
            'the update must replace one binding in place, not drop or duplicate the other');
        const [first, second] = updatedPolicy.schemaTemplates;
        assert.equal(first.templateId, 'template-1');
        assert.notEqual(first.snapshotId, binding1.snapshotId,
            'template-1\'s binding must point at the new snapshot');
        assert.deepEqual(second, binding2,
            'template-2\'s binding must survive byte-for-byte, including its old snapshotId');
    });
});
