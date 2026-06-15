/**
 * Fidelity test for the vendored schemasToContext helper.
 *
 * schemasToContext was vendored in-tree to drop @transmute/jsonld-schema. This guards the
 * vendored implementation against drift: its @context output for a representative schema must
 * stay byte-identical to what the previous @transmute implementation produced (the oracle in
 * tests/fixtures/credentials/schemas-to-context.json was generated with that implementation).
 * Schema-context output is baked into published credentials, so silent drift would be permanent.
 */
import { assert } from 'chai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { schemasToContext } from '../../../dist/helpers/schemas-to-context.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/credentials');
const read = (file) => JSON.parse(readFileSync(join(fixtures, file), 'utf8'));

describe('schemasToContext (vendored)', function () {
    it('produces the same @context as the previous @transmute implementation', function () {
        const schema = read('schema.json');
        const oracle = read('schemas-to-context.json');
        const result = schemasToContext([schema.document]);
        assert.deepEqual(result, oracle);
    });
});
