import { IVerificationMethod } from '../types/did-document';
import { VerificationMethodProperties } from '../types/verification-method-properties';

/**
 * Did document method
 */
export class VerificationMethod {
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
     * Public Key
     * @protected
     */
    protected publicKeyJwk: string | undefined;

    /**
     * Public Key
     * @protected
     */
    protected publicKeyMultibase: string | undefined;

    /**
     * Public Key
     * @protected
     */
    protected publicKeyBase58: string | undefined;

    /**
     * Private Key
     * @protected
     */
    protected privateKeyJwk: string | undefined;

    /**
     * Private Key
     * @protected
     */
    protected privateKeyMultibase: string | undefined;

    /**
     * Private Key
     * @protected
     */
    protected privateKeyBase58: string | undefined;

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
     * Get name
     */
    public getName(): string {
        return this.name;
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
        return !!(this.privateKeyJwk || this.privateKeyMultibase || this.privateKeyBase58);
    }

    /**
     * Get private key
     */
    public getPrivateKey(): any {
        if (this.privateKeyJwk) {
            return this.privateKeyJwk;
        }
        if (this.privateKeyMultibase) {
            return this.privateKeyMultibase;
        }
        if (this.privateKeyBase58) {
            return this.privateKeyBase58;
        }
    }

    /**
     * Set private key
     */
    public setPrivateKey(privateKey: any) {
        if (this.publicKeyJwk) {
            this.privateKeyJwk = privateKey;
        }
        if (this.publicKeyMultibase) {
            this.privateKeyMultibase = privateKey;
        }
        if (this.publicKeyBase58) {
            this.privateKeyBase58 = privateKey;
        }
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
        if (privateKey && this.privateKeyJwk) {
            result[VerificationMethodProperties.PRIVATE_KEY_JWK] = this.privateKeyJwk;
        }
        if (privateKey && this.privateKeyMultibase) {
            result[VerificationMethodProperties.PRIVATE_KEY_MULTIBASE] = this.privateKeyMultibase;
        }
        if (privateKey && this.privateKeyBase58) {
            result[VerificationMethodProperties.PRIVATE_KEY_BASE58] = this.privateKeyBase58;
        }
        return result;
    }

    /**
     * From
     * @param method
     */
    public static from(method: IVerificationMethod): VerificationMethod {
        const id = method[VerificationMethodProperties.ID];
        const controller = method[VerificationMethodProperties.CONTROLLER];
        const type = method[VerificationMethodProperties.TYPE];
        const publicKeyJwk = method[VerificationMethodProperties.PUBLIC_KEY_JWK];
        const publicKeyMultibase = method[VerificationMethodProperties.PUBLIC_KEY_MULTIBASE];
        const publicKeyBase58 = method[VerificationMethodProperties.PUBLIC_KEY_BASE58];
        const privateKeyJwk = method[VerificationMethodProperties.PRIVATE_KEY_JWK];
        const privateKeyMultibase = method[VerificationMethodProperties.PRIVATE_KEY_MULTIBASE];
        const privateKeyBase58 = method[VerificationMethodProperties.PRIVATE_KEY_BASE58];
        const result = new VerificationMethod();
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
        if (publicKeyMultibase) {
            result.publicKeyMultibase = publicKeyMultibase;
        }
        if (publicKeyBase58) {
            result.publicKeyBase58 = publicKeyBase58;
        }
        if (privateKeyJwk) {
            result.privateKeyJwk = privateKeyJwk;
        }
        if (privateKeyMultibase) {
            result.privateKeyMultibase = privateKeyMultibase;
        }
        if (privateKeyBase58) {
            result.privateKeyBase58 = privateKeyBase58;
        }
        result.name = id.replace(controller, '');
        return result;
    }

    /**
     * From array (without links)
     * @param methods
     */
    public static fromArray(methods: IVerificationMethod[]): VerificationMethod[]
    /**
     * From array (with links)
     * @param methods
     * @param containsLinks
     */
    public static fromArray(methods: (IVerificationMethod | string)[], containsLinks: boolean): (VerificationMethod | string)[]
    public static fromArray(...arg: any[]) {
        const methods = arg[0] as (IVerificationMethod | string)[];
        const containsLinks = arg[1] === true;
        const result: (VerificationMethod | string)[] = [];
        for (const method of methods) {
            if (typeof method === 'object') {
                result.push(VerificationMethod.from(method));
            } else if (typeof method === 'string' && containsLinks) {
                result.push(method);
            }
        }
        return result;
    }
}

