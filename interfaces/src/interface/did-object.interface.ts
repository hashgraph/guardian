import {DidDocumentStatus} from '../type/did-status.type.js';
import {IDidDocument} from './did-document.js';

/**
 * DID object
 */
export interface IDidObject {
    /**
     * Object id
     */
    id: string;
    /**
     * Object did
     */
    did?: string;
    /**
     * Object document instance
     */
    document?: IDidDocument;
    /**
     * Object creation date
     */
    createDate?: Date;
    /**
     * Object last update
     */
    updateDate?: Date;
    /**
     * Object status
     */
    status?: DidDocumentStatus;
}
