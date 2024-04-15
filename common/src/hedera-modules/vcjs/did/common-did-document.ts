import { DidDocumentProperties } from './types/did-document-properties.js';
import { DocumentContext } from './components/document-context.js';
import { CommonDid } from './common-did.js';
import { HederaDid } from './hedera-did.js';
import { VerificationMethod } from './components/verification-method.js';
import { Hashing } from '../../hashing.js';
import { DocumentService } from './components/document-service.js';
import { IDidDocument } from './types/did-document.js';

/**
 * Did document base
 */
export class CommonDidDocument {
    /**
     * DID document context
     * @public
     * @static
     */
    public static readonly DID_DOCUMENT_CONTEXT = 'https://www.w3.org/ns/did/v1';
    /**
     * DID document transmute context
     * @public
     * @static
     */
    public static readonly DID_DOCUMENT_TRANSMUTE_CONTEXT = 'https://ns.did.ai/transmute/v1';

    /**
     * Context
     * @protected
     */
    protected context: DocumentContext;

    /**
     * DID
     * @protected
     */
    protected did: HederaDid | CommonDid;

    /**
     * alsoKnownAs
     * @protected
     */
    protected alsoKnownAs: string[];

    /**
     * controller
     * @protected
     */
    protected controller: string | string[];

    /**
     * Verification method
     * @protected
     */
    protected verificationMethod: VerificationMethod[];

    /**
     * Authentication
     * @protected
     */
    protected authentication: (VerificationMethod | string)[];

    /**
     * Assertion Method
     * @protected
     */
    protected assertionMethod: (VerificationMethod | string)[];

    /**
     * Key Agreement
     * @protected
     */
    protected keyAgreement: (VerificationMethod | string)[];

    /**
     * Capability Invocation
     * @protected
     */
    protected capabilityInvocation: (VerificationMethod | string)[];

    /**
     * Capability Delegation
     * @protected
     */
    protected capabilityDelegation: (VerificationMethod | string)[];

    /**
     * Capability Delegation
     * @protected
     */
    protected service: DocumentService[];

    protected constructor() {
    }

    /**
     * Get DID
     * @returns {string} - DID
     * @public
     */
    public getDid(): string {
        return this.did?.toString();
    }

    /**
     * From document
     * @param {IDidDocument} document - DID document
     * @param {CommonDidDocument} result - result
     * @returns {CommonDidDocument} - result
     * @static
     * @protected
     */
    protected static _from<T extends CommonDidDocument>(document: IDidDocument, result: T): T {
        const id = document[DidDocumentProperties.ID];
        const context = document[DidDocumentProperties.CONTEXT];
        const alsoKnownAs = document[DidDocumentProperties.ALSO_KNOWN_AS];
        const controller = document[DidDocumentProperties.CONTROLLER];
        const verificationMethod = document[DidDocumentProperties.VERIFICATION_METHOD];
        const authentication = document[DidDocumentProperties.AUTHENTICATION];
        const assertionMethod = document[DidDocumentProperties.ASSERTION_METHOD];
        const keyAgreement = document[DidDocumentProperties.KEY_AGREEMENT];
        const capabilityInvocation = document[DidDocumentProperties.CAPABILITY_INVOCATION];
        const capabilityDelegation = document[DidDocumentProperties.CAPABILITY_DELEGATION];
        const service = document[DidDocumentProperties.SERVICE];

        //DID
        if (HederaDid.implement(id)) {
            result.did = HederaDid.from(id);
        } else {
            result.did = CommonDid.from(id);
        }

        //context
        result.context = DocumentContext.from(context);

        //alsoKnownAs
        if (Array.isArray(alsoKnownAs)) {
            result.alsoKnownAs = alsoKnownAs;
        }

        //controller
        if (Array.isArray(controller)) {
            result.controller = controller;
        } else if (typeof controller === 'string') {
            result.controller = controller;
        }

        //verificationMethod
        if (Array.isArray(verificationMethod)) {
            result.verificationMethod = VerificationMethod.fromArray(verificationMethod);
        }

        //authentication
        if (Array.isArray(authentication)) {
            result.authentication = VerificationMethod.fromArray(authentication, true);
        }

        //assertionMethod
        if (Array.isArray(assertionMethod)) {
            result.assertionMethod = VerificationMethod.fromArray(assertionMethod, true);
        }

        //keyAgreement
        if (Array.isArray(keyAgreement)) {
            result.keyAgreement = VerificationMethod.fromArray(keyAgreement, true);
        }

        //capabilityInvocation
        if (Array.isArray(capabilityInvocation)) {
            result.capabilityInvocation = VerificationMethod.fromArray(capabilityInvocation, true);
        }

        //capabilityDelegation
        if (Array.isArray(capabilityDelegation)) {
            result.capabilityDelegation = VerificationMethod.fromArray(capabilityDelegation, true);
        }

        //service
        if (Array.isArray(service)) {
            result.service = DocumentService.fromArray(service);
        }

        return result;
    }

    /**
     * From document
     * @param {IDidDocument | string} document - DID document
     * @returns {CommonDidDocument} - DID document
     * @public
     * @static
     */
    public static from(document: IDidDocument | string): CommonDidDocument {
        if (typeof document === 'object') {
            const result = new CommonDidDocument();
            return CommonDidDocument._from(document, result);
        } else if (typeof document === 'string') {
            const result = new CommonDidDocument();
            return CommonDidDocument._from(JSON.parse(document), result);
        } else {
            throw new Error('Invalid document format');
        }
    }

    /**
     * Get document
     * @returns {IDidDocument} - DID Document
     * @public
     */
    public getDocument(): IDidDocument {
        return this.toObject(false);
    }

