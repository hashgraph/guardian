import assert from 'node:assert/strict';
import { ModuleStatus } from '@guardian/interfaces';
import { PolicyImport } from '../../dist/helpers/import-helpers/policy/policy-import.js';
import { ImportPolicyOptions } from '../../dist/helpers/import-helpers/policy/policy-import.interface.js';
import { DatabaseServer } from '@guardian/common';
import { restoreStubs, stub } from '../_handler-harness.mjs';

/*
 * Every existing schema-template-and-import test calls a PolicyImport method
 * directly, so the call *ordering* the whole correctness argument rests on is
 * pinned by nothing:
 *
 *  - the per-binding drop (schemaTemplateBindingsToDrop + clearTemplateMetadataFromSchemas)
 *    must run before the schemas are persisted (importSchemas), or a dropped
 *    binding's schemas keep claiming a template the policy no longer has;
 *  - dropUnresolvedSchemaTemplates must run after resolveSchemaTemplates (it reads
 *    the map resolveSchemaTemplates populates) but before remapSchemaTemplateIds
 *    (remapping a schema whose binding is about to be dropped would remap it to a
 *    template the policy is about to disown).
 *
 * This drives the real import() with every non-schema-template step replaced by a
 * recording no-op, and the schema-template methods themselves left real, so a
 * reorder in import() fails this test even though every method in isolation still
 * behaves correctly.
 */

const owner = { owner: 'did:sr', creator: 'did:sr', id: 'user-1' };

function makeNotifier() {
    return {
        addStep() {},
        start() {},
        complete() {},
        getStep() { return makeNotifier(); },
    };
}

describe('PolicyImport.import() - schema template call ordering', () => {
    afterEach(() => restoreStubs());

    it('resolves, drops, and remaps in order, all before schemas are written', async () => {
        const localTemplate = { id: 'local-template-9', status: ModuleStatus.PUBLISHED, owner: owner.owner };
        stub(DatabaseServer, 'getSchemaTemplateById', async (id) => (
            id === 'src-template-2' ? localTemplate : null
        ));

        const order = [];
        const capturedAtImportSchemas = {};

        const instance = new PolicyImport('COMMON', makeNotifier());

        // Real implementations, spied for ordering only.
        for (const name of [
            'schemaTemplateBindingsToDrop',
            'clearTemplateMetadataFromSchemas',
            'resolveSchemaTemplates',
            'dropUnresolvedSchemaTemplates',
            'remapSchemaTemplateIds',
        ]) {
            const real = instance[name].bind(instance);
            instance[name] = (...args) => {
                order.push(name);
                return real(...args);
            };
        }

        // Everything else: no-op, recording order only.
        const stubbedNoop = [
            'resolveAccount', 'dataPreparation', 'createPolicyTopic', 'publishSystemSchemas',
            'importTools', 'importTokens', 'importArtifacts', 'importTests', 'importFormulas',
            'updateUUIDs', 'savePolicy', 'saveTopic', 'saveArtifacts', 'saveTests', 'saveFormulas',
            'saveSchemaTemplateSnapshots', 'saveHash', 'setSuggestionsConfig', 'importTags',
            'copyPolicyRecords',
        ];
        for (const name of stubbedNoop) {
            instance[name] = async () => { order.push(name); };
        }
        instance.savePolicy = async () => { order.push('savePolicy'); return {}; };
        instance.getErrors = async () => { order.push('getErrors'); return []; };
        instance.importSchemas = async (schemas) => {
            order.push('importSchemas');
            capturedAtImportSchemas.dropped = schemas[0].templateId;
            capturedAtImportSchemas.remapped = schemas[1].templateId;
        };

        const policy = {
            schemaTemplates: [
                { templateId: 'src-template-1' }, // no snapshot -> dropped at the top
                { templateId: 'src-template-2' }, // has a snapshot -> resolved and remapped
            ],
        };
        const schemas = [
            {
                templateId: 'src-template-1',
                templateSchemaId: 'tsid-1',
                document: { properties: { a: { type: 'string', templateFieldId: 'f-a' } } },
            },
            {
                templateId: 'src-template-2',
                templateSchemaId: 'tsid-2',
                document: { properties: { b: { type: 'string', templateFieldId: 'f-b' } } },
            },
        ];

        const options = new ImportPolicyOptions({})
            .setComponents({
                policy,
                schemas,
                systemSchemas: [],
                artifacts: [],
                tags: [],
                tools: [],
                tests: [],
                formulas: [],
                schemaTemplateSnapshots: [{ templateId: 'src-template-2' }],
            })
            .setUser(owner)
            .setParentPolicyTopic(null)
            .setAdditionalPolicy(null)
            .setMetadata(null)
            .setImportRecords(false);

        await instance.import(options, null);

        const idx = (name) => order.indexOf(name);
        assert.ok(idx('resolveSchemaTemplates') < idx('dropUnresolvedSchemaTemplates'),
            'resolveSchemaTemplates must populate the map before dropUnresolvedSchemaTemplates reads it');
        assert.ok(idx('dropUnresolvedSchemaTemplates') < idx('remapSchemaTemplateIds'),
            'a binding about to be dropped must not be remapped first');
        assert.ok(idx('remapSchemaTemplateIds') < idx('importSchemas'),
            'remap must land before the schemas it touches are persisted');
        assert.ok(idx('schemaTemplateBindingsToDrop') < idx('importSchemas'),
            'the top-of-import drop must land before the schemas it touches are persisted');

        assert.equal(capturedAtImportSchemas.dropped, '',
            'the undropped-snapshot binding must have cleared its schema marker before import');
        assert.equal(capturedAtImportSchemas.remapped, 'local-template-9',
            'the resolved binding must have remapped its schema marker before import');

        assert.deepEqual(
            policy.schemaTemplates.map((b) => b.templateId),
            ['src-template-2'],
            'the dropped binding must not survive on the policy either'
        );
    });
});
