import assert from 'node:assert/strict';
import { ModuleStatus } from '@guardian/interfaces';
import { PolicyImport } from '../../dist/helpers/import-helpers/policy/policy-import.js';
import { DatabaseServer, PolicyImportExport } from '@guardian/common';
import { restoreStubs, stub } from '../_handler-harness.mjs';

/*
 * Multi-template import (issue #6711, step 5).
 *
 * Two things have to hold at once:
 *
 *  - a policy exported with several templates round-trips with all of them, each
 *    binding resolved (or detached) on its own;
 *  - a policy exported BEFORE this change still imports. Those files are frozen in
 *    the singular shape forever, and anything published to IPFS cannot be rewritten,
 *    so the importer has to read the legacy shape and normalise it. Getting this
 *    wrong does not raise an error, it silently drops the template binding, which is
 *    why it is pinned here.
 *
 * Written before the implementation. Where a test names a method that does not
 * exist yet, the name is a proposal from the design doc - rename the test with the
 * implementation if you choose differently.
 */

const owner = { owner: 'did:sr', creator: 'did:sr', id: 'user-1' };
const step = () => ({ start() {}, complete() {} });
const makeImport = () => new PolicyImport('COMMON', step());

const localTemplate = (id, overrides = {}) => ({
    id,
    uuid: `${id}-uuid`,
    name: `Template ${id}`,
    version: '1.0.0',
    status: ModuleStatus.PUBLISHED,
    owner: owner.owner,
    messageId: `msg-${id}`,
    ...overrides,
});

const binding = (templateId, overrides = {}) => ({
    templateId,
    templateMessageId: `msg-${templateId}`,
    schemaMap: { [`tsid-${templateId}`]: `remote-schema-${templateId}` },
    ...overrides,
});

/** The resolved templates, however the implementation chooses to expose them. */
const resolved = (service) => {
    const bag = service.schemaTemplates;
    assert.ok(bag, 'the importer must keep one resolved template per binding');
    return bag instanceof Map ? bag : new Map(Object.entries(bag));
};

describe('multi-template import - resolving every binding', () => {
    afterEach(() => restoreStubs());

    const resolveAll = async (service, policy, metadata) => {
        assert.equal(typeof service.resolveSchemaTemplates, 'function',
            'resolveSchemaTemplate becomes resolveSchemaTemplates, one pass per binding');
        return service.resolveSchemaTemplates(metadata, policy, owner, step(), null);
    };

    it('resolves both templates of a two-template policy', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async (id) => localTemplate(id));

        const service = makeImport();
        const policy = { schemaTemplates: [binding('template-1'), binding('template-2')] };

        await resolveAll(service, policy);

        const bag = resolved(service);
        assert.deepEqual([...bag.keys()].sort(), ['template-1', 'template-2']);
    });

    it('detaches only the template it cannot resolve', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async (id) => (
            id === 'template-1' ? localTemplate(id) : null
        ));
        // the message fallback finds nothing either, locally or on IPFS
        stub(DatabaseServer, 'getSchemaTemplate', async () => null);

        const service = makeImport();
        service.messageServer = { tryGetMessage: async () => null };
        const policy = { schemaTemplates: [binding('template-1'), binding('template-2')] };

        await resolveAll(service, policy);

        const bag = resolved(service);
        assert.equal(bag.has('template-1'), true,
            'one unresolvable template must not cost the import the other one');
        assert.equal(bag.has('template-2'), false);
    });

    it('detaches one template on request and keeps the rest', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async (id) => localTemplate(id));

        const service = makeImport();
        const policy = { schemaTemplates: [binding('template-1'), binding('template-2')] };
        const metadata = {
            schemaTemplates: [
                { templateId: 'template-1' },
                { templateId: 'template-2', detach: true },
            ],
        };

        await resolveAll(service, policy, metadata);

        const bag = resolved(service);
        assert.equal(bag.has('template-1'), true);
        assert.equal(bag.has('template-2'), false,
            'detach must be honoured per template, not for the whole import');
    });

    it('rejects two source bindings that resolve to the same local template', async () => {
        // Both source templates are matched by templateMessageId to one local template -
        // the ambiguity step 7 exists to catch, since findSchemaTemplateBinding would
        // otherwise return only the first match and strand the second one's snapshot.
        stub(DatabaseServer, 'getSchemaTemplateById', async () => null);
        stub(DatabaseServer, 'getSchemaTemplate', async () => localTemplate('shared-local'));

        const service = makeImport();
        service.messageServer = { tryGetMessage: async () => null };
        const policy = { schemaTemplates: [binding('template-1'), binding('template-2')] };

        await assert.rejects(
            resolveAll(service, policy),
            /template-1.*template-2|template-2.*template-1/s,
        );
    });

    it('resolves a template by message id when the local id is unknown', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async () => null);
        const byMessage = [];
        stub(DatabaseServer, 'getSchemaTemplate', async (filter) => {
            byMessage.push(filter?.messageId);
            return localTemplate('local-2', { messageId: filter?.messageId });
        });

        const service = makeImport();
        const policy = { schemaTemplates: [binding('template-2')] };

        await resolveAll(service, policy);

        assert.deepEqual(byMessage, ['msg-template-2']);
        assert.equal(resolved(service).get('template-2')?.id, 'local-2',
            'the map is keyed by the id the file was exported with, not the local one');
    });
});

