import { FindCursor } from 'mongodb';
import { DataBaseHelper, DeleteCache, VpDocument } from '@guardian/common';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class VpCollectionBackup extends CollectionBackup<VpDocument> {
    private readonly collectionName: string = 'VpDocument';

    protected override async findDocument(row: VpDocument): Promise<VpDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<VpDocument> {
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

    protected override createBackupData(row: VpDocument): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: VpDocument, oldRow?: VpDocument): any {
        const diff: any = this.compareData(newRow, oldRow);
        delete diff.documentFileId;
        return diff;
    }

    protected override async loadFile(row: VpDocument, i: number = 0): Promise<any> {
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

    protected override async clearFile(row: VpDocument): Promise<VpDocument> {
        delete row.document;
        return row;
    }

    protected override checkDocument(newRow: VpDocument, oldRow: VpDocument): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: VpDocument, oldRow?: VpDocument): boolean {
        return (!oldRow) || (newRow._docHash !== oldRow._docHash);
    }

    protected override actionHash(hash: string, action: IDiffAction<VpDocument>, row?: VpDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
