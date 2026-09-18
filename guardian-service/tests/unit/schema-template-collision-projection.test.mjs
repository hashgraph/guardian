import assert from 'node:assert/strict';
import { ModuleStatus, PolicyStatus, SchemaCategory } from '@guardian/interfaces';
import { validateSchemaNameCollisions } from '../../dist/api/schema-template.service.js';
import { DatabaseServer, restoreStubs, stub } from '../_handler-harness.mjs';

/*
 * Every existing test stubs DatabaseServer.getSchemas to ignore the projection
 * argument and return full fixture objects regardless of what fields were
 * requested. validateSchemaNameCollisions asks for exactly
 * `{ fields: ['name', 'templateId'] }`, and its whole "detach template X" vs.
 * "rename or delete" distinction is read off `templateId` - if a real Mongo
 * projection ever dropped that field (e.g. someone edits the fields array and
 * forgets templateId), every collider would be silently misclassified as a plain
 * policy schema, and the ignore-projection fakes would never notice because they
 * hand back templateId regardless of what was asked for.
 *
 * This fake actually honors the projection, the way MongoDB does, so the test
 * fails if the source ever stops asking for templateId.
 */
const projectingGetSchemas = (rows) => async (_filter, options) => {
    const fields = options?.fields;
    if (!Array.isArray(fields)) {
        return rows;
    }
    return rows.map((row) => {
        const projected = { id: row.id };
        for (const field of fields) {
            projected[field] = row[field];
        }
        return projected;
    });
};

const owner = { owner: 'did:owner', creator: 'did:owner-creator', id: 'user-1' };

const policy = (overrides = {}) => ({
    id: 'policy-1',
    uuid: 'policy-uuid',
    owner: owner.owner,
    topicId: '0.0.10',
    status: PolicyStatus.DRAFT,
    schemaTemplates: [],
    ...overrides,
});

const binding = (templateId) => ({
    templateId,
    templateName: `Template ${templateId}`,
    templateVersion: '1.0.0',
    templateStatus: ModuleStatus.DRAFT,
});

const policySchema = (id, name, templateId = '') => ({
    id,
    name,
    templateId,
    topicId: '0.0.10',
    category: SchemaCategory.POLICY,
});

describe('validateSchemaNameCollisions - getSchemas projection', () => {
    afterEach(() => restoreStubs());

    it('still attributes a collision to its owning template under a real Mongo-style projection', async () => {
        stub(DatabaseServer, 'getSchemas', projectingGetSchemas([
            policySchema('policy-schema-template-2', 'Monitoring Report', 'template-2'),
        ]));

        const targetPolicy = policy({ schemaTemplates: [binding('template-1'), binding('template-2')] });

        await assert.rejects(
            validateSchemaNameCollisions(
                { name: 'Template 1' },
                targetPolicy,
                [{ name: 'Monitoring Report' }],
            ),
            (error) => {
                assert.match(error.message, /belong to an applied schema template/);
                assert.match(error.message, /Template template-2/);
                assert.doesNotMatch(error.message, /Rename or delete/,
                    'a template-owned collider must not be told to "rename or delete" - that is the ordinary-schema message');
                return true;
            },
        );
    });

    it('still attributes a collision to an ordinary policy schema when it truly has no templateId', async () => {
        stub(DatabaseServer, 'getSchemas', projectingGetSchemas([
            policySchema('plain-schema-1', 'Custom Report'),
        ]));

        const targetPolicy = policy({ schemaTemplates: [binding('template-1')] });

        await assert.rejects(
            validateSchemaNameCollisions(
                { name: 'Template 1' },
                targetPolicy,
                [{ name: 'Custom Report' }],
            ),
            (error) => {
                assert.match(error.message, /already has schemas named "Custom Report"/);
                assert.doesNotMatch(error.message, /Detach that template/);
                return true;
            },
        );
    });
});