describe('multi-template import - legacy singular files', () => {
    afterEach(() => restoreStubs());

    it('normalises a legacy singular binding into a one-element list', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async (id) => localTemplate(id));

        const service = makeImport();
        // exactly what a policy.json exported before this change carries
        const policy = { schemaTemplate: binding('template-1') };

        assert.equal(typeof service.normalizeSchemaTemplateBindings, 'function',
            'the importer must normalise the legacy shape before the pipeline runs');
        service.normalizeSchemaTemplateBindings(policy);

        assert.deepEqual(policy.schemaTemplates, [binding('template-1')],
            'a legacy binding must become the first entry of the list');
        assert.equal(policy.schemaTemplate, undefined,
            'nothing downstream should still see the legacy field');
    });

    it('normalises a legacy singular snapshot into a one-element list', () => {
        const service = makeImport();
        const components = { schemaTemplateSnapshot: { id: 'snapshot-1', templateId: 'template-1' } };

        assert.equal(typeof service.normalizeSchemaTemplateSnapshots, 'function',
            'the legacy snapshot key has to be normalised alongside the binding');
        service.normalizeSchemaTemplateSnapshots(components);

        assert.deepEqual(components.schemaTemplateSnapshots,
            [{ id: 'snapshot-1', templateId: 'template-1' }]);
    });

    it('leaves an already-plural file untouched', () => {
        const service = makeImport();
        const policy = { schemaTemplates: [binding('template-1'), binding('template-2')] };

        service.normalizeSchemaTemplateBindings(policy);

        assert.equal(policy.schemaTemplates.length, 2,
            'normalising must be idempotent, not destructive');
    });

    it('imports a legacy file into a working binding rather than dropping it', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async (id) => localTemplate(id));

        const service = makeImport();
        const policy = { schemaTemplate: binding('template-1') };

        service.normalizeSchemaTemplateBindings(policy);
        await service.resolveSchemaTemplates(undefined, policy, owner, step(), null);

        assert.equal(resolved(service).has('template-1'), true,
            'a legacy export must not silently import as an untemplated policy');
    });
});

describe('multi-template import - per-binding drop decision', () => {
    afterEach(() => restoreStubs());

    it('keeps the bindings that have a snapshot to carry them', () => {
        const service = makeImport();
        const policy = { schemaTemplates: [binding('template-1'), binding('template-2')] };
        const snapshots = [{ templateId: 'template-1' }, { templateId: 'template-2' }];

        assert.equal(typeof service.schemaTemplateBindingsToDrop, 'function',
            'the drop decision becomes per binding instead of all-or-nothing');
        assert.deepEqual(service.schemaTemplateBindingsToDrop(policy, snapshots, undefined), []);
    });

    it('drops only the binding whose snapshot is missing', () => {
        const service = makeImport();
        const policy = { schemaTemplates: [binding('template-1'), binding('template-2')] };
        const snapshots = [{ templateId: 'template-1' }];

        assert.deepEqual(
            service.schemaTemplateBindingsToDrop(policy, snapshots, undefined),
            ['template-2'],
            'a clone carries no snapshot, and only that binding may be dropped'
        );
    });

    it('drops a binding the caller asked to detach', () => {
        const service = makeImport();
        const policy = { schemaTemplates: [binding('template-1'), binding('template-2')] };
        const snapshots = [{ templateId: 'template-1' }, { templateId: 'template-2' }];
        const metadata = { schemaTemplates: [{ templateId: 'template-2', detach: true }] };

        assert.deepEqual(
            service.schemaTemplateBindingsToDrop(policy, snapshots, metadata),
            ['template-2']
        );
    });
});

