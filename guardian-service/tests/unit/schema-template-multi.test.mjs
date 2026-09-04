import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MessageAPI, ModuleStatus, PolicyStatus, SchemaCategory, SchemaStatus } from '@guardian/interfaces';
import {
    buildTemplateSchemasSnapshot,
    removePolicySchemaTemplateSnapshot,
    schemaTemplatesAPI,
    validateSchemaNameCollisions,
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

/*
 * Multi-template support (issue #6711).
 *
 * A policy used to hold at most one schema template. It now holds a list, and
 * every operation names the template it acts on: apply appends, update replaces
 * one entry, detach removes one entry. These are the cases that distinguish
 * "a list of bindings" from "a list that only ever holds one".
 *
 * Written before the implementation, so a failure here is a step that has not
 * landed yet rather than a regression.
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

/** A template-owned schema, as stored in the template's own topic. */
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

/** A schema already copied into the policy's topic. */
const policySchema = (id, name, templateId = '') => ({
    id,
    name,
    templateId,
    templateSchemaId: templateId ? `tsid-${templateId}` : '',
    topicId: '0.0.10',
    category: SchemaCategory.POLICY,
    document: { $id: `#${id}`, type: 'object', properties: {} },
});

describe('multi-template: APPLY_SCHEMA_TEMPLATE', () => {
    let state;

    beforeEach(() => {
        state = { updatedPolicy: null, savedSnapshots: [], removedSnapshots: [] };
    });

    /*
     * Apply copies schemas through the import helpers, so this suite loads the
     * service under esmock (rather than the real-module harness) to keep
     * createSchemaAndArtifacts out of the picture.
     */
    let apply;

    /**
     * @param policyRow    the policy the apply runs against
     * @param templateRows every template the database knows, by id
     * @param schemasFor   filter -> schema rows
     */
    const arrange = async (policyRow, templateRows, schemasFor) => {
        let copied = 0;
        const fakeDb = {
            getSchemaTemplateById: async (id) => templateRows[id] || null,
            getPolicyById: async () => policyRow,
            getPolicy: async () => policyRow,
            getSchemas: async (filter) => schemasFor(filter),
            getSchemasCount: async () => 0,
            updateSchema: async () => null,
            saveSchemaTemplateSnapshot: async (snapshot) => {
                const saved = { ...snapshot, id: `snap-${state.savedSnapshots.length + 1}` };
                state.savedSnapshots.push(saved);
                return saved;
            },
            removeSchemaTemplateSnapshot: async (snapshot) => {
                state.removedSnapshots.push(snapshot);
            },
            getSchemaTemplateSnapshotById: async (id) => ({ id, config: { schemas: {} } }),
            updatePolicy: async (item) => {
                state.updatedPolicy = item;
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
                    createSchemaAndArtifacts: async (_category, copy) => {
                        copied++;
                        return {
                            id: `ps-${copied}`,
                            name: copy.name,
                            templateSchemaId: copy.templateSchemaId,
                            iri: `#copy-${copied}&1.0.0`,
                            document: copy.document,
                        };
                    },
                    deleteSchema: async () => {},
                    SchemaImportExportHelper: class {},
                    updateSchemaDefs: async () => {},
                },
            }
        );

        apply = (templateId) => handlers[MessageAPI.APPLY_SCHEMA_TEMPLATE]({
            templateId,
            policyId: 'policy-1',
            owner,
        });
    };

    it('appends a second, distinct template instead of rejecting it', async () => {
        const existing = binding('template-1');
        await arrange(
            policy({ schemaTemplates: [existing] }),
            { 'template-2': template('template-2') },
            (filter) => (filter.category === SchemaCategory.TEMPLATE
                ? [templateSchema('template-2', 'Monitoring Report')]
                : [policySchema('policy-schema-template-1', 'Project Description', 'template-1')]),
        );

        const response = await apply('template-2');

        assert.equal(ok(response), true, response && response.error);
        assert.equal(state.updatedPolicy.schemaTemplates.length, 2,
            'applying a second template must add a binding, not replace the first');
        assert.equal(state.updatedPolicy.schemaTemplates[0].templateId, 'template-1',
            'the template that was already applied keeps its place');
        assert.equal(state.updatedPolicy.schemaTemplates[1].templateId, 'template-2');
    });

    it('leaves the first binding untouched when the second is applied', async () => {
        const existing = binding('template-1');
        await arrange(
            policy({ schemaTemplates: [existing] }),
            { 'template-2': template('template-2') },
            (filter) => (filter.category === SchemaCategory.TEMPLATE
                ? [templateSchema('template-2', 'Monitoring Report')]
                : []),
        );

        const response = await apply('template-2');

        assert.equal(ok(response), true, response && response.error);
        assert.deepEqual(state.updatedPolicy.schemaTemplates[0], existing,
            'the existing binding, including its snapshot, must survive verbatim');
    });

    it('still rejects re-applying a template the policy already has', async () => {
        await arrange(
            policy({ schemaTemplates: [binding('template-1')] }),
            { 'template-1': template('template-1') },
            () => [templateSchema('template-1', 'Project Description')],
        );

        const response = await apply('template-1');

        assert.equal(ok(response), false, 'the same template must not be applied twice');
        assert.match(response.error, /already applied/i);
    });

    it('rejects a template whose schema name collides with a schema already in the policy', async () => {
        await arrange(
            policy(),
            { 'template-1': template('template-1') },
            (filter) => (filter.category === SchemaCategory.TEMPLATE
                ? [templateSchema('template-1', 'Project Description')]
                : [policySchema('existing-1', 'Project Description')]),
        );

        const response = await apply('template-1');

        assert.equal(ok(response), false,
            'a colliding schema name must not silently produce a duplicate');
        assert.match(response.error, /Project Description/,
            'the error must name the colliding schema');
    });

    it('rejects a template whose schema name collides with another applied template', async () => {
        await arrange(
            policy({ schemaTemplates: [binding('template-1')] }),
            { 'template-2': template('template-2') },
            (filter) => (filter.category === SchemaCategory.TEMPLATE
                ? [templateSchema('template-2', 'Project Description')]
                : [policySchema('policy-schema-template-1', 'Project Description', 'template-1')]),
        );

        const response = await apply('template-2');

        assert.equal(ok(response), false,
            'two templates defining the same schema name must not collide unnoticed');
        assert.match(response.error, /Project Description/);
    });

    /*
     * Detach does not delete the copied schemas, it only clears their markers, so
     * they stay in the policy under the template's names. Advising a detach when the
     * colliding schema is unbound would send the user round the loop they are
     * already in - the detach they just did is what created the collision.
     */
    it('says to rename an unbound schema rather than to detach something', async () => {
        await arrange(
            policy(),
            { 'template-1': template('template-1') },
            (filter) => (filter.category === SchemaCategory.TEMPLATE
                ? [templateSchema('template-1', 'Project Description')]
                : [policySchema('leftover-1', 'Project Description')]),
        );

        const response = await apply('template-1');

        assert.equal(ok(response), false);
        assert.match(response.error, /rename or delete/i,
            'an unbound schema is freed by renaming it, not by detaching a template');
        assert.doesNotMatch(response.error, /detach/i);
    });

    it('names the applied template to detach when one owns the colliding name', async () => {
        await arrange(
            policy({ schemaTemplates: [binding('template-1')] }),
            { 'template-2': template('template-2') },
            (filter) => (filter.category === SchemaCategory.TEMPLATE
                ? [templateSchema('template-2', 'Project Description')]
                : [policySchema('policy-schema-template-1', 'Project Description', 'template-1')]),
        );

        const response = await apply('template-2');

        assert.equal(ok(response), false);
        assert.match(response.error, /detach/i);
        assert.match(response.error, /Template template-1/,
            'the user has to be told which of the applied templates to detach');
    });

    it('names every colliding schema, not just the first', async () => {
        await arrange(
            policy(),
            { 'template-1': template('template-1') },
            (filter) => (filter.category === SchemaCategory.TEMPLATE
                ? [templateSchema('template-1', 'Site'), templateSchema('template-1', 'Report')]
                : [policySchema('existing-1', 'Site'), policySchema('existing-2', 'Report')]),
        );

        const response = await apply('template-1');

        assert.equal(ok(response), false);
        assert.match(response.error, /Site/);
        assert.match(response.error, /Report/);
    });

    it('applies a template whose schema names do not collide', async () => {
        await arrange(
            policy({ schemaTemplates: [binding('template-1')] }),
            { 'template-2': template('template-2') },
            (filter) => (filter.category === SchemaCategory.TEMPLATE
                ? [templateSchema('template-2', 'Monitoring Report')]
                : [policySchema('policy-schema-template-1', 'Project Description', 'template-1')]),
        );

        const response = await apply('template-2');

        assert.equal(ok(response), true, response && response.error);
    });
});

