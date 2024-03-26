import {uuid} from './uuid.interface.js';
import {IVC} from './vc.interface.js';

/**
 * VP interface
 */
export interface IVP {
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
     * VC instance
     */
    verifiableCredential: IVC[];
    /**
     * Proof
     */
    proof?: any;
}
