import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { PolicyImportExport } from '../../../dist/import-export/policy.js';

// an artifacts/ entry with no matching metadata record used to abort the whole
// import with a raw TypeError, taking every well-formed sibling with it

const POLICY = { name: 'p', config: {} };

async function archive({ metadata, artifacts = {} }) {
    const zip = new JSZip();
    zip.file('policy.json', JSON.stringify(POLICY));
    if (metadata !== undefined) {
        zip.file('artifacts/metadata.json', JSON.stringify(metadata));
    }
    for (const [name, body] of Object.entries(artifacts)) {
        zip.file(`artifacts/${name}`, body);
    }
    return await zip.generateAsync({ type: 'nodebuffer' });
}

const parse = (buffer) => PolicyImportExport.parseZipFile(buffer, true);

describe('@unit artifact metadata mismatch', function () {
    this.timeout(30000);

    it('an entry with no metadata record no longer throws', async () => {
        const buffer = await archive({ metadata: [], artifacts: { 'orphan-uuid': 'data' } });
        const result = await parse(buffer);
        assert.ok(result, 'the import must not abort');
        assert.deepEqual(result.artifacts, []);
    });

    it('names the offending entry so support can act on it', async () => {
        const buffer = await archive({ metadata: [], artifacts: { 'orphan-uuid': 'data' } });
        const result = await parse(buffer);
        assert.equal(result.artifactErrors.length, 1);
        assert.equal(result.artifactErrors[0].type, 'artifact');
        assert.equal(result.artifactErrors[0].name, 'artifacts/orphan-uuid');
        assert.match(result.artifactErrors[0].error, /no metadata record/i);
    });

    it('a well-formed sibling survives a malformed one', async () => {
        // The Promise.all masking: one bad entry used to cost the whole set.
        const buffer = await archive({
            metadata: [{ uuid: 'good-uuid', name: 'Good', extention: 'pdf' }],
            artifacts: { 'good-uuid': 'ok', 'orphan-uuid': 'data' },
        });
        const result = await parse(buffer);
        assert.equal(result.artifacts.length, 1);
        assert.equal(result.artifacts[0].uuid, 'good-uuid');
        assert.equal(result.artifacts[0].name, 'Good');
        assert.equal(result.artifactErrors.length, 1);
    });

    it('handles metadata.json being absent entirely', async () => {
        // The '[]' fallback makes every lookup miss.
        const buffer = await archive({ metadata: undefined, artifacts: { 'some-uuid': 'data' } });
        const result = await parse(buffer);
        assert.deepEqual(result.artifacts, []);
        assert.equal(result.artifactErrors.length, 1);
    });

    it('reports a nested artifact path rather than misreading it as a uuid', async () => {
        // artifacts/sub/file passes the filter, but split('/')[1] is 'sub'.
        const zip = new JSZip();
        zip.file('policy.json', JSON.stringify(POLICY));
        zip.file('artifacts/metadata.json', JSON.stringify([{ uuid: 'sub', name: 'N', extention: 'e' }]));
        zip.file('artifacts/sub/file.pdf', 'data');
        const result = await parse(await zip.generateAsync({ type: 'nodebuffer' }));
        assert.equal(result.artifactErrors.length, 1);
        assert.match(result.artifactErrors[0].error, /nested/i);
        assert.deepEqual(result.artifacts, [],
            'a nested path must not be resolved via the folder name as a uuid');
    });

    it('metadata.json that is not a list is reported once, not once per artifact', async () => {
        const buffer = await archive({
            metadata: {},
            artifacts: { u1: 'a', u2: 'b', u3: 'c' },
        });
        const result = await parse(buffer);

        assert.deepEqual(result.artifacts, []);
        assert.deepEqual(
            result.artifactErrors.map(e => e.name),
            ['artifacts/metadata.json'],
            'the file is the fault; three identical per-entry misses add nothing',
        );
    });

    it('a non-list metadata.json is survivable in preview mode too', async () => {
        const buffer = await archive({ metadata: {}, artifacts: { u1: 'data' } });
        const result = await PolicyImportExport.parseZipFile(buffer, false);
        assert.deepEqual(result.artifacts, []);
    });

    it('a clean archive reports no errors at all', async () => {
        const buffer = await archive({
            metadata: [{ uuid: 'u1', name: 'A', extention: 'pdf' }],
            artifacts: { u1: 'data' },
        });
        const result = await parse(buffer);
        assert.equal(result.artifacts.length, 1);
        assert.equal(result.artifactErrors, undefined,
            'the field is absent rather than an empty array on a clean import');
    });

    it('artifact data is still read for a resolved entry', async () => {
        const buffer = await archive({
            metadata: [{ uuid: 'u1', name: 'A', extention: 'pdf' }],
            artifacts: { u1: 'hello' },
        });
        const result = await parse(buffer);
        assert.equal(result.artifacts[0].data.toString(), 'hello');
    });

    it('the policy hash does not depend on how cleanly the zip parsed', async () => {
        // getPolicyHash stringifies the whole components object, so a diagnostic
        // leaking into it would give a policy a different hash purely because its
        // archive had a bad artifact - and those get corrected and re-imported.
        const clean = await parse(await archive({
            metadata: [{ uuid: 'u1', name: 'A', extention: 'pdf' }],
            artifacts: { u1: 'data' },
        }));
        const messy = await parse(await archive({
            metadata: [{ uuid: 'u1', name: 'A', extention: 'pdf' }],
            artifacts: { u1: 'data', 'orphan-uuid': 'x' },
        }));
        assert.ok(messy.artifactErrors?.length > 0, 'precondition: the messy one has errors');
        assert.equal(
            PolicyImportExport.getPolicyHash(clean),
            PolicyImportExport.getPolicyHash(messy),
            'artifactErrors must be excluded from the hash',
        );
    });

    it('the preview mode (includeArtifactsData false) is unaffected', async () => {
        const buffer = await archive({
            metadata: [{ uuid: 'u1', name: 'A', extention: 'pdf' }],
            artifacts: { 'orphan-uuid': 'x' },
        });
        const result = await PolicyImportExport.parseZipFile(buffer, false);
        // Built from metadata rather than file entries, so it lists u1 and has
        // nothing to complain about. The two modes still disagree about what the
        // archive contains - noted in the ticket, left alone here.
        assert.equal(result.artifacts.length, 1);
        assert.equal(result.artifacts[0].data, null);
    });
});
