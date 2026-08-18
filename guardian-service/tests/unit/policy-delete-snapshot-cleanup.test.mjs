import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Wiring test for the orphaned schema-template snapshot.
 *
 * removeSchemaTemplateSnapshot was only ever called from schema-template.service's
 * own detach/update paths; none of the three policy delete flows in
 * policy-engine.ts called it, so deleting a draft policy with a template applied
 * left the snapshot row - and its two GridFS payloads - behind forever.
 *
 * The behaviour of the cleanup helper itself is covered in
 * schema-template-handlers.test.mjs. What that cannot check is that *every* delete
 * flow calls it, which is the part that regressed and the part a fourth delete
 * flow would silently miss. Read at the source level for exactly that reason: the
 * point is the call site, not the outcome of one of them.
 */
const source = readFileSync(
    fileURLToPath(new URL('../../src/policy-engine/policy-engine.ts', import.meta.url)),
    'utf8'
);

const countOf = (needle) => source.split(needle).length - 1;

describe('policy delete flows clean up the schema template snapshot', () => {
    it('imports the cleanup helper', () => {
        assert.match(source, /import \{ removePolicySchemaTemplateSnapshot \}/);
    });

    it('calls it before every deletePolicy', () => {
        const deletes = countOf('await DatabaseServer.deletePolicy(');
        assert.ok(deletes >= 3, `expected the three delete flows, found ${deletes}`);
        assert.equal(
            countOf('await removePolicySchemaTemplateSnapshot('),
            deletes,
            'a delete flow that skips the cleanup orphans the snapshot and its GridFS payloads'
        );
    });

    it('cleans up before the policy row goes, not after', () => {
        // once the policy is gone its schemaTemplate.snapshotId goes with it, and the
        // snapshot can no longer be found
        for (const flow of source.split('await DatabaseServer.deletePolicy(').slice(0, -1)) {
            const cleanup = flow.lastIndexOf('await removePolicySchemaTemplateSnapshot(');
            assert.notEqual(cleanup, -1, 'a delete flow has no cleanup call before it');
        }
    });
});
