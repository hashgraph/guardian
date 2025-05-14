import { DataBaseHelper, DeleteCache, DidDocument } from '@guardian/common';
import { FindCursor } from 'mongodb';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class DidCollectionBackup extends CollectionBackup<DidDocument> {
    private readonly collectionName: string = 'DidDocument';

    protected override async findDocument(row: DidDocument): Promise<DidDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<DidDocument> {
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

    protected override createBackupData(row: DidDocument): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: DidDocument, oldRow?: DidDocument): any {
        const diff: any = this.compareData(newRow, oldRow);
        return diff;
    }

    protected override checkDocument(newRow: DidDocument, oldRow: DidDocument): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: DidDocument, oldRow?: DidDocument): boolean {
        return false;
    }

    protected override async loadFile(row: DidDocument, i: number = 0): Promise<DidDocument> {
        return row;
    }

    protected override async clearFile(row: DidDocument): Promise<DidDocument> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<DidDocument>, row?: DidDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