describe('multi-template import - unresolved templates are detached whole', () => {
    afterEach(() => restoreStubs());

    /*
     * A binding can carry a snapshot and still fail to resolve to a local template.
     * It is left out when the snapshots are saved, so if its schemas kept their
     * markers the policy would claim no template over schemas that still claim one -
     * and with lock resolution matching on schema.templateId, those locks vanish
     * silently rather than failing.
     */
    it('strips the markers of a binding whose template did not resolve', async () => {
        const service = makeImport();
        service.schemaTemplates = new Map([['template-1', localTemplate('local-1')]]);

        const policy = { schemaTemplates: [binding('template-1'), binding('template-2')] };
        const schemas = [
            { id: 'ps-1', templateId: 'template-1', templateSchemaId: 'tsid-1' },
            {
                id: 'ps-2',
                templateId: 'template-2',
                templateSchemaId: 'tsid-2',
                document: { properties: { a: { type: 'string', templateFieldId: 'f-a' } } },
            },
        ];

        service.dropUnresolvedSchemaTemplates(policy, schemas);

        assert.deepEqual(policy.schemaTemplates.map((item) => item.templateId), ['template-1'],
            'the binding that could not resolve has to go');
        assert.equal(schemas[1].templateId, '', 'and it has to take its markers with it');
        assert.equal(schemas[1].templateSchemaId, '');
        assert.equal(schemas[1].document.properties.a.templateFieldId, undefined);
    });

    it('leaves the resolved binding and its schemas untouched', async () => {
        const service = makeImport();
        service.schemaTemplates = new Map([['template-1', localTemplate('local-1')]]);

        const policy = { schemaTemplates: [binding('template-1'), binding('template-2')] };
        const schemas = [{ id: 'ps-1', templateId: 'template-1', templateSchemaId: 'tsid-1' }];

        service.dropUnresolvedSchemaTemplates(policy, schemas);

        assert.equal(schemas[0].templateId, 'template-1');
        assert.equal(schemas[0].templateSchemaId, 'tsid-1');
    });
});

/*
 * saveSchemaTemplateSnapshots is the last thing the import does: it decides what the
 * policy actually ends up bound to. It runs after the schemas are persisted, so a
 * binding it silently leaves out is a binding whose schemas already went in - the
 * failure mode commit 9575b0816 was written to close.
 */
