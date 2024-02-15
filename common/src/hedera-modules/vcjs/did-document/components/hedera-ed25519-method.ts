import { PrivateKey } from '@hashgraph/sdk';
import { Hashing } from '../../../hashing';
import { HederaBBSMethod } from './hedera-bbs-method';
import { VerificationMethod } from './verification-method';


export class HederaEd25519Method extends VerificationMethod {
    /**
     * DID root key name
     */
    public static DID_ROOT_KEY_NAME = '#did-root-key';

    /**
     * DID root key type
     */
    public static DID_ROOT_KEY_TYPE = 'Ed25519VerificationKey2018';

    /**
     * Generate by private key
     * @param did
     * @param key
     */
    public static async generate(
        did: string,
        key: PrivateKey | string
    ): Promise<HederaEd25519Method> {
        if (!did) {
            throw new Error('DID cannot be ' + did);
        }
        if (!key) {
            throw new Error('DID root key cannot be ' + key);
        }
        const privateKey = typeof key === 'string' ? PrivateKey.fromString(key) : key;
        const publicKey = privateKey.publicKey;
        const privateBytes = privateKey.toBytes();
        const publicBytes = publicKey.toBytes();
        const secretKey = new Uint8Array(publicBytes.byteLength + privateBytes.byteLength);
        secretKey.set(new Uint8Array(privateBytes), 0);
        secretKey.set(new Uint8Array(publicBytes), privateBytes.byteLength);

        const result = new HederaEd25519Method();
        result.id = did + HederaEd25519Method.DID_ROOT_KEY_NAME;
        result.controller = did;
        result.type = HederaEd25519Method.DID_ROOT_KEY_TYPE;
        result.publicKeyBase58 = Hashing.base58.encode(publicKey.toBytes());
        // result.privateKeyBase58 = Hashing.base58.encode(secretKey);
        // result.privateKey = privateKey;
        // result.publicKey = publicKey;
        result.name = HederaEd25519Method.DID_ROOT_KEY_NAME;
        return result;
    }

    /**
     * Get default id
     * @param controller
     */
    public static defaultId(controller: string): string {
        return controller + HederaBBSMethod.DID_ROOT_KEY_NAME;
    }
}