/*
 * Issue #6711, step 8. validateSchemaNameCollisions used to be called only from
 * applySchemaTemplate. updateAppliedSchemaTemplate's SCHEMA_ADD path copied new
 * schemas through createSchemaAndArtifacts with no collision check at all, so
 * updating one applied template could introduce a name already owned by another
 * applied template or an ordinary policy schema - exactly what the apply-time
 * check exists to prevent. These exercise the shared validator the same way the
 * update path calls it.
 *
 * `excludeSchemaIds` used to be `excludeTemplateId`, which excluded every schema
 * belonging to the template being updated - not just the ones actually vacating
 * their current name. That let a rename (or an add) silently land on an unchanged
 * sibling schema from the same template: both ended up with the same name in the
 * policy, exactly the ambiguity this whole check exists to prevent. Narrowed to
 * the specific policy schema ids about to change identity.
 */
describe('multi-template: schema name collisions on update (validateSchemaNameCollisions)', () => {
    afterEach(() => restoreStubs());

    it('still catches a collision with a different applied template', async () => {
        stub(DatabaseServer, 'getSchemas', async () => [
            policySchema('policy-schema-template-1', 'Site', 'template-1'),
            policySchema('policy-schema-template-2', 'Monitoring Report', 'template-2'),
        ]);

        const targetPolicy = policy({
            schemaTemplates: [binding('template-1'), binding('template-2')],
        });

        await assert.rejects(
            validateSchemaNameCollisions(
                template('template-1'),
                targetPolicy,
                [{ name: 'Monitoring Report' }],
            ),
            /Monitoring Report/,
            'a new schema added by updating template-1 must still collide with template-2\'s schema',
        );
    });

    it('still rejects a new schema that collides with an unchanged sibling of the same template', async () => {
        stub(DatabaseServer, 'getSchemas', async () => [
            policySchema('policy-schema-template-1', 'Site', 'template-1'),
        ]);

        const targetPolicy = policy({
            schemaTemplates: [binding('template-1')],
        });

        await assert.rejects(
            validateSchemaNameCollisions(
                template('template-1'),
                targetPolicy,
                [{ name: 'Site' }],
            ),
            /Site/,
            'the added schema would share a name with an untouched sibling from the same template - a real collision',
        );
    });

    it('excludes only the schema actually being renamed, not its whole template', async () => {
        stub(DatabaseServer, 'getSchemas', async () => [
            policySchema('policy-schema-template-1', 'Site', 'template-1'),
            policySchema('policy-schema-template-2', 'Region', 'template-1'),
        ]);

        const targetPolicy = policy({
            schemaTemplates: [binding('template-1')],
        });

        // policy-schema-template-2 is being renamed to "Site"; policy-schema-template-1
        // ("Site") is an untouched sibling and must still block the collision.
        await assert.rejects(
            validateSchemaNameCollisions(
                template('template-1'),
                targetPolicy,
                [{ name: 'Site' }],
                new Set(['policy-schema-template-2']),
            ),
            /Site/,
            'excluding the renamed schema itself must not also exempt its unrelated sibling',
        );

        // With the sibling itself excluded too (e.g. it is being renamed away in the
        // same update), the same new name must not be flagged as a self-collision.
        await assert.doesNotReject(
            validateSchemaNameCollisions(
                template('template-1'),
                targetPolicy,
                [{ name: 'Site' }],
                new Set(['policy-schema-template-1', 'policy-schema-template-2']),
            ),
            'excluding both schemas (a name swap) must not flag either as colliding with itself',
        );
    });

    it('still rejects a collision with an ordinary policy schema', async () => {
        stub(DatabaseServer, 'getSchemas', async () => [
            policySchema('policy-schema-template-1', 'Site', 'template-1'),
            policySchema('plain-schema-1', 'Custom Report'),
        ]);

        const targetPolicy = policy({
            schemaTemplates: [binding('template-1')],
        });

        await assert.rejects(
            validateSchemaNameCollisions(
                template('template-1'),
                targetPolicy,
                [{ name: 'Custom Report' }],
            ),
            /Custom Report/,
        );
    });
});

