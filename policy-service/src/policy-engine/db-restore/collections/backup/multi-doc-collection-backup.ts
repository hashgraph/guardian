import { DataBaseHelper, DeleteCache, MultiDocuments } from '@guardian/common';
import { FindCursor } from 'mongodb';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class MultiDocCollectionBackup extends CollectionBackup<MultiDocuments> {
    private readonly collectionName: string = 'MultiDocuments';

    protected override async findDocument(row: MultiDocuments): Promise<MultiDocuments> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<MultiDocuments> {
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

    protected override createBackupData(row: MultiDocuments): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: MultiDocuments, oldRow?: MultiDocuments): any {
        const diff: any = this.compareData(newRow, oldRow);
        delete diff.documentFileId;
        return diff;
    }

    protected override checkDocument(newRow: MultiDocuments, oldRow: MultiDocuments): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: MultiDocuments, oldRow?: MultiDocuments): boolean {
        return (!oldRow) || (newRow._docHash !== oldRow._docHash);
    }

    protected override async loadFile(row: MultiDocuments, i: number = 0): Promise<any> {
        try {
            if (i > 10) {
                console.error('Load file error');
                return row;
            }
            delete row.document;
            if (row.documentFileId) {
                const buffer = await DataBaseHelper.loadFile(row.documentFileId);
                if (buffer) {
                    (row as any).document = buffer.toString('base64');
                }
            }
            return row;
        } catch (error) {
            const newRow = await this.findDocument(row);
            return await this.loadFile(newRow, i + 1);
        }
    }

    protected override async clearFile(row: MultiDocuments): Promise<MultiDocuments> {
        delete row.document;
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<MultiDocuments>, row?: MultiDocuments): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}