describe('multi-template import - saving the snapshots', () => {
    afterEach(() => restoreStubs());

    const snapshotFor = (templateId, overrides = {}) => ({
        id: `snapshot-${templateId}`,
        templateId,
        templateStateHash: `hash-${templateId}`,
        appliedAt: '2026-01-01T00:00:00.000Z',
        schemaMap: { [`tsid-${templateId}`]: `remote-schema-${templateId}` },
        ...overrides,
    });

    /** @returns { saved, updatedPolicy, policy } */
    const save = async (service, policy, snapshots) => {
        const saved = [];
        let updatedPolicy = null;
        stub(DatabaseServer, 'saveSchemaTemplateSnapshot', async (snapshot) => {
            saved.push(snapshot);
            return { ...snapshot, id: `saved-${saved.length}` };
        });
        stub(DatabaseServer, 'updatePolicy', async (item) => {
            updatedPolicy = item;
            return item;
        });
        await service.saveSchemaTemplateSnapshots(policy, snapshots, step());
        return { saved, updatedPolicy, policy };
    };

    it('writes one snapshot per resolved binding', async () => {
        const service = makeImport();
        service.schemaTemplates = new Map([
            ['template-1', localTemplate('local-1')],
            ['template-2', localTemplate('local-2')],
        ]);
        const policy = { id: 'policy-1', uuid: 'policy-uuid', schemaTemplates: [binding('template-1'), binding('template-2')] };

        const { saved, updatedPolicy } = await save(
            service, policy, [snapshotFor('template-1'), snapshotFor('template-2')]
        );

        assert.equal(saved.length, 2, 'each binding needs its own snapshot row');
        assert.deepEqual(
            updatedPolicy.schemaTemplates.map((item) => item.templateId),
            ['local-1', 'local-2'],
            'every surviving binding must point at the template it resolved to locally'
        );
    });

    it('pairs each binding with its own snapshot, not whichever came first', async () => {
        const service = makeImport();
        service.schemaTemplates = new Map([
            ['template-1', localTemplate('local-1')],
            ['template-2', localTemplate('local-2')],
        ]);
        // reversed, to catch an implementation that walks the two lists in step
        const snapshots = [snapshotFor('template-2'), snapshotFor('template-1')];
        const policy = { id: 'policy-1', schemaTemplates: [binding('template-1'), binding('template-2')] };

        const { updatedPolicy } = await save(service, policy, snapshots);

        assert.equal(updatedPolicy.schemaTemplates[0].templateStateHash, 'hash-template-1');
        assert.equal(updatedPolicy.schemaTemplates[1].templateStateHash, 'hash-template-2');
    });

    it('drops a binding whose snapshot did not travel with the file', async () => {
        const service = makeImport();
        service.schemaTemplates = new Map([
            ['template-1', localTemplate('local-1')],
            ['template-2', localTemplate('local-2')],
        ]);
        const policy = { id: 'policy-1', schemaTemplates: [binding('template-1'), binding('template-2')] };

        const { saved, updatedPolicy } = await save(service, policy, [snapshotFor('template-1')]);

        assert.equal(saved.length, 1);
        assert.deepEqual(updatedPolicy.schemaTemplates.map((item) => item.templateId), ['local-1'],
            'a binding with no snapshot cannot be carried and must not be kept');
    });

    it('drops a binding whose template did not resolve', async () => {
        const service = makeImport();
        service.schemaTemplates = new Map([['template-1', localTemplate('local-1')]]);
        const policy = { id: 'policy-1', schemaTemplates: [binding('template-1'), binding('template-2')] };

        const { updatedPolicy } = await save(
            service, policy, [snapshotFor('template-1'), snapshotFor('template-2')]
        );

        assert.deepEqual(updatedPolicy.schemaTemplates.map((item) => item.templateId), ['local-1']);
    });

    it('re-points the saved snapshot at the local template and the new policy', async () => {
        const service = makeImport();
        service.schemaTemplates = new Map([['template-1', localTemplate('local-1')]]);
        service.schemasMapping = [{ oldID: 'remote-schema-template-1', newID: 'local-schema-1' }];
        const policy = { id: 'policy-1', uuid: 'policy-uuid', schemaTemplates: [binding('template-1')] };

        const { saved, updatedPolicy } = await save(service, policy, [snapshotFor('template-1')]);

        const [written] = saved;
        assert.equal(written.templateId, 'local-1', 'the snapshot belongs to the local template now');
        assert.equal(written.policyId, 'policy-1');
        assert.deepEqual(written.schemaMap, { 'tsid-template-1': 'local-schema-1' },
            'the schema map has to follow the schemas into their new ids');
        assert.equal(updatedPolicy.schemaTemplates[0].schemaMap['tsid-template-1'], 'local-schema-1');
        assert.equal(updatedPolicy.schemaTemplates[0].snapshotId, 'saved-1');
    });

    it('leaves an untemplated policy with no bindings', async () => {
        const service = makeImport();
        const policy = { id: 'policy-1', schemaTemplates: [] };

        const { saved, updatedPolicy } = await save(service, policy, []);

        assert.equal(saved.length, 0);
        assert.deepEqual(updatedPolicy.schemaTemplates, []);
    });
});

describe('multi-template import - schema template ids are remapped', () => {
    afterEach(() => restoreStubs());

    /*
     * An imported schema keeps the templateId of the instance it was exported from,
     * while its binding is re-pointed at the locally resolved template. Anything that
     * resolves locks by comparing the two (the schema editor does) then finds nothing
     * and quietly drops every lock, so the schemas have to be re-pointed too.
     */
    it('re-points imported schemas at the locally resolved template', () => {
        const service = makeImport();
        const schemas = [
            { id: 'ps-1', templateId: 'remote-template-1', templateSchemaId: 'tsid-template-1' },
            { id: 'ps-2', templateId: 'remote-template-2', templateSchemaId: 'tsid-template-2' },
        ];

        assert.equal(typeof service.remapSchemaTemplateIds, 'function',
            'imported schemas must be re-pointed at the resolved local template');
        service.remapSchemaTemplateIds(schemas, new Map([
            ['remote-template-1', localTemplate('local-1')],
            ['remote-template-2', localTemplate('local-2')],
        ]));

        assert.equal(schemas[0].templateId, 'local-1');
        assert.equal(schemas[1].templateId, 'local-2');
    });

    it('leaves a schema alone when its template was detached', () => {
        const service = makeImport();
        const schemas = [{ id: 'ps-1', templateId: 'remote-template-1' }];

        service.remapSchemaTemplateIds(schemas, new Map());

        assert.equal(schemas[0].templateId, 'remote-template-1',
            'a detached template is cleared by clearTemplateMetadataFromSchemas, not here');
    });

    it('keeps the per-schema template field markers intact', () => {
        const service = makeImport();
        const schemas = [{
            id: 'ps-1',
            templateId: 'remote-template-1',
            templateSchemaId: 'tsid-1',
            document: { properties: { a: { type: 'string', templateFieldId: 'f-a' } } },
        }];

        service.remapSchemaTemplateIds(schemas, new Map([
            ['remote-template-1', localTemplate('local-1')],
        ]));

        assert.equal(schemas[0].templateSchemaId, 'tsid-1',
            'only the template id is instance-specific; the rest of the trail stays');
        assert.equal(schemas[0].document.properties.a.templateFieldId, 'f-a');
    });
});