describe('multi-template: DETACH_SCHEMA_TEMPLATE', () => {
    let handlers;
    let state;

    beforeEach(async () => {
        handlers = await register(schemaTemplatesAPI, silentLogger());
        state = { updatedPolicy: null, updatedSchemas: [], removedSnapshots: [] };
    });

    afterEach(() => restoreStubs());

    const arrange = (policyRow, schemaRows) => {
        stub(DatabaseServer, 'getPolicyById', async () => policyRow);
        stub(DatabaseServer, 'getSchemas', async () => schemaRows);
        stub(DatabaseServer, 'updateSchema', async (id, schema) => {
            state.updatedSchemas.push({ id, schema });
            return schema;
        });
        stub(DatabaseServer, 'getSchemaTemplateSnapshotById', async (id) => ({ id }));
        stub(DatabaseServer, 'removeSchemaTemplateSnapshot', async (snapshot) => {
            state.removedSnapshots.push(snapshot);
        });
        stub(DatabaseServer, 'updatePolicy', async (item) => {
            state.updatedPolicy = item;
            return item;
        });
    };

    const detach = (templateId, deleteSchemas) => callHandler(handlers, MessageAPI.DETACH_SCHEMA_TEMPLATE, {
        policyId: 'policy-1',
        templateId,
        owner,
        deleteSchemas,
    });

    const twoBindings = () => policy({
        schemaTemplates: [binding('template-1'), binding('template-2')],
    });

    const twoTemplatesSchemas = () => [
        policySchema('policy-schema-template-1', 'Project Description', 'template-1'),
        policySchema('policy-schema-template-2', 'Monitoring Report', 'template-2'),
    ];

    it('removes only the named binding', async () => {
        arrange(twoBindings(), twoTemplatesSchemas());

        const response = await detach('template-2');

        assert.equal(ok(response), true, response && response.error);
        assert.equal(state.updatedPolicy.schemaTemplates.length, 1);
        assert.equal(state.updatedPolicy.schemaTemplates[0].templateId, 'template-1',
            'detaching one template must not take the other with it');
    });

    it('detaches the named template rather than whichever is first', async () => {
        arrange(twoBindings(), twoTemplatesSchemas());

        const response = await detach('template-2');

        assert.equal(response.body.templateId, 'template-2',
            'the report must name the template that was actually detached');
    });

    it('clears template metadata only on the detached template schemas', async () => {
        arrange(twoBindings(), twoTemplatesSchemas());

        await detach('template-2');

        assert.equal(state.updatedSchemas.length, 1,
            'the other template schemas must keep their markers');
        assert.equal(state.updatedSchemas[0].id, 'policy-schema-template-2');
        assert.equal(state.updatedSchemas[0].schema.templateId, '');
    });

    it('removes only the detached binding snapshot', async () => {
        arrange(twoBindings(), twoTemplatesSchemas());

        await detach('template-2');

        assert.deepEqual(state.removedSnapshots, [{ id: 'snapshot-template-2' }],
            'the surviving binding must keep its snapshot');
    });

    it('rejects a template that is not applied to the policy', async () => {
        arrange(twoBindings(), twoTemplatesSchemas());

        const response = await detach('template-3');

        assert.equal(ok(response), false,
            'detaching a template the policy never had must not silently detach another');
        assert.match(response.error, /not applied/i);
    });

    it('rejects a detach that names no template', async () => {
        arrange(twoBindings(), twoTemplatesSchemas());

        const response = await detach(undefined);

        assert.equal(ok(response), false,
            'with several bindings, an unnamed detach is ambiguous and must not guess');
    });

    it('also deletes the bound schemas when deleteSchemas is true', async () => {
        arrange(twoBindings(), twoTemplatesSchemas());
        const deleted = [];
        stub(DatabaseServer, 'getSchema', async (id) => ({ id, status: SchemaStatus.DRAFT }));
        stub(DatabaseServer, 'deleteSchemas', async (id) => { deleted.push(id); });

        const response = await detach('template-2', true);

        assert.equal(ok(response), true, response && response.error);
        assert.deepEqual(deleted, ['policy-schema-template-2']);
        assert.equal(response.body.deletedSchemas, 1);
        assert.deepEqual(response.body.deleteErrors, []);
    });

    it('reports a schema that cannot be deleted without failing the detach', async () => {
        arrange(twoBindings(), twoTemplatesSchemas());
        const deleted = [];
        stub(DatabaseServer, 'getSchema', async () => ({ id: 'policy-schema-template-2', status: SchemaStatus.PUBLISHED }));
        stub(DatabaseServer, 'deleteSchemas', async (id) => { deleted.push(id); });

        const response = await detach('template-2', true);

        assert.equal(ok(response), true,
            'a schema that cannot be deleted must not fail the detach itself');
        assert.equal(deleted.length, 0);
        assert.equal(response.body.deletedSchemas, 0);
        assert.equal(response.body.detachedSchemas, 1,
            'the schema is still detached (markers cleared) even though it could not be deleted');
        assert.equal(response.body.deleteErrors.length, 1);
        assert.match(response.body.deleteErrors[0], /Monitoring Report/);
    });
});

