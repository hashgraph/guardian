import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Source-level on purpose: the helper's behaviour is covered in
 * schema-template-handlers.test.mjs, but that cannot check that *every* delete flow
 * calls it - which is what regressed, and what a fourth flow would silently miss.
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
        for (const flow of source.split('await DatabaseServer.deletePolicy(').slice(0, -1)) {
            const cleanup = flow.lastIndexOf('await removePolicySchemaTemplateSnapshot(');
            assert.notEqual(cleanup, -1, 'a delete flow has no cleanup call before it');
        }
    });
});
