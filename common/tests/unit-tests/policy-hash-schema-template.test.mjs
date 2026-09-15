import assert from 'node:assert/strict';
import { PolicyImportExport } from '../../dist/import-export/policy.js';

/*
 * the schema-template binding is environment-specific and must not reach
 * the policy hash.
 *
 * cleanBeforeHash already dropped components.schemaTemplateSnapshots, but
 * policy.schemaTemplates carries a snapshotId, schemaMap ObjectIds and
 * appliedAt/updatedAt, and every schema carries templateId. All of them differ
 * between environments, so exporting a template-bound policy and re-importing it
 * produced a different hash every time — hash-based same-policy detection then
 * reported a difference for every template-bound policy.
 */

const baseComponents = () => ({
    policy: {
        id: 'p-1',
        name: 'Test Policy',
        uuid: 'uuid-1',
        policyTag: 'Tag_1',
        topicId: '0.0.1',
        version: '1.0.0',
        config: { blockType: 'interfaceContainerBlock', children: [] },
    },
    schemas: [
        { name: 'Alpha', uuid: 's-uuid-1', iri: '#Alpha', document: { $id: '#Alpha' } },
    ],
    tokens: [],
    tools: [],
    artifacts: [],
    // preparePolicyComponents maps over each of these unconditionally
    systemSchemas: [],
    tags: [],
    tests: [],
    formulas: [],
});

const withBinding = (components, overrides = {}) => {
    const copy = structuredClone(components);
    copy.policy.schemaTemplates = [{
        templateId: 'tpl-1',
        snapshotId: 'snap-A',
        schemaMap: { '#Alpha': '64b7f1e2d3a4b5c6d7e8f901' },
        appliedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    }];
    copy.schemas[0].templateId = 'tpl-1';
    copy.schemas[0].templateSchemaId = 'tsid-1';
    return copy;
};

describe('getPolicyHash — schema template binding', () => {
    it('is unchanged by the presence of a template binding', () => {
        const unbound = PolicyImportExport.getPolicyHash(baseComponents());
        const bound = PolicyImportExport.getPolicyHash(withBinding(baseComponents()));

        assert.equal(bound, unbound,
            'a template-bound policy must hash the same as the identical unbound one');
    });

    it('is stable across environments that assigned different snapshot ids', () => {
        // the same policy applied in two environments: different snapshotId, different
        // schemaMap ObjectIds, different timestamps — same policy.
        const envA = PolicyImportExport.getPolicyHash(withBinding(baseComponents()));
        const envB = PolicyImportExport.getPolicyHash(withBinding(baseComponents(), {
            snapshotId: 'snap-B',
            schemaMap: { '#Alpha': '75c8f2e3d4b5c6d7e8f90123' },
            appliedAt: '2026-06-30T12:00:00.000Z',
            updatedAt: '2026-07-01T09:30:00.000Z',
        }));

        assert.equal(envA, envB,
            'export/re-import of the same policy must not change the hash');
    });

    it('still distinguishes policies that genuinely differ', () => {
        const one = PolicyImportExport.getPolicyHash(withBinding(baseComponents()));

        const other = baseComponents();
        other.schemas[0].document = { $id: '#Alpha', properties: { extra: { type: 'string' } } };

        assert.notEqual(PolicyImportExport.getPolicyHash(withBinding(other)), one,
            'ignoring the binding must not make different policies hash alike');
    });
});
