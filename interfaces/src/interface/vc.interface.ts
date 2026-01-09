import { ICredentialSubject } from './credential-subject.interface.js';
import { did } from './did.interface.js';
import { uuid } from './uuid.interface.js';

/**
 * VC interface
 */
export interface IVC {
    /**
     * Context
     */
    '@context': string[];
    /**
     * ID
     */
    id: uuid;
    /**
     * Type
     */
    type: string[];
    /**
     * Credential Subject
     */
    credentialSubject: ICredentialSubject[];
    /**
     * Issuer
     */
    issuer: did | {
        /**
         * Issuer
         */
        id: did

        /**
         * Group
         */
        group?: string;
    };
    /**
     * Issuance Date
     */
    issuanceDate: string;
    /**
     * Proof
     */
    proof?: any;
}
