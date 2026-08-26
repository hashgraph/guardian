import { assert } from 'chai';
import { PolicyImportExport } from '../../../dist/import-export/policy.js';
import { DatabaseServer } from '../../../dist/database-modules/database-server.js';

// generateZipFile looks up the export-proof schema to sign the zip; without a
// database there is nothing to look up, and the proof is not what these tests are
// about.
let restoreSchemaLookup;
before(() => {
    const original = DatabaseServer.getSchemaByType;
    restoreSchemaLookup = () => { DatabaseServer.getSchemaByType = original; };
    DatabaseServer.getSchemaByType = async () => null;
});
after(() => restoreSchemaLookup());

/*
 * Multi-template export/import (issue #6711, step 6 of the design doc).
 *
 * A policy can carry several schema template bindings, so the zip needs one
 * snapshot per template instead of a single fixed `schemaTemplate/snapshot.json`
 * slot. The catch is that every policy exported or published before this change
 * uses that fixed slot, and IPFS content cannot be rewritten - so the reader has
 * to keep understanding the old layout forever.
 *
 * Written before the implementation.
 */

const snapshot = (templateId) => ({
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

describe('PolicyImportExport - several schema template snapshots', function () {
    it('writes one snapshot file per template', async function () {
        const zip = await PolicyImportExport.generateZipFile(components({
            schemaTemplateSnapshots: [snapshot('template-1'), snapshot('template-2')],
        }));

        assert.exists(
            zip.files['schemaTemplate/template-1/snapshot.json'],
            'each template needs its own path or the second overwrites the first'
        );
        assert.exists(zip.files['schemaTemplate/template-2/snapshot.json']);
    });

    it('keeps each snapshot bound to its own template', async function () {
        const zip = await PolicyImportExport.generateZipFile(components({
            schemaTemplateSnapshots: [snapshot('template-1'), snapshot('template-2')],
        }));

        const firstFile = zip.files['schemaTemplate/template-1/snapshot.json'];
        const secondFile = zip.files['schemaTemplate/template-2/snapshot.json'];
        assert.exists(firstFile, 'per-template snapshot paths are not written yet');
        assert.exists(secondFile);

        const first = JSON.parse(await firstFile.async('string'));
        const second = JSON.parse(await secondFile.async('string'));

        assert.equal(first.templateId, 'template-1');
        assert.equal(second.templateId, 'template-2');
        assert.notEqual(first.templateStateHash, second.templateStateHash);
    });

    it('reads every snapshot back out of the zip', async function () {
        const zip = await PolicyImportExport.generateZipFile(components({
            schemaTemplateSnapshots: [snapshot('template-1'), snapshot('template-2')],
        }));
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });

        const parsed = await PolicyImportExport.parseZipFile(buffer);

        assert.isArray(parsed.schemaTemplateSnapshots);
        assert.deepEqual(
            parsed.schemaTemplateSnapshots.map((item) => item.templateId).sort(),
            ['template-1', 'template-2']
        );
    });

    it('writes no schema template folder for an untemplated policy', async function () {
        const zip = await PolicyImportExport.generateZipFile(components({
            schemaTemplateSnapshots: [],
        }));

        assert.notExists(zip.files['schemaTemplate/snapshot.json']);
    });
});

describe('PolicyImportExport - legacy single-snapshot files', function () {
    /*
     * Built by hand rather than by the exporter, because the exporter will not be
     * able to produce this layout any more. This is the shape sitting in every zip
     * and every IPFS message published before the change.
     */
    const legacyZip = async () => {
        const zip = await PolicyImportExport.generateZipFile(components());
        zip.folder('schemaTemplate');
        zip.file('schemaTemplate/snapshot.json', JSON.stringify(snapshot('template-1')));
        return zip.generateAsync({ type: 'nodebuffer' });
    };

    it('still finds the snapshot at the legacy fixed path', async function () {
        const parsed = await PolicyImportExport.parseZipFile(await legacyZip());

        assert.isArray(
            parsed.schemaTemplateSnapshots,
            'a legacy file must normalise into the same shape as a new one'
        );
        assert.lengthOf(parsed.schemaTemplateSnapshots, 1);
        assert.equal(parsed.schemaTemplateSnapshots[0].templateId, 'template-1');
    });

    it('carries the legacy schema map through unchanged', async function () {
        const parsed = await PolicyImportExport.parseZipFile(await legacyZip());

        const [restored] = parsed.schemaTemplateSnapshots || [];
        assert.exists(
            restored,
            'dropping the snapshot would make an old policy import as untemplated, with no error'
        );
        assert.deepEqual(restored.schemaMap, { 'tsid-template-1': 'policy-schema-template-1' });
    });
});
