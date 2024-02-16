import { IVerificationMethod } from './verification-method';

/**
 * DID document interface
 */
export interface IDidDocument {
    /**
     * Context
     */
    '@context': string | string[];
    /**
     * Document id
     */
    id: string;
    /**
     * Document verification method
     */
    verificationMethod: IVerificationMethod;
    /**
     * Authentication
     */
    authentication: string;
    /**
     * Assertion method
     */
    assertionMethod: string;
}
