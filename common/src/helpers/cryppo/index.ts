/**
 * Password-derived AES-256-GCM encryption, wire-compatible with `@meeco/cryppo`.
 *
 * This replaces the `@meeco/cryppo` dependency (and its `node-forge` / `bson` / `yaml`
 * transitive tree) with the ~1% of it Guardian actually used. It MUST keep reading the
 * existing serialized format: Hedera messages and IPFS documents published since 2023 were
 * encrypted with cryppo 2.x/3.x and cannot be re-encrypted.
 *
 * NOTE: a byte-compatible copy of this module lives at
 * `indexer-frontend/src/app/utils/cryppo.ts`. The two trees have separate dependency graphs
 * (the indexer frontend does not link Guardian's `common`), so the code is duplicated on
 * purpose - keep the two files in sync. The generated fixture vectors in both test suites
 * (`common/tests/fixtures/cryppo/legacy-vectors.json`) pin the shared wire format.
 *
 * Wire format, five dot-separated segments:
 *
 *     Aes256Gcm.safe64(ciphertext).safe64("A" + BSON{iv,at,ad}).Pbkdf2Hmac.safe64("K" + BSON{iv,i,l,hash})
 *
 * - `safe64` is base64 with `+`->`-` and `/`->`_`, padding RETAINED (cryppo mirrors Ruby's
 *   `Base64.urlsafe_encode64`, which keeps the `=`).
 * - Encryption artifacts (version byte `A`): `iv` 12 random bytes, `at` the 128-bit GCM tag,
 *   `ad` the literal string `"none"` - it is passed as AAD, not omitted.
 * - Derivation artifacts (version byte `K`): `iv` is the salt (20 random bytes), `i` the
 *   iteration count, `l` the derived key length, `hash` the PBKDF2 digest name.
 * - The key is PBKDF2-HMAC-SHA256 over the UTF-8 bytes of the passphrase.
 *
 * cryppo's legacy YAML artifact serialization and its UTF-16 passphrase fallback are not
 * implemented: both cryppo majors default to BSON artifacts and UTF-8 keys, and Guardian never
 * selected anything else, so no published document can use them. They are detected and
 * rejected explicitly rather than failing as a corrupt payload.
 */

const ENCRYPTION_STRATEGY = 'Aes256Gcm';
const KEY_DERIVATION_STRATEGY = 'Pbkdf2Hmac';
const ENCRYPTION_ARTIFACTS_VERSION = 'A';
const DERIVATION_ARTIFACTS_VERSION = 'K';

/** cryppo passes the literal string 'none' as AES-GCM additional authenticated data. */
const ADDITIONAL_DATA = 'none';
const IV_LENGTH = 12;
const TAG_LENGTH_BITS = 128;
const SALT_LENGTH = 20;
const MIN_ITERATIONS = 20000;
const ITERATION_VARIANCE_PERCENT = 10;
const KEY_LENGTH = 32;
const DEFAULT_HASH = 'SHA256';

export enum CipherStrategy {
    AES_GCM = 'AES-GCM',
}

export interface IEncryptOptions {
    passphrase: string;
    data: Uint8Array;
    strategy?: CipherStrategy;
}

export interface IDecryptOptions {
    serialized: string;
    passphrase: string;
}

export interface IEncryptResult {
    serialized: string;
}

/** BSON values that appear in cryppo artifacts: binary, int32 and UTF-8 string. */
export type BsonValue = Uint8Array | number | string;
export type BsonDocument = Record<string, BsonValue>;

const BSON_TYPE_STRING = 0x02;
const BSON_TYPE_BINARY = 0x05;
const BSON_TYPE_INT32 = 0x10;

