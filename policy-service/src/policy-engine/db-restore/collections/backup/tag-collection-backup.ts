import { FindCursor } from 'mongodb';
import { DataBaseHelper, DeleteCache, Tag } from '@guardian/common';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class TagCollectionBackup extends CollectionBackup<Tag> {
    private readonly collectionName: string = 'Tag';

    protected override async findDocument(row: Tag): Promise<Tag> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<Tag> {
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

    protected override createBackupData(row: Tag): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: Tag, oldRow?: Tag): any {
        const diff: any = this.compareData(newRow, oldRow);
        delete diff.documentFileId;
        return diff;
    }

    protected override checkDocument(newRow: Tag, oldRow: Tag): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: Tag, oldRow?: Tag): boolean {
        return false;
    }

    protected override async loadFile(row: Tag, i: number = 0): Promise<any> {
        return row;
    }

    protected override async clearFile(row: Tag): Promise<Tag> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<Tag>, row?: Tag): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
