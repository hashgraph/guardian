import { DataBaseHelper, DeleteCache, VcDocument } from '@guardian/common';
import { FindCursor } from 'mongodb';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class VcCollectionBackup extends CollectionBackup<VcDocument> {
    private readonly collectionName: string = 'VcDocument';

    protected override async findDocument(row: VcDocument): Promise<VcDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<VcDocument> {
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

    protected override createBackupData(row: VcDocument): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: VcDocument, oldRow?: VcDocument): any {
        const diff: any = this.compareData(newRow, oldRow);
        delete diff.documentFileId;
        return diff;
    }

    protected override checkDocument(newRow: VcDocument, oldRow: VcDocument): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: VcDocument, oldRow?: VcDocument): boolean {
        return (!oldRow) || (newRow._docHash !== oldRow._docHash);
    }

    protected override async loadFile(row: VcDocument, i: number = 0): Promise<VcDocument> {
        try {
            if (i > 10) {
                console.error('Load file error');
                return row;
            }
            delete row.document;
            delete row.encryptedDocument;
            if (row.encryptedDocumentFileId) {
                const buffer = await DataBaseHelper.loadFile(row.encryptedDocumentFileId);
                if (buffer) {
                    (row as any).encryptedDocument = buffer.toString('base64');
                }
            } else if (row.documentFileId) {
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

    protected override async clearFile(row: VcDocument): Promise<VcDocument> {
        delete row.document;
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<VcDocument>, row?: VcDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
