import {DocumentSignature} from '../type/document-signature.type';
import {DocumentStatus} from '../type/document-status.type';
import {SchemaEntity} from '../type/schema-entity.type';
import {IVP} from './vp.interface';

export interface IVPDocument {
    id?: string;
    cid?:string; 
    owner: string;
    hash: string;
    document: IVP;
    createDate?: Date;
    updateDate?: Date;
    status?: DocumentStatus;
    signature?: DocumentSignature;
    type: SchemaEntity;
    policyId: string;
    tag: string;
}
