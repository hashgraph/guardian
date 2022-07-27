import {ICredentialSubject} from './credential-subject.interface';
import {did} from './did.interface';
import {uuid} from './uuid.interface';

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
    issuer: did;
    /**
     * Issuance Date
     */
    issuanceDate: string;
    /**
     * Proof
     */
    proof?: any;
}
