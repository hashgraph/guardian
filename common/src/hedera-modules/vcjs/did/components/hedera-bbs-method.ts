import { PrivateKey } from '@hashgraph/sdk';
import { Bls12381G2KeyPair } from '@mattrglobal/jsonld-signatures-bbs';
import { VerificationMethod } from './verification-method';

export class HederaBBSMethod extends VerificationMethod {
    /**
     * DID root key name
     */
    public static readonly DID_ROOT_KEY_NAME = '#did-root-key-bbs';

    /**
     * DID root key type
     */
    public static readonly DID_ROOT_KEY_TYPE = 'Bls12381G2Key2020';

    /**
     * Method type
     */
    public static readonly TYPE = 'Bls12381G2Key2020';

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
     * @param did
     * @param key
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
     * @param controller
     */
    public static defaultId(controller: string): string {
        return controller + HederaBBSMethod.DID_ROOT_KEY_NAME;
    }
}