export function utf8ToBytes(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

export function bytesToUtf8(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
    let length = 0;
    for (const chunk of chunks) {
        length += chunk.length;
    }
    const result = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

/**
 * WebCrypto's `BufferSource` will not accept a `Uint8Array` view over an arbitrary buffer under
 * recent TypeScript lib definitions, so hand it a standalone ArrayBuffer. The payloads here are
 * small enough that the copy is irrelevant, and this keeps the file compiling on both the
 * TypeScript version used by `common` and the older one used by the indexer frontend.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new ArrayBuffer(bytes.length);
    new Uint8Array(copy).set(bytes);
    return copy;
}

function encodeSafe64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    // Padding is intentionally kept - see the format note above.
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeSafe64(text: string): Uint8Array {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Minimal BSON reader covering the three value types cryppo artifacts use. The leading int32
 * is the total document length (including itself and the trailing null terminator).
 */
function readBsonDocument(bytes: Uint8Array): BsonDocument {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const documentLength = view.getInt32(0, true);
    if (documentLength !== bytes.length) {
        throw new Error('Malformed cryppo artifacts: BSON length mismatch');
    }
    const document: BsonDocument = {};
    let offset = 4;
    while (offset < bytes.length - 1) {
        const type = bytes[offset++];
        let nameEnd = offset;
        while (bytes[nameEnd] !== 0x00) {
            nameEnd++;
        }
        const name = bytesToUtf8(bytes.subarray(offset, nameEnd));
        offset = nameEnd + 1;
        switch (type) {
            case BSON_TYPE_BINARY: {
                const length = view.getInt32(offset, true);
                // 4 length bytes then a subtype byte, which cryppo always writes as 0x00.
                offset += 5;
                document[name] = bytes.subarray(offset, offset + length);
                offset += length;
                break;
            }
            case BSON_TYPE_STRING: {
                const length = view.getInt32(offset, true);
                offset += 4;
                document[name] = bytesToUtf8(bytes.subarray(offset, offset + length - 1));
                offset += length;
                break;
            }
            case BSON_TYPE_INT32: {
                document[name] = view.getInt32(offset, true);
                offset += 4;
                break;
            }
            default:
                throw new Error(`Unsupported BSON type 0x${type.toString(16)} in cryppo artifacts`);
        }
    }
    return document;
}

/**
 * Minimal BSON writer. Field order is significant for reproducing cryppo's exact bytes, so
 * callers pass entries rather than an object.
 */
function writeBsonDocument(fields: [string, BsonValue][]): Uint8Array {
    const chunks: Uint8Array[] = [];
    for (const [name, value] of fields) {
        const nameBytes = concatBytes([utf8ToBytes(name), new Uint8Array(1)]);
        if (value instanceof Uint8Array) {
            const header = new Uint8Array(5);
            new DataView(header.buffer).setInt32(0, value.length, true);
            chunks.push(new Uint8Array([BSON_TYPE_BINARY]), nameBytes, header, value);
        } else if (typeof value === 'number') {
            const encoded = new Uint8Array(4);
            new DataView(encoded.buffer).setInt32(0, value, true);
            chunks.push(new Uint8Array([BSON_TYPE_INT32]), nameBytes, encoded);
        } else {
            const stringBytes = utf8ToBytes(value);
            const header = new Uint8Array(4);
            new DataView(header.buffer).setInt32(0, stringBytes.length + 1, true);
            chunks.push(
                new Uint8Array([BSON_TYPE_STRING]),
                nameBytes,
                header,
                stringBytes,
                new Uint8Array(1)
            );
        }
    }
    const body = concatBytes(chunks);
    const length = new Uint8Array(4);
    new DataView(length.buffer).setInt32(0, body.length + 5, true);
    return concatBytes([length, body, new Uint8Array(1)]);
}

/** Exported so the test suite can assert the artifact codec is byte-exact. */
export function readArtifacts(segment: string, versionByte: string): BsonDocument {
    const raw = decodeSafe64(segment);
    if (raw[0] === 0x2d && raw[1] === 0x2d && raw[2] === 0x2d) {
        throw new Error('Unsupported legacy cryppo serialization format: YAML artifacts');
    }
    if (raw[0] !== versionByte.charCodeAt(0)) {
        throw new Error(
            `Unsupported cryppo artifacts version byte, expected '${versionByte}'`
        );
    }
    return readBsonDocument(raw.subarray(1));
}

/** Exported so the test suite can assert the artifact codec is byte-exact. */
export function writeArtifacts(versionByte: string, fields: [string, BsonValue][]): string {
    return encodeSafe64(concatBytes([utf8ToBytes(versionByte), writeBsonDocument(fields)]));
}

function randomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
}

/** cryppo stores the digest in Ruby's naming ('SHA256'); WebCrypto wants 'SHA-256'. */
function toWebCryptoHash(hash: string): string {
    const normalized = /^SHA-?(1|256|384|512)$/i.exec(hash);
    if (!normalized) {
        throw new Error(`Unsupported cryppo key derivation hash '${hash}'`);
    }
    return `SHA-${normalized[1]}`;
}

async function deriveKey(
    passphrase: string,
    salt: Uint8Array,
    iterations: number,
    length: number,
    hash: string,
    usage: KeyUsage
): Promise<CryptoKey> {
    const passphraseKey = await crypto.subtle.importKey(
        'raw',
        toArrayBuffer(utf8ToBytes(passphrase)),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations, hash: toWebCryptoHash(hash) },
        passphraseKey,
        length * 8
    );
    return crypto.subtle.importKey('raw', bits, CipherStrategy.AES_GCM, false, [usage]);
}

/**
 * Derive a key from `passphrase` and encrypt `data` with AES-256-GCM, returning the cryppo
 * serialized envelope.
 */
