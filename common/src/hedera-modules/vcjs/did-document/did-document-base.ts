import { IDidDocument, SignatureType } from '@guardian/interfaces';
import { DidDocumentProperties } from './types/did-document-properties';
import { DidDocumentContext } from './did-document-context';
import { DidBase } from './did-base';
import { HederaDid } from './hedera-did';
import { DidDocumentMethod } from './did-document-method';
import { Hashing } from '../../hashing';

/**
 * Did document base
 */
export class DidDocumentBase {
    /**
     * DID document context
     */
    public static readonly DID_DOCUMENT_CONTEXT = 'https://www.w3.org/ns/did/v1';
    /**
     * DID document transmute context
     */
    public static readonly DID_DOCUMENT_TRANSMUTE_CONTEXT = 'https://ns.did.ai/transmute/v1';

    /**
     * Context
     * @private
     */
    protected context: DidDocumentContext;

    /**
     * DID
     * @private
     */
    protected did: HederaDid | DidBase;

    /**
     * Verification method
     * @private
     */
    protected verificationMethod: DidDocumentMethod[];

    protected constructor() {
    }

    /**
     * Get DID
     */
    public getDid(): string {
        return this.did?.toString();
    }

    protected static _from<T extends DidDocumentBase>(document: IDidDocument, result: T): T {
        const context = document[DidDocumentProperties.CONTEXT];
        const did = document[DidDocumentProperties.ID];
        const alsoKnownAs = document[DidDocumentProperties.ALSO_KNOWN_AS];
        const controller = document[DidDocumentProperties.CONTROLLER];
        const verificationMethod = document[DidDocumentProperties.VERIFICATION_METHOD];
        const authentication = document[DidDocumentProperties.AUTHENTICATION];
        const assertionMethod = document[DidDocumentProperties.ASSERTION_METHOD];
        const keyAgreement = document[DidDocumentProperties.KEY_AGREEMENT];
        const capabilityInvocation = document[DidDocumentProperties.CAPABILITY_INVOCATION];
        const capabilityDelegation = document[DidDocumentProperties.CAPABILITY_DELEGATION];
        const service = document[DidDocumentProperties.SERVICE];

        //Context
        result.context = DidDocumentContext.from(context);

        //DID
        if (HederaDid.implement(did)) {
            result.did = HederaDid.from(did);
        } else {
            result.did = DidBase.from(did);
        }

        //Verification Method
        result.verificationMethod = [];
        if (Array.isArray(verificationMethod)) {
            result.verificationMethod.push(DidDocumentMethod.from(verificationMethod));
        }

        return result;
    }

    public static from(document: IDidDocument): DidDocumentBase {
        if (typeof document !== 'object') {
            throw new Error('Invalid document format');
        }

        const result = new DidDocumentBase();
        return DidDocumentBase._from(document, result);
    }

    /**
     * Get document
     */
    public getDocument(): IDidDocument {
        return this.toObject(false);
    }

    /**
     * Get document
     */
    public getPrivateDocument(): IDidDocument {
        return this.toObject(true);
    }

    /**
     * Get document
     */
    public toObject(privateKey: boolean = false): IDidDocument {
        const result: any = {};

        //Context
        if (!this.context.isEmpty()) {
            result[DidDocumentProperties.CONTEXT] = this.context.toObject();
        }

        //DID
        result[DidDocumentProperties.ID] = this.did.toString();

        //Verification Method
        if (Array.isArray(this.verificationMethod)) {
            result[DidDocumentProperties.VERIFICATION_METHOD] =
                this.verificationMethod.map(vm => vm.toObject(privateKey));
        }

        // result[DidDocumentProperties.ALSO_KNOWN_AS]=
        // result[DidDocumentProperties.CONTROLLER]=
        // result[DidDocumentProperties.AUTHENTICATION]=
        // result[DidDocumentProperties.ASSERTION_METHOD]=
        // result[DidDocumentProperties.KEY_AGREEMENT]=
        // result[DidDocumentProperties.CAPABILITY_INVOCATION]=
        // result[DidDocumentProperties.CAPABILITY_DELEGATION]=
        // result[DidDocumentProperties.SERVICE]=
        return result;
    }

    /**
     * To credential hash
     */
    public toCredentialHash(): string {
        const map = this.getDocument();
        const json: string = JSON.stringify(map);
        const hash: Uint8Array = Hashing.sha256.digest(json);
        return Hashing.base58.encode(hash);
    }

    /**
     * Get verification methods
     *
     */
    public getVerificationMethods(): DidDocumentMethod[] {
        return Array.isArray(this.verificationMethod) ? this.verificationMethod : [];
    }

    /**
     * Get verification method by type
     *
     * @param {SignatureType} type - Signature type
     */
    public getMethodByType(type: SignatureType): DidDocumentMethod | null {
        if (Array.isArray(this.verificationMethod)) {
            for (const method of this.verificationMethod) {
                if (method.getType() === type) {
                    return method;
                }
            }
        }
        return null;
    }

    /**
     * Get verification method by name
     *
     * @param {string} id - method name
     */
    public getMethodByName(id: string): DidDocumentMethod | null {
        if (Array.isArray(this.verificationMethod)) {
            for (const method of this.verificationMethod) {
                if (method.getId() === id) {
                    return method;
                }
            }
        }
        return null;
    }

    /**
     * Set private key
     * 
     * @param {string} verificationMethod - method name
     * @param {string} privateKey - private key
     */
    public setPrivateKey(verificationMethod: string, privateKey: any): void {
        if (Array.isArray(this.verificationMethod)) {
            for (const method of this.verificationMethod) {
                if (method.getId() === verificationMethod) {
                    method.setPrivateKey(privateKey);
                }
            }
        }
    }
}