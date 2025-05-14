import { FindCursor } from 'mongodb';
import { DataBaseHelper, DeleteCache, DocumentState } from '@guardian/common';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class DocStateCollectionBackup extends CollectionBackup<DocumentState> {
    private readonly collectionName: string = 'DocumentState';

    protected override async findDocument(row: DocumentState): Promise<DocumentState> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<DocumentState> {
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

    protected override createBackupData(row: DocumentState): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: DocumentState, oldRow?: DocumentState): any {
        const diff: any = this.compareData(newRow, oldRow);
        delete diff.documentFileId;
        return diff;
    }

    protected override checkDocument(newRow: DocumentState, oldRow: DocumentState): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: DocumentState, oldRow?: DocumentState): boolean {
        return false;
    }

    protected override async loadFile(row: DocumentState, i: number = 0): Promise<any> {
        return row;
    }

    protected override async clearFile(row: DocumentState): Promise<DocumentState> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<DocumentState>, row?: DocumentState): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