    /**
     * Get document
     * @returns {IDidDocument} - DID Document
     * @public
     */
    public getPrivateDocument(): IDidDocument {
        return this.toObject(true);
    }

    /**
     * Get document
     * @param {any} privateKey - include private key
     * @returns {IDidDocument} - DID Document
     * @public
     */
    public toObject(privateKey: boolean = false): IDidDocument {
        const result: any = {};

        //DID
        result[DidDocumentProperties.ID] = this.did.toString();

        //context
        if (!this.context.isEmpty()) {
            result[DidDocumentProperties.CONTEXT] = this.context.toObject();
        }

        //alsoKnownAs
        if (this.alsoKnownAs) {
            result[DidDocumentProperties.ALSO_KNOWN_AS] = this.alsoKnownAs;
        }

        //controller
        if (this.controller) {
            result[DidDocumentProperties.CONTROLLER] = this.controller;
        }

        //verificationMethod
        if (Array.isArray(this.verificationMethod)) {
            result[DidDocumentProperties.VERIFICATION_METHOD] =
                this.verificationMethod.map(vm => vm.toObject(privateKey));
        }

        //authentication
        if (Array.isArray(this.authentication)) {
            result[DidDocumentProperties.AUTHENTICATION] = this.authentication.map((vm) => {
                if (typeof vm === 'string') {
                    return vm;
                } else {
                    return vm.toObject(privateKey);
                }
            });
        }

        //assertionMethod
        if (Array.isArray(this.assertionMethod)) {
            result[DidDocumentProperties.ASSERTION_METHOD] = this.assertionMethod.map((vm) => {
                if (typeof vm === 'string') {
                    return vm;
                } else {
                    return vm.toObject(privateKey);
                }
            });
        }

        //keyAgreement
        if (Array.isArray(this.keyAgreement)) {
            result[DidDocumentProperties.KEY_AGREEMENT] = this.keyAgreement.map((vm) => {
                if (typeof vm === 'string') {
                    return vm;
                } else {
                    return vm.toObject(privateKey);
                }
            });
        }

        //capabilityInvocation
        if (Array.isArray(this.capabilityInvocation)) {
            result[DidDocumentProperties.CAPABILITY_INVOCATION] = this.capabilityInvocation.map((vm) => {
                if (typeof vm === 'string') {
                    return vm;
                } else {
                    return vm.toObject(privateKey);
                }
            });
        }

        //capabilityDelegation
        if (Array.isArray(this.capabilityDelegation)) {
            result[DidDocumentProperties.CAPABILITY_DELEGATION] = this.capabilityDelegation.map((vm) => {
                if (typeof vm === 'string') {
                    return vm;
                } else {
                    return vm.toObject(privateKey);
                }
            });
        }

        //service
        if (Array.isArray(this.service)) {
            result[DidDocumentProperties.SERVICE] =
                this.service.map(s => s.toObject());
        }

        return result;
    }

    /**
     * To credential hash
     * @returns {string} - hash
     * @public
     */
    public toCredentialHash(): string {
        const map = this.getDocument();
        const json: string = JSON.stringify(map);
        const hash: Uint8Array = Hashing.sha256.digest(json);
        return Hashing.base58.encode(hash);
    }

    /**
     * Get verification methods
     * @returns {VerificationMethod[]} - all verification methods
     * @public
     */
    public getVerificationMethods(): VerificationMethod[] {
        return Array.isArray(this.verificationMethod) ? this.verificationMethod : [];
    }

    /**
     * Get verification method by type
     * @param {string} type - Signature type
     * @returns {VerificationMethod[]} - first find verification method
     * @public
     */
    public getMethodByType(type: string): VerificationMethod | null {
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
     * @param {string} id - method name
     * @returns {VerificationMethod[]} - first find verification method
     * @public
     */
    public getMethodByName(id: string): VerificationMethod | null {
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
     * @param {string} id - method name
     * @param {any} privateKey - private key
     * @public
     */
    public setPrivateKey(id: string, privateKey: any): void {
        if (Array.isArray(this.verificationMethod)) {
            for (const method of this.verificationMethod) {
                if (method.getId() === id) {
                    method.setPrivateKey(privateKey);
                }
            }
        }
    }

    /**
     * Get private keys
     * @returns {any[]} - get all private keys
     * @public
     */
    public getPrivateKeys(): any[] {
        const result = [];
        if (Array.isArray(this.verificationMethod)) {
            for (const method of this.verificationMethod) {
                if (method.hasPrivateKey()) {
                    result.push({
                        id: method.getId(),
                        type: method.getType(),
                        key: method.getPrivateKey()
                    })
                }
            }
        }
        return result;
    }

    /**
     * Compare DID Document
     * @returns {boolean[]}
     * @public
     */
    public compare(document: string | CommonDidDocument | IDidDocument): boolean {
        try {
            let json: IDidDocument;
            if (typeof document === 'string') {
                json = JSON.parse(document);
            } else if (document instanceof CommonDidDocument) {
                json = document.getDocument();
            } else {
                json = document;
            }

            const current = this.getDocument();
            if (current.id !== json.id) {
                return false;
            }
            if (current.verificationMethod.length !== json.verificationMethod.length) {
                return false;
            }
            const methods = new Map<string, VerificationMethod>();
            for (const a of current.verificationMethod) {
                methods.set(a.id, VerificationMethod.from(a));
            }
            for (const b of json.verificationMethod) {
                if (methods.has(b.id)) {
                    const a = methods.get(b.id);
                    if (!a.compare(b)) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
            return true;
        } catch (error) {
            return false;
        }
    }
}
