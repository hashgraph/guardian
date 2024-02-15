import { PrivateKey } from '@hashgraph/sdk';
import { Bls12381G2KeyPair } from '@mattrglobal/jsonld-signatures-bbs';
import { VerificationMethod } from './verification-method';


export class HederaBBSMethod extends VerificationMethod {
    /**
     * DID root key name
     */
    public static DID_ROOT_KEY_NAME = '#did-root-key-bbs';

    /**
     * DID root key type
     */
    public static DID_ROOT_KEY_TYPE = 'Bls12381G2Key2020';

    /**
     * Generate by private key
     * @param did
     * @param key
     */
    public static async generate(
        did: string,
        key: PrivateKey | string
    ): Promise<HederaBBSMethod> {
        if (!did) {
            throw new Error('DID cannot be ' + did);
        }
        if (!key) {
            throw new Error('DID root key cannot be ' + key);
        }
        const privateKey = typeof key === 'string' ? PrivateKey.fromString(key) : key;
        const publicKey = privateKey.publicKey;
        const generatedKey = await Bls12381G2KeyPair.generate({
            id: did + HederaBBSMethod.DID_ROOT_KEY_NAME,
            controller: did,
            seed: Buffer.from(privateKey.toStringDer())
        });

        const result = new HederaBBSMethod();
        result.id = generatedKey.id;
        result.controller = generatedKey.controller;
        result.type = generatedKey.type;

        result.publicKeyBase58 = generatedKey.publicKey;
        // result.privateKeyBase58 = generatedKey.privateKey;
        // result.privateKey = privateKey;
        // result.publicKey = publicKey;
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