/*
 * The exporter and the importer live in different packages and are otherwise only
 * tested from their own side, so nothing pins the shape they hand across. If the
 * exporter renamed its snapshot key or moved the zip path, every test on both sides
 * would still pass and a real import would quietly find no templates.
 *
 * These drive the real zip through both halves for that reason, not to re-test
 * either one.
 */
describe('multi-template import - round trip through a real zip', () => {
    // generateZipFile signs the zip against the export-proof schema; there is no
    // database here and the proof is not what this is about.
    beforeEach(() => stub(DatabaseServer, 'getSchemaByType', async () => null));
    afterEach(() => restoreStubs());

    const exportedSnapshot = (templateId) => ({
        id: `snapshot-${templateId}`,
        templateId,
        policyId: 'policy-1',
        templateStateHash: `hash-${templateId}`,
        appliedAt: '2026-01-01T00:00:00.000Z',
        schemaMap: { [`tsid-${templateId}`]: `policy-schema-${templateId}` },
        config: { schemas: {} },
        schemas: [],
    });

    const components = (overrides = {}) => ({
        policy: {
            id: 'policy-1',
            uuid: 'policy-uuid',
            name: 'Policy 1',
            status: 'DRAFT',
            topicId: '0.0.10',
            config: { blockType: 'interfaceContainerBlock' },
            schemaTemplates: [binding('template-1'), binding('template-2')],
        },
        schemas: [],
        systemSchemas: [],
        tokens: [],
        tools: [],
        tags: [],
        formulas: [],
        tests: [],
        artifacts: [],
        ...overrides,
    });

    const roundTrip = async (input) => {
        const zip = await PolicyImportExport.generateZipFile(input);
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        return PolicyImportExport.parseZipFile(buffer);
    };

    it('hands the importer both bindings and both snapshots', async () => {
        const parsed = await roundTrip(components({
            schemaTemplateSnapshots: [exportedSnapshot('template-1'), exportedSnapshot('template-2')],
        }));

        const service = makeImport();

        assert.deepEqual(
            service.schemaTemplateBindingsToDrop(parsed.policy, parsed.schemaTemplateSnapshots, undefined),
            [],
            'the two packages have to agree on where the snapshots live, or every binding looks unsupported'
        );
    });

    it('carries a two-template policy all the way to its saved bindings', async () => {
        const parsed = await roundTrip(components({
            schemaTemplateSnapshots: [exportedSnapshot('template-1'), exportedSnapshot('template-2')],
        }));

        stub(DatabaseServer, 'getSchemaTemplateById', async (id) => localTemplate(id));
        stub(DatabaseServer, 'saveSchemaTemplateSnapshot', async (snapshot) => ({ ...snapshot, id: `saved-${snapshot.templateId}` }));
        let updatedPolicy = null;
        stub(DatabaseServer, 'updatePolicy', async (item) => {
            updatedPolicy = item;
            return item;
        });

        const service = makeImport();
        await service.resolveSchemaTemplates(undefined, parsed.policy, owner, step(), null);
        await service.saveSchemaTemplateSnapshots(parsed.policy, parsed.schemaTemplateSnapshots, step());

        assert.deepEqual(
            updatedPolicy.schemaTemplates.map((item) => item.templateId).sort(),
            ['template-1', 'template-2'],
            'a policy exported with two templates has to import with two'
        );
    });

    it('imports a policy written in the legacy singular shape', async () => {
        // built by hand: the exporter cannot produce this layout any more, but it is
        // what sits in every zip and IPFS message published before the change
        const zip = await PolicyImportExport.generateZipFile(components({
            policy: { ...components().policy, schemaTemplates: undefined, schemaTemplate: binding('template-1') },
        }));
        zip.folder('schemaTemplate');
        zip.file('schemaTemplate/snapshot.json', JSON.stringify(exportedSnapshot('template-1')));
        const parsed = await PolicyImportExport.parseZipFile(await zip.generateAsync({ type: 'nodebuffer' }));

        const service = makeImport();
        service.normalizeSchemaTemplateBindings(parsed.policy);
        service.normalizeSchemaTemplateSnapshots(parsed);

        assert.deepEqual(
            service.schemaTemplateBindingsToDrop(parsed.policy, parsed.schemaTemplateSnapshots, undefined),
            [],
            'an old file must not import as an untemplated policy, and it fails silently when it does'
        );
    });
});
