import { DataBaseHelper, Tag } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class TagCollectionRestore extends CollectionRestore<Tag> {
    protected override actionHash(hash: string, action: IDiffAction<Tag>, row?: Tag): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: Tag[]): Promise<void> {
        const collection = new DataBaseHelper(Tag);
        await collection.insertOrUpdate(rows as Tag[], '_restoreId');
    }

    protected override async updateDocuments(rows: Tag[]): Promise<void> {
        const collection = new DataBaseHelper(Tag);
        await collection.insertOrUpdate(rows as Tag[], '_restoreId');
    }

    protected override async deleteDocuments(rows: Tag[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(Tag);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: Tag, id: string): Tag {
        return data;
    }

    protected override async decryptRow(row: Tag, id: string): Promise<Tag> {
        return row;
    }
}
