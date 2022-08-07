import {DocumentStatus} from '../type/document-status.type';
import {IVC} from './vc.interface';

/**
 * VC document interface
 */
export interface IVCDocument {
    /**
     * ID
     */
    id?: string;
    /**
     * Owner
     */
    owner?: string;
    /**
     * Assign
     */
    assignee?: string;
    /**
     * Hash
     */
    hash?: string;
    /**
     * Document instance
     */
    document?: IVC;
    /**
     * Creation date
     */
    createDate?: Date;
    /**
     * Last update
     */
    updateDate?: Date;
    /**
     * Hedera status
     */
    hederaStatus?: DocumentStatus;
    /**
     * Comment
     */
    comment?: string;
    /**
     * Type
     */
    type?: string;
    /**
     * Signature
     */
    signature?: number;
    /**
     * Policy ID
     */
    policyId?: string;
    /**
     * Tag
     */
    tag?: string;
    /**
     * Option
     */
    option?: any;
}
