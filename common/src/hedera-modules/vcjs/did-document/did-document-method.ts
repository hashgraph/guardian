import { PrivateKey } from '@hashgraph/sdk';
import { VerificationMethodProperties } from './types/verification-method-properties';
import { Bls12381G2KeyPair } from '@mattrglobal/jsonld-signatures-bbs';
import { Hashing } from '../../hashing';
import { IVerificationMethod } from '@guardian/interfaces';

/**
 * Did document method
 */
export class DidDocumentMethod {
    /**
     * Id
     * @protected
     */
    protected id: string;

    /**
     * Controller
     * @protected
     */
    protected controller: string;

    /**
     * Type
     * @protected
     */
    protected type: string;

    /**
     * Network
     * @protected
     */
    protected publicKeyJwk: string | undefined;

    /**
     * Network
     * @protected
     */
    protected publicKeyMultibase: string | undefined;

    /**
     * Network
     * @protected
     */
    protected publicKeyBase58: string | undefined;

    /**
     * Name
     * @protected
     */
    protected name: string;

    /**
     * Get ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Get type
     */
    public getType(): string {
        return this.type;
    }

    /**
     * Get controller
     */
    public getController(): string {
        return this.controller;
    }

    /**
     * Get method
     */
    public getMethod(): string {
        return this.name;
    }

    /**
     * Has private key
     */
    public hasPrivateKey(): boolean {
        return false;
    }

    /**
     * Set private key
     */
    public setPrivateKey(privateKey: any): void {
        throw new Error('Method not implemented.');
    }

    /**
     * Set private key
     */
    public getPrivateKey(): any {
        throw new Error('Method not implemented.');
    }

    /**
     * Convert method to object
     * @param privateKey
     */
    public toObject(privateKey: boolean = false): IVerificationMethod {
        const result: any = {};
        result[VerificationMethodProperties.ID] = this.id;
        result[VerificationMethodProperties.TYPE] = this.type;
        result[VerificationMethodProperties.CONTROLLER] = this.controller;
        if (this.publicKeyJwk) {
            result[VerificationMethodProperties.PUBLIC_KEY_JWK] = this.publicKeyJwk;
        }
        if (this.publicKeyMultibase) {
            result[VerificationMethodProperties.PUBLIC_KEY_MULTIBASE] = this.publicKeyMultibase;
        }
        if (this.publicKeyBase58) {
            result[VerificationMethodProperties.PUBLIC_KEY_BASE58] = this.publicKeyBase58;
        }
        return result;
    }

    /**
     * From
     * @param method
     */
    public static from(method: any): DidDocumentMethod {
        const id = method[VerificationMethodProperties.ID];
        const controller = method[VerificationMethodProperties.CONTROLLER];
        const type = method[VerificationMethodProperties.TYPE];
        const publicKeyJwk = method[VerificationMethodProperties.PUBLIC_KEY_JWK];
        const publicKeyMultibase = method[VerificationMethodProperties.PUBLIC_KEY_MULTIBASE];
        const publicKeyBase58 = method[VerificationMethodProperties.PUBLIC_KEY_BASE58];

        const result = new DidDocumentMethod();
        if (typeof id === 'string') {
            result.id = id;
        } else {
            throw new Error('Invalid method format');
        }
        if (typeof controller === 'string') {
            result.controller = controller;
        } else {
            throw new Error('Invalid method format');
        }
        if (typeof type === 'string') {
            result.type = type;
        } else {
            throw new Error('Invalid method format');
        }
        if (publicKeyJwk) {
            result.publicKeyJwk = publicKeyJwk;
        }
        if (publicKeyJwk) {
            result.publicKeyMultibase = publicKeyMultibase;
        }
        if (publicKeyJwk) {
            result.publicKeyBase58 = publicKeyBase58;
        }
        result.name = id.replace(controller, '');
        return result;
    }
}

export class HederaBBSMethod extends DidDocumentMethod {
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

export class HederaEd25519Method extends DidDocumentMethod {
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