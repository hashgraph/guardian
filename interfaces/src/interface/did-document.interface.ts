import {DidDocumentStatus} from '../type/did-status.type';

export interface IDidDocument {
    id: string;
    did: string;
    document: any;
    createDate: Date;
    updateDate: Date;
    status: DidDocumentStatus;
}
