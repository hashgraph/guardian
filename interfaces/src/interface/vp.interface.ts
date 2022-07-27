import {uuid} from './uuid.interface';
import {IVC} from './vc.interface';

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