export async function encryptWithKeyDerivedFromString({
    passphrase,
    data,
    strategy = CipherStrategy.AES_GCM,
}: IEncryptOptions): Promise<IEncryptResult> {
    if (strategy !== CipherStrategy.AES_GCM) {
        throw new Error(`Unsupported cipher strategy '${strategy}'`);
    }

    const salt = randomBytes(SALT_LENGTH);
    const variance = Math.floor((MIN_ITERATIONS * ITERATION_VARIANCE_PERCENT) / 100);
    const iterations = MIN_ITERATIONS + Math.floor(Math.random() * variance);
    const serializedKey = `${KEY_DERIVATION_STRATEGY}.${writeArtifacts(
        DERIVATION_ARTIFACTS_VERSION,
        [
            ['iv', salt],
            ['i', iterations],
            ['l', KEY_LENGTH],
            ['hash', DEFAULT_HASH],
        ]
    )}`;

    // cryppo returns a null payload for empty input and still appends the derivation
    // segment, producing the literal string 'null' as the first half. Kept for parity.
    if (!data || data.length === 0) {
        return { serialized: `${null}.${serializedKey}` };
    }

    const key = await deriveKey(passphrase, salt, iterations, KEY_LENGTH, DEFAULT_HASH, 'encrypt');
    const iv = randomBytes(IV_LENGTH);
    const sealed = new Uint8Array(
        await crypto.subtle.encrypt(
            {
                name: CipherStrategy.AES_GCM,
                iv: toArrayBuffer(iv),
                additionalData: toArrayBuffer(utf8ToBytes(ADDITIONAL_DATA)),
                tagLength: TAG_LENGTH_BITS,
            },
            key,
            toArrayBuffer(data)
        )
    );

    // WebCrypto appends the authentication tag; cryppo stores it as a separate artifact.
    const tagLength = TAG_LENGTH_BITS / 8;
    const encrypted = sealed.subarray(0, sealed.length - tagLength);
    const tag = sealed.subarray(sealed.length - tagLength);

    const artifacts = writeArtifacts(ENCRYPTION_ARTIFACTS_VERSION, [
        ['iv', iv],
        ['at', tag],
        ['ad', ADDITIONAL_DATA],
    ]);

    return {
        serialized: `${ENCRYPTION_STRATEGY}.${encodeSafe64(encrypted)}.${artifacts}.${serializedKey}`,
    };
}

/**
 * Decrypt a cryppo serialized envelope using a key derived from `passphrase`. Returns null for
 * an empty payload, and throws if the passphrase is wrong or the payload has been tampered with.
 */
export async function decryptWithKeyDerivedFromString({
    serialized,
    passphrase,
}: IDecryptOptions): Promise<Uint8Array | null> {
    if (!serialized) {
        throw new Error('String is not a serialized encrypted string');
    }
    const segments = serialized.split('.');
    if (segments.length !== 5) {
        throw new Error(
            'Unsupported cryppo serialization format: expected a passphrase-derived envelope'
        );
    }
    const [strategy, payload, encryptionArtifacts, derivationStrategy, derivationArtifacts] =
        segments;
    if (strategy !== ENCRYPTION_STRATEGY) {
        throw new Error(`Unsupported cryppo encryption strategy '${strategy}'`);
    }
    if (derivationStrategy !== KEY_DERIVATION_STRATEGY) {
        throw new Error(`Unsupported cryppo key derivation strategy '${derivationStrategy}'`);
    }
    if (payload === '') {
        return null;
    }

    const derivation = readArtifacts(derivationArtifacts, DERIVATION_ARTIFACTS_VERSION);
    const artifacts = readArtifacts(encryptionArtifacts, ENCRYPTION_ARTIFACTS_VERSION);

    const key = await deriveKey(
        passphrase,
        derivation['iv'] as Uint8Array,
        derivation['i'] as number,
        derivation['l'] as number,
        (derivation['hash'] as string) || DEFAULT_HASH,
        'decrypt'
    );

    // AES-GCM in WebCrypto expects the authentication tag appended to the ciphertext.
    const sealed = concatBytes([decodeSafe64(payload), artifacts['at'] as Uint8Array]);
    try {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: CipherStrategy.AES_GCM,
                iv: toArrayBuffer(artifacts['iv'] as Uint8Array),
                additionalData: toArrayBuffer(utf8ToBytes((artifacts['ad'] as string) || '')),
                tagLength: TAG_LENGTH_BITS,
            },
            key,
            toArrayBuffer(sealed)
        );
        return new Uint8Array(decrypted);
    } catch (error) {
        throw new Error('Decryption failed', { cause: error });
    }
}