describe('multi-template: UPDATE_APPLIED_SCHEMA_TEMPLATE', () => {
    let handlers;

    beforeEach(async () => {
        handlers = await register(schemaTemplatesAPI, silentLogger());
    });

    afterEach(() => restoreStubs());

    it('rejects an update for a template that is not applied', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async () => template('template-3'));
        stub(DatabaseServer, 'getPolicyById', async () => policy({
            schemaTemplates: [binding('template-1'), binding('template-2')],
        }));

        const response = await callHandler(handlers, MessageAPI.UPDATE_APPLIED_SCHEMA_TEMPLATE, {
            templateId: 'template-3',
            policyId: 'policy-1',
            owner,
            options: {},
        });

        assert.equal(ok(response), false,
            'the templateId must be checked against the bindings, not accepted blindly');
        assert.match(response.error, /not applied|no applied/i);
    });
});

/*
 * The collision guard added for step 8 originally only covered SCHEMA_ADD (a
 * newly-copied schema). preparePolicySchemaUpdate can also rename an
 * already-mapped policy schema in place, when the template schema's own name
 * changed and the per-schema config has schemaSettingsLocked - a template-side
 * rename reaching the policy through an entirely different path, with no
 * collision check at all until this was fixed alongside it.
 */
describe('multi-template: UPDATE_APPLIED_SCHEMA_TEMPLATE - rename-in-place collisions', () => {
    let update;

    /**
     * @param templateRow    the template being updated, with its per-schema config
     * @param policyRow      the policy the update runs against
     * @param policySchemas  every POLICY-category schema already in the policy topic
     * @param snapshotSchemas the snapshot's previous view of the template's schemas
     */
    const arrange = async (templateRow, policyRow, policySchemas, snapshotSchemas) => {
        const fakeDb = {
            getSchemaTemplateById: async () => templateRow,
            getPolicyById: async () => policyRow,
            getSchemas: async (filter) => (filter.category === SchemaCategory.TEMPLATE
                ? [templateSchema(templateRow.id, 'Location')]
                : policySchemas),
            getSchemasCount: async () => 0,
            getSchemaTemplateSnapshotById: async () => ({
                id: 'snap-existing',
                config: { schemas: {} },
                schemas: { schemas: snapshotSchemas },
            }),
            updateSchema: async (_id, item) => item,
            saveSchemaTemplateSnapshot: async (snapshot) => ({ ...snapshot, id: 'snap-new' }),
            removeSchemaTemplateSnapshot: async () => {},
            updatePolicy: async (item) => item,
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
                        throw new Error('this update only renames an already-mapped schema, it must not add one');
                    },
                    deleteSchema: async () => {},
                    SchemaImportExportHelper: class {},
                    updateSchemaDefs: async () => {},
                },
            }
        );

        update = () => handlers[MessageAPI.UPDATE_APPLIED_SCHEMA_TEMPLATE]({
            templateId: templateRow.id,
            policyId: 'policy-1',
            owner,
            options: {},
        });
    };

    it('rejects a template-driven rename that collides with an existing policy schema', async () => {
        const templateRow = template('template-1', {
            config: { schemas: { 'tsid-template-1': { schemaSettingsLocked: true } } },
        });
        const previousTemplateSchema = templateSchema('template-1', 'Site');
        const snapshotSchemas = buildTemplateSchemasSnapshot([previousTemplateSchema]).schemas;

        await arrange(
            templateRow,
            policy({
                schemaTemplates: [binding('template-1', {
                    schemaMap: { 'tsid-template-1': 'policy-schema-template-1' },
                })],
            }),
            [
                policySchema('policy-schema-template-1', 'Site', 'template-1'),
                policySchema('policy-schema-other', 'Location'),
            ],
            snapshotSchemas,
        );

        const response = await update();

        assert.equal(ok(response), false,
            'the template renamed its own schema to a name another policy schema already owns - ' +
            'the rename must not silently produce two schemas with the same name');
        assert.match(response.error, /Location/);
    });

    it('allows the rename when the new name is free', async () => {
        const templateRow = template('template-1', {
            config: { schemas: { 'tsid-template-1': { schemaSettingsLocked: true } } },
        });
        const previousTemplateSchema = templateSchema('template-1', 'Site');
        const snapshotSchemas = buildTemplateSchemasSnapshot([previousTemplateSchema]).schemas;

        await arrange(
            templateRow,
            policy({
                schemaTemplates: [binding('template-1', {
                    schemaMap: { 'tsid-template-1': 'policy-schema-template-1' },
                })],
            }),
            [policySchema('policy-schema-template-1', 'Site', 'template-1')],
            snapshotSchemas,
        );

        const response = await update();

        assert.equal(ok(response), true, response && response.error);
    });
});

