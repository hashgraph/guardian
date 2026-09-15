/**
 * Password-derived AES-256-GCM encryption, wire-compatible with `@meeco/cryppo`.
 *
 * Replaces the `@meeco/cryppo` dependency with the small part of it Guardian used. It MUST keep
 * reading the existing format: Hedera messages and IPFS documents published since 2023 were
 * encrypted with cryppo 2.x/3.x and cannot be re-encrypted.
 *
 * NOTE: this is a copy of the canonical `common/src/helpers/cryppo/index.ts` - the two trees
 * have separate dependency graphs, so keep them in sync. Only the decrypt path is used here; the
 * indexer never encrypts. The generated fixtures in both test suites pin the wire format.
 *
 * Wire format, five dot-separated segments:
 *
 *     Aes256Gcm.safe64(ciphertext).safe64("A" + BSON{iv,at,ad}).Pbkdf2Hmac.safe64("K" + BSON{iv,i,l,hash})
 *
 * - `safe64` is base64 with `+`->`-` and `/`->`_`, padding RETAINED (Ruby `urlsafe_encode64`).
 * - Encryption artifacts (version byte `A`): `iv`, `at` the GCM tag, `ad` the literal `"none"`,
 *   which is passed as AAD rather than omitted.
 * - Derivation artifacts (version byte `K`): `iv` is the salt, `i` iterations, `l` key length,
 *   `hash` the PBKDF2 digest name.
 * - The key is PBKDF2-HMAC-SHA256 over the UTF-8 bytes of the passphrase.
 *
 * cryppo's legacy YAML artifacts and UTF-16 passphrase fallback are rejected explicitly: both
 * cryppo majors defaulted to BSON artifacts and UTF-8 keys, so no published document uses them.
 */

const ENCRYPTION_STRATEGY = 'Aes256Gcm';
const KEY_DERIVATION_STRATEGY = 'Pbkdf2Hmac';
const ENCRYPTION_ARTIFACTS_VERSION = 'A';
const DERIVATION_ARTIFACTS_VERSION = 'K';

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
 * Recent TypeScript lib definitions reject a `Uint8Array` view over an arbitrary buffer where
 * WebCrypto wants a `BufferSource`, so hand it a standalone ArrayBuffer. Payloads are small.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new ArrayBuffer(bytes.length);
    new Uint8Array(copy).set(bytes);
    return copy;
}

function encodeSafe64(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    // Padding is kept deliberately - see the format note above.
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

/** The leading int32 is the document length, including itself and the null terminator. */
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

/** Callers pass entries because field order has to reproduce cryppo's exact bytes. */
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

/**
 * Indexing with a variable key satisfies both `common`'s `no-string-literal` lint rule and the
 * indexer frontend's `noPropertyAccessFromIndexSignature`.
 */
function bsonBytes(document: BsonDocument, field: string): Uint8Array {
    return document[field] as Uint8Array;
}

function bsonNumber(document: BsonDocument, field: string): number {
    return document[field] as number;
}

function bsonText(document: BsonDocument, field: string, fallback: string): string {
    return (document[field] as string) || fallback;
}

export function writeArtifacts(versionByte: string, fields: [string, BsonValue][]): string {
    return encodeSafe64(concatBytes([utf8ToBytes(versionByte), writeBsonDocument(fields)]));
}

function randomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
}

/** cryppo stores the digest as 'SHA256'; WebCrypto wants 'SHA-256'. */
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

/** Encrypts `data` with AES-256-GCM under a key derived from `passphrase`. */
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

    // cryppo emits the literal string 'null' as the payload for empty input. Kept for parity.
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

    // WebCrypto appends the tag; cryppo stores it as a separate artifact.
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
 * Decrypts a cryppo envelope. Returns null for an empty payload, and throws if the passphrase is
 * wrong or the payload was tampered with.
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
        bsonBytes(derivation, 'iv'),
        bsonNumber(derivation, 'i'),
        bsonNumber(derivation, 'l'),
        bsonText(derivation, 'hash', DEFAULT_HASH),
        'decrypt'
    );

    // WebCrypto expects the tag appended to the ciphertext.
    const sealed = concatBytes([decodeSafe64(payload), bsonBytes(artifacts, 'at')]);
    try {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: CipherStrategy.AES_GCM,
                iv: toArrayBuffer(bsonBytes(artifacts, 'iv')),
                additionalData: toArrayBuffer(utf8ToBytes(bsonText(artifacts, 'ad', ''))),
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
