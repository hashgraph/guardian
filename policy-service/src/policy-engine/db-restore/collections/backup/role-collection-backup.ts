import { DataBaseHelper, DeleteCache, PolicyRoles } from '@guardian/common';
import { FindCursor } from 'mongodb';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class RoleCollectionBackup extends CollectionBackup<PolicyRoles> {
    private readonly collectionName: string = 'PolicyRoles';

    protected override async findDocument(row: PolicyRoles): Promise<PolicyRoles> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<PolicyRoles> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<DeleteCache> {
        const collection = DataBaseHelper.orm.em.getCollection('DeleteCache');
        const rows = collection.find<any>({ 
            policyId: this.policyId, 
            collection: this.collectionName
        });
        return rows;
    }

    protected override createBackupData(row: PolicyRoles): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: PolicyRoles, oldRow?: PolicyRoles): any {
        const diff: any = this.compareData(newRow, oldRow);
        return diff;
    }

    protected override checkDocument(newRow: PolicyRoles, oldRow: PolicyRoles): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: PolicyRoles, oldRow?: PolicyRoles): boolean {
        return false;
    }

    protected override async loadFile(row: PolicyRoles, i: number = 0): Promise<PolicyRoles> {
        return row;
    }

    protected override async clearFile(row: PolicyRoles): Promise<PolicyRoles> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<PolicyRoles>, row?: PolicyRoles): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
