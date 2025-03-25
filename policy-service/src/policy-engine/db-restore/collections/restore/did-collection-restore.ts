import { DataBaseHelper, DidDocument } from "@guardian/common";
import { CollectionRestore, IDiffAction } from '../../index.js';

export class DidCollectionRestore extends CollectionRestore<DidDocument> {
    protected override actionHash(hash: string, action: IDiffAction<DidDocument>, row?: DidDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: DidDocument[]): Promise<void> {
        const vcCollection = new DataBaseHelper(DidDocument);
        await vcCollection.insertMany(rows as DidDocument[]);
    }

    protected override async updateDocuments(rows: DidDocument[]): Promise<void> {
        const vcCollection = new DataBaseHelper(DidDocument);
        await vcCollection.updateByKey(rows as DidDocument[], '_restoreId');
    }

    protected override async deleteDocuments(rows: DidDocument[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const vcCollection = new DataBaseHelper(DidDocument);
        await vcCollection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: DidDocument): DidDocument {
        return data;
    }
}
