import {DocumentStatus} from '../type/document-status.type';
import {IVC} from './vc.interface';

export interface IVCDocument {
    id?: string;
    cid?: string;
    owner: string;
    hash: string;
    document: IVC;
    createDate?: Date;
    updateDate?: Date;
    status?: DocumentStatus;
    type: string;
    signature?: number;
    policyId: string;
    tag: string;
}
