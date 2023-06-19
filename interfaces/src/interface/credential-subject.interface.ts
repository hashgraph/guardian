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
     * Geography
     */
    geography?: string;
    /**
     * Law
     */
    law?: string;
    /**
     * Tags
     */
    tags?: string;
    /**
     * ISIC
     */
    ISIC?: string;
    /**
     * Subject context
     */
    '@context': string | string[];
    [x: string]: any;
}
