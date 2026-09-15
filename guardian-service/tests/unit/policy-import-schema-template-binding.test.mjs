import assert from 'node:assert/strict';
import { ModuleStatus } from '@guardian/interfaces';
import { PolicyImport } from '../../dist/helpers/import-helpers/policy/policy-import.js';
import { DatabaseServer } from '@guardian/common';
import { restoreStubs, stub } from '../_handler-harness.mjs';

/*
 * Cloning a template-bound policy either hard-failed or produced a half-bound
 * clone.
 *
 *  - resolveSchemaTemplate only tried metadata.templateId and a message id, and
 *    clonePolicy passes no metadata - so a policy bound to an *unpublished*
 *    template threw "Schema template is inaccessible" even though the template was
 *    sitting right there in the database.
 *  - saveSchemaTemplateSnapshot clears policy.schemaTemplates when there is no
 *    snapshot to remap (exactly what a clone produces), but by then the schemas are
 *    already persisted and kept their templateId / templateSchemaId /
 *    templateFieldId markers: a policy claiming no template over schemas still
 *    claiming one.
 */

const owner = { owner: 'did:sr', creator: 'did:sr', id: 'user-1' };
const step = () => ({ start() {}, complete() {} });

const makeImport = () => new PolicyImport('COMMON', step());

describe('PolicyImport - schema template binding', () => {
    afterEach(() => restoreStubs());

    describe('resolveSchemaTemplates', () => {
        it('resolves an unpublished template from the binding when no metadata is supplied', async () => {
            const template = { id: 'template-1', status: ModuleStatus.DRAFT, owner: owner.owner };
            const looked = [];
            stub(DatabaseServer, 'getSchemaTemplateById', async (id) => {
                looked.push(id);
                return template;
            });

            const service = makeImport();
            const policy = { schemaTemplates: [{ templateId: 'template-1' }] };

            // clonePolicy passes no metadata at all
            await service.resolveSchemaTemplates(undefined, policy, owner, step(), null);

            assert.deepEqual(looked, ['template-1']);
            assert.equal(service.schemaTemplates.get('template-1'), template,
                'the bound template should resolve locally instead of throwing');
        });

        it('refuses a bound template owned by somebody else and not published', async () => {
            stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
                id: 'template-1', status: ModuleStatus.DRAFT, owner: 'did:other-sr'
            }));

            const service = makeImport();
            const policy = { schemaTemplates: [{ templateId: 'template-1' }] };

            // one unresolvable template no longer fails the whole import; it is left
            // out and detached individually
            await service.resolveSchemaTemplates(undefined, policy, owner, step(), null);

            assert.equal(service.schemaTemplates.has('template-1'), false,
                'accessibility still applies to the binding fallback');
        });

        it('accepts a published template belonging to another owner', async () => {
            const template = { id: 'template-1', status: ModuleStatus.PUBLISHED, owner: 'did:other-sr' };
            stub(DatabaseServer, 'getSchemaTemplateById', async () => template);

            const service = makeImport();
            await service.resolveSchemaTemplates(undefined, { schemaTemplates: [{ templateId: 'template-1' }] }, owner, step(), null);

            assert.equal(service.schemaTemplates.get('template-1'), template);
        });

        it('still detaches when the caller asks for it, without any lookup', async () => {
            stub(DatabaseServer, 'getSchemaTemplateById', async () => { throw new Error('must not be looked up'); });

            const service = makeImport();
            await service.resolveSchemaTemplates(
                { schemaTemplates: { 'template-1': { detach: true } } },
                { schemaTemplates: [{ templateId: 'template-1' }] },
                owner, step(), null
            );

            assert.equal(service.schemaTemplates.size, 0);
        });
    });

    describe('schemaTemplateBindingsToDrop', () => {
        const bound = { schemaTemplates: [{ templateId: 'template-1' }] };
        const snapshot = [{ templateId: 'template-1' }];

        it('drops a binding that has no snapshot to carry it', () => {
            // exactly what clonePolicy produces
            assert.deepEqual(
                makeImport().schemaTemplateBindingsToDrop(bound, [], undefined),
                ['template-1']
            );
        });

        it('keeps a binding that has a snapshot', () => {
            assert.deepEqual(
                makeImport().schemaTemplateBindingsToDrop(bound, snapshot, undefined),
                []
            );
        });

        it('drops on an explicit detach even when a snapshot exists', () => {
            assert.deepEqual(
                makeImport().schemaTemplateBindingsToDrop(
                    bound, snapshot, { schemaTemplates: { 'template-1': { detach: true } } }
                ),
                ['template-1']
            );
        });

        it('is a no-op for a policy that was never bound', () => {
            assert.deepEqual(makeImport().schemaTemplateBindingsToDrop({}, [], undefined), []);
        });
    });

    describe('clearTemplateMetadataFromSchemas', () => {
        it('leaves no marker on the schemas that are about to be written', () => {
            const schemas = [{
                templateId: 'template-1',
                templateSchemaId: 'tsid-1',
                document: { properties: { a: { type: 'string', templateFieldId: 'f-a' } } },
            }];

            makeImport().clearTemplateMetadataFromSchemas(schemas);

            assert.equal(schemas[0].templateId, '');
            assert.equal(schemas[0].templateSchemaId, '');
            assert.equal(schemas[0].document.properties.a.templateFieldId, undefined,
                'a dropped binding must not leave schemas claiming a template');
        });
    });
});
