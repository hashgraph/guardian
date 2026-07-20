import { assert } from 'chai';
import { EncryptUtils } from '../../../dist/helpers/encrypt-utils.js';

describe('EncryptUtils.encrypt / decrypt', function () {
    this.timeout(20000); // pbkdf2 in cryppo is slow

    it('round-trips an arbitrary buffer with the right key', async () => {
        const plaintext = Buffer.from('hello-mgs-payload', 'utf8');
        const key = 'super-secret-passphrase';

        const encrypted = await EncryptUtils.encrypt(plaintext, key);
        assert.notEqual(Buffer.from(encrypted).toString('utf8'), plaintext.toString('utf8'));

        const decrypted = await EncryptUtils.decrypt(encrypted, key);
        assert.equal(Buffer.from(decrypted).toString('utf8'), 'hello-mgs-payload');
    });

    it('produces different ciphertext on each encrypt (random IV/salt)', async () => {
        const plaintext = Buffer.from('determinism-check', 'utf8');
        const key = 'k';
        const a = await EncryptUtils.encrypt(plaintext, key);
        const b = await EncryptUtils.encrypt(plaintext, key);
        assert.notEqual(Buffer.from(a).toString('utf8'), Buffer.from(b).toString('utf8'));
    });

    it('throws when no key is provided', async () => {
        try {
            await EncryptUtils.encrypt(Buffer.from('x'), '');
            assert.fail('expected throw');
        } catch (err) {
            assert.match(err.message, /no appropriate private key/i);
        }
    });

    it('decrypt with the wrong key rejects (tamper-resistant AES-GCM)', async () => {
        const plaintext = Buffer.from('top-secret', 'utf8');
        const encrypted = await EncryptUtils.encrypt(plaintext, 'right-key');
        let threw = false;
        try {
            await EncryptUtils.decrypt(encrypted, 'wrong-key');
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
    });
});
