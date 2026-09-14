import { assert } from 'chai';
import { readFileSync } from 'node:fs';
import {
    CipherStrategy,
    bytesToUtf8,
    decryptWithKeyDerivedFromString,
    encryptWithKeyDerivedFromString,
    readArtifacts,
    utf8ToBytes,
    writeArtifacts,
} from '../../../dist/helpers/cryppo/index.js';

const { vectors } = JSON.parse(
    readFileSync(new URL('../../fixtures/cryppo/legacy-vectors.json', import.meta.url), 'utf8')
);

/** chai-as-promised is not available here, so assert on the rejection directly. */
const assertRejects = async (promise, pattern) => {
    try {
        await promise;
    } catch (error) {
        assert.match(error.message, pattern);
        return;
    }
    assert.fail('expected the promise to reject');
};

const plaintextOf = (vector) =>
    vector.plaintextEncoding === 'utf8'
        ? Buffer.from(vector.plaintext, 'utf8')
        : Buffer.from(vector.plaintext, 'base64');

describe('cryppo (@meeco/cryppo replacement)', function () {
    this.timeout(20000); // pbkdf2 with 20k iterations is deliberately slow

    describe('backwards compatibility with @meeco/cryppo', () => {
        // These vectors were produced by the real library (2.0.2 and 3.0.2) before it was
        // removed. They stand in for documents already published to Hedera and IPFS, so a
        // failure here means previously encrypted data has become unreadable.
        for (const vector of vectors) {
            it(`decrypts a ${vector.library}@${vector.version} payload (${vector.name})`, async () => {
                const decrypted = await decryptWithKeyDerivedFromString({
                    serialized: vector.serialized,
                    passphrase: vector.passphrase,
                });
                assert.isTrue(Buffer.from(decrypted).equals(plaintextOf(vector)));
            });
        }
    });

    describe('round trip', () => {
        for (const vector of vectors.filter((item) => item.version === '3.0.2')) {
            it(`encrypts and decrypts ${vector.name}`, async () => {
                const { serialized } = await encryptWithKeyDerivedFromString({
                    passphrase: vector.passphrase,
                    data: new Uint8Array(plaintextOf(vector)),
                    strategy: CipherStrategy.AES_GCM,
                });
                const decrypted = await decryptWithKeyDerivedFromString({
                    serialized,
                    passphrase: vector.passphrase,
                });
                assert.isTrue(Buffer.from(decrypted).equals(plaintextOf(vector)));
            });
        }

        it('produces a different envelope every time (random salt and IV)', async () => {
            const options = {
                passphrase: 'k',
                data: utf8ToBytes('payload'),
                strategy: CipherStrategy.AES_GCM,
            };
            const first = await encryptWithKeyDerivedFromString(options);
            const second = await encryptWithKeyDerivedFromString(options);
            assert.notEqual(first.serialized, second.serialized);
        });
    });

    describe('serialized envelope', () => {
        let segments;

        before(async () => {
            const { serialized } = await encryptWithKeyDerivedFromString({
                passphrase: 'k',
                data: utf8ToBytes('payload'),
                strategy: CipherStrategy.AES_GCM,
            });
            segments = serialized.split('.');
        });

        it('has five segments with the expected strategy markers', () => {
            assert.lengthOf(segments, 5);
            // indexer-frontend sniffs encrypted payloads with startsWith('Aes256')
            assert.equal(segments[0], 'Aes256Gcm');
            assert.equal(segments[3], 'Pbkdf2Hmac');
        });

        it('carries the encryption artifacts cryppo expects', () => {
            const artifacts = readArtifacts(segments[2], 'A');
            assert.lengthOf(artifacts.iv, 12);
            assert.lengthOf(artifacts.at, 16);
            assert.equal(artifacts.ad, 'none');
        });

        it('carries the key derivation artifacts cryppo expects', () => {
            const artifacts = readArtifacts(segments[4], 'K');
            assert.lengthOf(artifacts.iv, 20);
            assert.isAtLeast(artifacts.i, 20000);
            assert.equal(artifacts.l, 32);
            assert.equal(artifacts.hash, 'SHA256');
        });
    });

    describe('BSON artifact codec', () => {
        // Field order and length prefixes have to match cryppo exactly, so re-encoding a
        // parsed artifact document must reproduce the original segment byte for byte.
        for (const vector of vectors) {
            it(`re-encodes the artifacts of ${vector.name} unchanged`, () => {
                const [, , encryption, , derivation] = vector.serialized.split('.');

                const encryptionArtifacts = readArtifacts(encryption, 'A');
                assert.equal(
                    writeArtifacts('A', [
                        ['iv', encryptionArtifacts.iv],
                        ['at', encryptionArtifacts.at],
                        ['ad', encryptionArtifacts.ad],
                    ]),
                    encryption
                );

                const derivationArtifacts = readArtifacts(derivation, 'K');
                assert.equal(
                    writeArtifacts('K', [
                        ['iv', derivationArtifacts.iv],
                        ['i', derivationArtifacts.i],
                        ['l', derivationArtifacts.l],
                        ['hash', derivationArtifacts.hash],
                    ]),
                    derivation
                );
            });
        }
    });

    describe('rejections', () => {
        const vector = vectors[0];

        const tamper = (index, mutate) => {
            const segments = vector.serialized.split('.');
            segments[index] = mutate(segments[index]);
            return segments.join('.');
        };

        it('rejects a wrong passphrase', async () => {
            await assertRejects(
                decryptWithKeyDerivedFromString({
                    serialized: vector.serialized,
                    passphrase: 'wrong-passphrase',
                }),
                /Decryption failed/
            );
        });

        it('rejects tampered ciphertext', async () => {
            const serialized = tamper(1, (value) => (value[0] === 'A' ? 'B' : 'A') + value.slice(1));
            await assertRejects(
                decryptWithKeyDerivedFromString({ serialized, passphrase: vector.passphrase }),
                /Decryption failed/
            );
        });

        it('rejects a tampered authentication tag', async () => {
            const artifacts = readArtifacts(vector.serialized.split('.')[2], 'A');
            const tag = Uint8Array.from(artifacts.at);
            tag[0] ^= 0xff;
            const serialized = tamper(2, () =>
                writeArtifacts('A', [
                    ['iv', artifacts.iv],
                    ['at', tag],
                    ['ad', artifacts.ad],
                ])
            );
            await assertRejects(
                decryptWithKeyDerivedFromString({ serialized, passphrase: vector.passphrase }),
                /Decryption failed/
            );
        });

        it('rejects the legacy YAML artifact format with an explicit error', async () => {
            const serialized = tamper(2, () =>
                Buffer.from('---\niv: !binary |-\n  AAAA\n', 'utf8').toString('base64')
            );
            await assertRejects(
                decryptWithKeyDerivedFromString({ serialized, passphrase: vector.passphrase }),
                /Unsupported legacy cryppo serialization format/
            );
        });

        it('rejects a payload that is not a passphrase-derived envelope', async () => {
            await assertRejects(
                decryptWithKeyDerivedFromString({ serialized: 'Aes256Gcm.abc.def', passphrase: 'k' }),
                /Unsupported cryppo serialization format/
            );
            await assertRejects(
                decryptWithKeyDerivedFromString({ serialized: '', passphrase: 'k' }),
                /not a serialized encrypted string/
            );
        });

        it('rejects an unsupported cipher strategy', async () => {
            await assertRejects(
                encryptWithKeyDerivedFromString({
                    passphrase: 'k',
                    data: utf8ToBytes('payload'),
                    strategy: 'AES-CBC',
                }),
                /Unsupported cipher strategy/
            );
        });
    });

    describe('empty input', () => {
        it('serializes empty data the way cryppo did', async () => {
            const { serialized } = await encryptWithKeyDerivedFromString({
                passphrase: 'k',
                data: new Uint8Array(0),
                strategy: CipherStrategy.AES_GCM,
            });
            // cryppo emitted a null payload and still appended the derivation segment
            assert.isTrue(serialized.startsWith('null.Pbkdf2Hmac.'));
            await assertRejects(
                decryptWithKeyDerivedFromString({ serialized, passphrase: 'k' }),
                /Unsupported cryppo serialization format/
            );
        });
    });

    describe('utf8 helpers', () => {
        it('round-trips unicode text', () => {
            const text = 'Привет 🌍 – naïve façade 中文';
            assert.equal(bytesToUtf8(utf8ToBytes(text)), text);
        });
    });
});
