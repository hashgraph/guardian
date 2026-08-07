/**
 * Fidelity test for the vendored bls12381-2020-v1 (BBS) JSON-LD context.
 *
 * The https://w3id.org/security/bbs/v1 context was vendored in-tree when @transmute's
 * context packages were dropped. BBS proof verification is canonicalization-sensitive, so the
 * vendored context must stay byte-identical to what the previous @transmute stack served (the
 * oracle in tests/fixtures/credentials/bls12381-2020-v1-context.json). A drift here would break
 * verification of existing BbsBlsSignature2020 credentials.
 */
import { assert } from 'chai';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BLS12381_2020_V1_CONTEXT } from '../../../../dist/hedera-modules/document-loader/contexts/bls12381-2020-v1.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/credentials');
const read = (file) => JSON.parse(readFileSync(join(fixtures, file), 'utf8'));

describe('bls12381-2020-v1 context (vendored)', function () {
    it('matches the context served by the previous @transmute stack', function () {
        const oracle = read('bls12381-2020-v1-context.json');
        assert.deepEqual(BLS12381_2020_V1_CONTEXT, oracle);
    });
});
