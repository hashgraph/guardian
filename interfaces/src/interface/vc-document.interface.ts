import {DocumentStatus} from '../type/document-status.type';
import {IVC} from './vc.interface';

export interface IVCDocument {
    id?: string;
    owner: string;
    assign?: string;
    hash: string;
    document: IVC;
    createDate?: Date;
    updateDate?: Date;
    hederaStatus?: DocumentStatus;
    comment?: string;
    type: string;
    signature?: number;
    policyId: string;
    tag: string;
    option: any;
}
