import { DataBaseHelper, Tag } from "@guardian/common";
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
        const vcCollection = new DataBaseHelper(Tag);
        await vcCollection.insertMany(rows as Tag[]);
    }

    protected override async updateDocuments(rows: Tag[]): Promise<void> {
        const vcCollection = new DataBaseHelper(Tag);
        await vcCollection.updateByKey(rows as Tag[], '_restoreId');
    }

    protected override async deleteDocuments(rows: Tag[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const vcCollection = new DataBaseHelper(Tag);
        await vcCollection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: Tag): Tag {
        return data;
    }
}
