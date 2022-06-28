import {did} from './did.interface';

/**
 * Credential subject interface
 */
export interface ICredentialSubject {
    /**
     * DID
     */
    id?: did;
    /**
     * Type
     */
    type?: string;
    /**
     * Subject context
     */
    '@context': string | string[];
    [x: string]: any;
}
