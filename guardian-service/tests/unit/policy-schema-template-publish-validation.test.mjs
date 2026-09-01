import assert from 'node:assert/strict';
import { ModuleStatus } from '@guardian/interfaces';
import { validatePolicySchemaTemplateBeforePublish } from '../../dist/policy-engine/policy-engine.js';
import {
    DatabaseServer,
    restoreStubs,
    stub,
} from '../_handler-harness.mjs';

describe('validatePolicySchemaTemplateBeforePublish', () => {
    afterEach(() => restoreStubs());

    it('allows policies without a schema template binding', async () => {
        await assert.doesNotReject(() => validatePolicySchemaTemplateBeforePublish({}));
    });

    it('rejects a snapshot binding without a linked template id', async () => {
        await assert.rejects(
            () => validatePolicySchemaTemplateBeforePublish({
                schemaTemplate: {
                    snapshotId: 'snapshot-1',
                    schemaMap: {},
                },
            }),
            /snapshot without a linked template/
        );
    });

    it('rejects a binding to a draft template', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
            id: 'template-1',
            status: ModuleStatus.DRAFT,
        }));

        await assert.rejects(
            () => validatePolicySchemaTemplateBeforePublish({
                schemaTemplate: {
                    templateId: 'template-1',
                    schemaMap: {},
                },
            }),
            /draft schema template/
        );
    });

    it('rejects a binding when the linked template is missing', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async () => null);

        await assert.rejects(
            () => validatePolicySchemaTemplateBeforePublish({
                schemaTemplate: {
                    templateId: 'missing-template',
                    schemaMap: {},
                },
            }),
            /draft schema template/
        );
    });

    it('allows a binding to a published template', async () => {
        stub(DatabaseServer, 'getSchemaTemplateById', async () => ({
            id: 'template-1',
            status: ModuleStatus.PUBLISHED,
        }));

        await assert.doesNotReject(() => validatePolicySchemaTemplateBeforePublish({
            schemaTemplate: {
                templateId: 'template-1',
                schemaMap: {
                    'template-schema-1': 'policy-schema-1',
                },
            },
        }));
    });
});
