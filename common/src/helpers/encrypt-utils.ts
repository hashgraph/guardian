import {
    CipherStrategy,
    decryptWithKeyDerivedFromString,
    encryptWithKeyDerivedFromString,
} from '@meeco/cryppo';
import { SerializationFormat } from '@meeco/cryppo/dist/src/serialization-versions.js';

export class EncryptUtils {
    public static async encrypt(data: ArrayBuffer, key: string): Promise<ArrayBuffer> {
        if (!key) {
            throw new Error('There is no appropriate private key to encode data');
        }

        const decryptedData = Buffer.from(data);
        const result = await encryptWithKeyDerivedFromString({
            passphrase: key,
            data: new Uint8Array(decryptedData),
            strategy: CipherStrategy.AES_GCM,
            serializationVersion: SerializationFormat.latest_version,
        });
        const encryptedSerialized = result.serialized;
        const encryptedData = Buffer.from(encryptedSerialized, 'utf8');

        return encryptedData as any;
    }

    public static async decrypt(data: ArrayBuffer, key: string): Promise<ArrayBuffer> {
        const encryptedData = Buffer.from(data);

        const result = await decryptWithKeyDerivedFromString({
            serialized: encryptedData.toString('utf8'),
            passphrase: key,
        });
        const decryptedData = Buffer.from(result);

        return decryptedData as any;
    }
}