import assert from 'node:assert/strict';
import { EncryptVcHelper } from '../../../dist/helpers/encrypt-vc-helper.js';

describe('EncryptVcHelper', () => {
    it('round-trips a document through encrypt/decrypt with the same key', async () => {
        const original = JSON.stringify({ amount: 5, owner: 'did:owner', payload: 'hello' });
        const encrypted = await EncryptVcHelper.encrypt(original, 'secret-passphrase');
        const decrypted = await EncryptVcHelper.decrypt(encrypted, 'secret-passphrase');
        assert.equal(decrypted, original);
    });

    it('decrypt does not support an empty-string ciphertext (cryppo limitation)', async () => {
        // Encrypting "" succeeds but decrypt back through cryppo requires a non-NULL algo.
        const encrypted = await EncryptVcHelper.encrypt('', 'k1');
        await assert.rejects(EncryptVcHelper.decrypt(encrypted, 'k1'));
    });

    it('throws when encrypt is called with no key', async () => {
        await assert.rejects(
            EncryptVcHelper.encrypt('payload', null),
            /no appropriate private key/,
        );
        await assert.rejects(
            EncryptVcHelper.encrypt('payload', ''),
            /no appropriate private key/,
        );
        await assert.rejects(
            EncryptVcHelper.encrypt('payload', undefined),
            /no appropriate private key/,
        );
    });

    it('produces different ciphertexts for different inputs', async () => {
        const a = await EncryptVcHelper.encrypt('A', 'same-key');
        const b = await EncryptVcHelper.encrypt('B', 'same-key');
        assert.notEqual(a, b);
    });

    it('produces different ciphertexts for the same input on repeat calls (random IV)', async () => {
        const a = await EncryptVcHelper.encrypt('payload', 'same-key');
        const b = await EncryptVcHelper.encrypt('payload', 'same-key');
        assert.notEqual(a, b);
    });

    it('decrypting with the wrong key rejects', async () => {
        const ct = await EncryptVcHelper.encrypt('payload', 'right-key');
        await assert.rejects(EncryptVcHelper.decrypt(ct, 'wrong-key'));
    });

    it('round-trips a unicode payload', async () => {
        const text = 'Привет 🌍 — naïve façade';
        const ct = await EncryptVcHelper.encrypt(text, 'k');
        const pt = await EncryptVcHelper.decrypt(ct, 'k');
        assert.equal(pt, text);
    });
});
