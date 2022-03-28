import {DidDocumentStatus} from '../type/did-status.type';
import {IDidDocument} from './did-document';

export interface IDidObject {
    id: string;
    did: string;
    document: IDidDocument;
    createDate: Date;
    updateDate: Date;
    status: DidDocumentStatus;
}