describe('multi-template: GET_APPLIED_SCHEMA_TEMPLATE', () => {
    let handlers;

    beforeEach(async () => {
        handlers = await register(schemaTemplatesAPI, silentLogger());
    });

    afterEach(() => restoreStubs());

    const get = () => callHandler(handlers, MessageAPI.GET_APPLIED_SCHEMA_TEMPLATE, {
        topicId: '0.0.10',
        owner,
    });

    it('returns one entry per applied template', async () => {
        stub(DatabaseServer, 'getPolicy', async () => policy({
            schemaTemplates: [binding('template-1'), binding('template-2')],
        }));
        stub(DatabaseServer, 'getSchemaTemplateById', async (id) => template(id));
        stub(DatabaseServer, 'getSchemaTemplateSnapshotById', async (id) => ({
            id,
            config: { schemas: {} },
        }));

        const response = await get();

        assert.equal(ok(response), true, response && response.error);
        assert.ok(Array.isArray(response.body),
            'the editor needs every applied template to resolve its own locks');
        assert.deepEqual(response.body.map((item) => item.id), ['template-1', 'template-2']);
    });

    it('returns an empty list for a policy with no template applied', async () => {
        stub(DatabaseServer, 'getPolicy', async () => policy());

        const response = await get();

        assert.equal(ok(response), true, response && response.error);
        assert.deepEqual(response.body, []);
    });
});

