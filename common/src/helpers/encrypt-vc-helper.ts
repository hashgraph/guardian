import {
    bytesToUtf8,
    CipherStrategy,
    decryptWithKeyDerivedFromString,
    encryptWithKeyDerivedFromString,
    utf8ToBytes,
} from '@meeco/cryppo';
import { SerializationFormat } from '@meeco/cryppo/dist/src/serialization-versions.js';

export class EncryptVcHelper {
    public static async encrypt(document: string, key: string): Promise<string> {
        if (!key) {
            throw new Error('There is no appropriate private key to encode VC data');
        }
        const encryptedDocument = await encryptWithKeyDerivedFromString({
            passphrase: key,
            data: utf8ToBytes(document),
            strategy: CipherStrategy.AES_GCM,
            serializationVersion: SerializationFormat.latest_version,
        });
        return encryptedDocument.serialized;
    }

    public static async decrypt(document: string, key: string): Promise<string> {
        const decrypted = await decryptWithKeyDerivedFromString({
            serialized: document,
            passphrase: key,
        });
        return bytesToUtf8(decrypted);
    }
}
