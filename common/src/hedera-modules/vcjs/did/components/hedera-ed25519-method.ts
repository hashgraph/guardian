import { PrivateKey } from '@hashgraph/sdk';
import { Hashing } from '../../../hashing';
import { VerificationMethod } from './verification-method';

export class HederaEd25519Method extends VerificationMethod {
    /**
     * DID root key name
     */
    public static readonly DID_ROOT_KEY_NAME = '#did-root-key';

    /**
     * DID root key type
     */
    public static readonly DID_ROOT_KEY_TYPE = 'Ed25519VerificationKey2018';

    /**
     * Method type
     */
    public static readonly TYPE = 'Ed25519VerificationKey2018';

    /**
     * Get private key
     */
    public override getPrivateKey(): string {
        return this.privateKeyBase58;
    }

    /**
     * Set private key
     */
    public override setPrivateKey(privateKeyBase58: string) {
        this.privateKeyBase58 = privateKeyBase58;
    }

    /**
     * Generate KeyPair
     * @param did
     * @param key
     */
    public static async generateKeyPair(
        did: string,
        key: PrivateKey | string
    ) {
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
        return {
            id: did + HederaEd25519Method.DID_ROOT_KEY_NAME,
            controller: did,
            type: HederaEd25519Method.DID_ROOT_KEY_TYPE,
            publicKey: Hashing.base58.encode(publicKey.toBytes()),
            privateKey: Hashing.base58.encode(secretKey)
        }
    }

    /**
     * Generate by private key
     * @param did
     * @param key
     */
    public static async generate(
        did: string,
        key: PrivateKey | string
    ): Promise<HederaEd25519Method> {
        const keyPair = await HederaEd25519Method.generateKeyPair(did, key);
        const result = new HederaEd25519Method();
        result.id = keyPair.id;
        result.controller = keyPair.controller;
        result.type = keyPair.type;
        result.publicKeyBase58 = keyPair.publicKey;
        result.privateKeyBase58 = keyPair.privateKey;
        result.name = HederaEd25519Method.DID_ROOT_KEY_NAME;
        return result;
    }

    /**
     * Get default id
     * @param controller
     */
    public static defaultId(controller: string): string {
        return controller + HederaEd25519Method.DID_ROOT_KEY_NAME;
    }
}
