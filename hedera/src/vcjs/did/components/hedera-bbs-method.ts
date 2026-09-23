import { PrivateKey } from '@hiero-ledger/sdk';
import { Bls12381G2KeyPair } from '@mattrglobal/jsonld-signatures-bbs';
import { VerificationMethod } from './verification-method.js';

/**
 * DID document method (Bls12381G2Key2020)
 * @interface VerificationMethod
 */
export class HederaBBSMethod extends VerificationMethod {
    /**
     * DID root key name
     * @public
     * @static
     */
    public static readonly DID_ROOT_KEY_NAME = '#did-root-key-bbs';

    /**
     * DID root key type
     * @public
     * @static
     */
    public static readonly DID_ROOT_KEY_TYPE = 'Bls12381G2Key2020';

    /**
     * Method type
     * @public
     * @static
     */
    public static readonly TYPE = 'Bls12381G2Key2020';

    /**
     * Get private key
     * @returns {string} - privateKeyBase58
     * @public
     */
    public override getPrivateKey(): string {
        return this.privateKeyBase58;
    }

    /**
     * Set private key
     * @param {string} privateKeyBase58 - privateKey
     * @public
     */
    public override setPrivateKey(privateKeyBase58: string) {
        this.privateKeyBase58 = privateKeyBase58;
    }

    /**
     * Generate KeyPair
     * @param {string} did - Hedera DID
     * @param {PrivateKey | string} key - Hedera private key
     * @returns {Bls12381G2KeyPair} - key pair
     * @public
     * @static
     */
    public static async generateKeyPair(
        did: string,
        key: PrivateKey | string
    ): Promise<Bls12381G2KeyPair> {
        if (!did) {
            throw new Error('DID cannot be ' + did);
        }
        if (!key) {
            throw new Error('DID root key cannot be ' + key);
        }
        const privateKey = typeof key === 'string' ? PrivateKey.fromString(key) : key;
        return await Bls12381G2KeyPair.generate({
            id: did + HederaBBSMethod.DID_ROOT_KEY_NAME,
            controller: did,
            seed: Buffer.from(privateKey.toStringDer())
        });
    }

    /**
     * Generate by private key
     * @param {string} did - Hedera DID
     * @param {PrivateKey | string} key - Hedera private key
     * @returns {HederaBBSMethod} - DID document method
     * @public
     * @static
     */
    public static async generate(
        did: string,
        key: PrivateKey | string
    ): Promise<HederaBBSMethod> {
        const keyPair = await HederaBBSMethod.generateKeyPair(did, key);
        const result = new HederaBBSMethod();
        result.id = keyPair.id;
        result.controller = keyPair.controller;
        result.type = keyPair.type;
        result.publicKeyBase58 = keyPair.publicKey;
        result.privateKeyBase58 = keyPair.privateKey;
        result.name = HederaBBSMethod.DID_ROOT_KEY_NAME;
        return result;
    }

    /**
     * Get default id
     * @param {string} controller - DID
     * @returns {string} - DID document method id
     * @public
     * @static
     */
    public static defaultId(controller: string): string {
        return controller + HederaBBSMethod.DID_ROOT_KEY_NAME;
    }
}