describe('multi-template: policy delete cleanup', () => {
    afterEach(() => restoreStubs());

    it('removes the snapshot of every applied template', async () => {
        const removed = [];
        stub(DatabaseServer, 'getSchemaTemplateSnapshotById', async (id) => ({ id }));
        stub(DatabaseServer, 'removeSchemaTemplateSnapshot', async (snapshot) => {
            removed.push(snapshot);
        });

        await removePolicySchemaTemplateSnapshot(policy({
            schemaTemplates: [binding('template-1'), binding('template-2')],
        }));

        assert.deepEqual(
            removed.map((item) => item.id).sort(),
            ['snapshot-template-1', 'snapshot-template-2'],
            'deleting a policy must not strand the snapshots of its other templates'
        );
    });

    it('keeps cleaning up after one snapshot fails', async () => {
        const removed = [];
        stub(DatabaseServer, 'getSchemaTemplateSnapshotById', async (id) => {
            if (id === 'snapshot-template-1') {
                throw new Error('database is down');
            }
            return { id };
        });
        stub(DatabaseServer, 'removeSchemaTemplateSnapshot', async (snapshot) => {
            removed.push(snapshot);
        });

        await removePolicySchemaTemplateSnapshot(
            policy({ schemaTemplates: [binding('template-1'), binding('template-2')] }),
            { error: async () => {} }
        );

        assert.deepEqual(removed.map((item) => item.id), ['snapshot-template-2'],
            'one unreachable snapshot must not abandon the rest of the cleanup');
    });
});

/*
 * The membership check shared by getPoliciesUsingSchemaTemplate and addSchemaCounts
 * is covered by the delete guard below: it is the one place the check is reachable
 * without standing up the ORM, and it exercises a non-first binding.
 */
describe('multi-template: DELETE_SCHEMA_TEMPLATE guard', () => {
    let handlers;

    beforeEach(async () => {
        handlers = await register(schemaTemplatesAPI, silentLogger());
    });

    afterEach(() => restoreStubs());

    it('refuses to delete a template that is one of several applied to a policy', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async () => template('template-2', {
            topicId: null,
        }));
        stub(DatabaseServer, 'getPolicies', async () => [
            policy({ name: 'Active Policy', schemaTemplates: [binding('template-1'), binding('template-2')] }),
        ]);

        const response = await callHandler(handlers, MessageAPI.DELETE_SCHEMA_TEMPLATE, {
            id: 'template-2',
            owner,
        });

        assert.equal(ok(response), false,
            'a template in use must be protected even when it is not the first binding');
        assert.match(response.error, /cannot be deleted/i);
    });
});
