/**
 * DID document
 */
export interface IDidDocument {
    /**
     * DID
     */
    id: string;

    /**
     * Context
     */
    context?: string | string[];

    /**
     * alsoKnownAs
     */
    alsoKnownAs?: string[];

    /**
     * controller
     */
    controller?: string | string[];

    /**
     * Verification method
     */
    verificationMethod?: IVerificationMethod[];

    /**
     * Authentication
     */
    authentication?: (IVerificationMethod | string)[];

    /**
     * Assertion Method
     */
    assertionMethod?: (IVerificationMethod | string)[];

    /**
     * Key Agreement
     */
    keyAgreement?: (IVerificationMethod | string)[];

    /**
     * Capability Invocation
     */
    capabilityInvocation?: (IVerificationMethod | string)[];

    /**
     * Capability Delegation
     */
    capabilityDelegation?: (IVerificationMethod | string)[];

    /**
     * Capability Delegation
     */
    service?: IService[];
}

/**
 * DID verification method
 */
export interface IVerificationMethod {
    /**
     * Id
     */
    id: string;

    /**
     * Controller
     */
    controller: string;

    /**
     * Type
     */
    type: string;

    /**
     * Public Key
     */
    publicKeyJwk?: string;

    /**
     * Public Key
     */
    publicKeyMultibase?: string;

    /**
     * Public Key
     */
    publicKeyBase58?: string;

    /**
     * Private Key
     */
    privateKeyJwk?: string;

    /**
     * Private Key
     */
    privateKeyMultibase?: string;

    /**
     * Private Key
     */
    privateKeyBase58?: string;
}

/**
 * DID verification service
 */
export interface IService {
    /**
     * Id
     */
    id: string;

    /**
     * Type
     */
    type: string;

    /**
     * Service Endpoint
     */
    serviceEndpoint: string | string[] | { [x: string]: string; } | { [x: string]: string; }[];
}