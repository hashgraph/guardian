import {ApproveStatus} from '../type/approve-status.type';
import {SchemaEntity} from '../type/schema-entity.type';

export interface IApprovalDocument {
    id: string;
    owner: string;
    approver: string;
    document: any;
    policyId: string;
    type: SchemaEntity;
    createDate: Date;
    updateDate: Date;
    option: any;
}
