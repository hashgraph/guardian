import {DocumentSignature} from '../type/document-signature.type';
import {DocumentStatus} from '../type/document-status.type';
import {SchemaEntity} from '../type/schema-entity.type';
import {IVP} from './vp.interface';

/**
 * VP document interface
 */
export interface IVPDocument {
    /**
     * ID
     */
    id?: string;
    /**
     * Owner
     */
    owner?: string;
    /**
     * Hash
     */
    hash?: string;
    /**
     * VP instance
     */
    document?: IVP;
    /**
     * Creation date
     */
    createDate?: Date;
    /**
     * Last update
     */
    updateDate?: Date;
    /**
     * Status
     */
    status?: DocumentStatus;
    /**
     * Signature
     */
    signature?: DocumentSignature;
    /**
     * Type
     */
    type?: SchemaEntity;
    /**
     * Policy ID
     */
    policyId?: string;
    /**
     * Tag
     */
    tag?: string;
}
