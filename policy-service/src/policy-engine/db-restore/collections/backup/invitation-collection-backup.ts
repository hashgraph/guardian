import { DataBaseHelper, PolicyInvitations } from '@guardian/common';
import { FindCursor } from 'mongodb';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class PolicyInvitationsCollectionBackup extends CollectionBackup<PolicyInvitations> {
    private readonly collectionName: string = 'PolicyInvitations';

    protected override async findDocument(row: PolicyInvitations): Promise<PolicyInvitations> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<PolicyInvitations> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<PolicyInvitations> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: PolicyInvitations): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: PolicyInvitations, oldRow?: PolicyInvitations): any {
        const diff: any = this.compareData(newRow, oldRow);
        return diff;
    }

    protected override checkDocument(newRow: PolicyInvitations, oldRow: PolicyInvitations): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: PolicyInvitations, oldRow?: PolicyInvitations): boolean {
        return false;
    }

    protected override async loadFile(row: PolicyInvitations, i: number = 0): Promise<PolicyInvitations> {
        return row;
    }

    protected override async clearFile(row: PolicyInvitations): Promise<PolicyInvitations> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<PolicyInvitations>, row?: PolicyInvitations): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
