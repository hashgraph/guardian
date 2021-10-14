import {DocumentStatus} from '../type/document-status.type';
import {SchemaEntity} from '../type/schema-entity.type';
import {IVC} from './vc.interface';

export interface IVCDocument {
    id: string;
    owner: string;
    hash: string;
    document: IVC;
    createDate: Date;
    updateDate: Date;
    status: DocumentStatus;
    type: SchemaEntity;
    signature: number
}
