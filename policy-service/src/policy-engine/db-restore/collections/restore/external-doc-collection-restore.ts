import { DataBaseHelper, ExternalDocument } from "@guardian/common";
import { CollectionRestore, IDiffAction } from '../../index.js';

export class ExternalCollectionRestore extends CollectionRestore<ExternalDocument> {
    protected override actionHash(hash: string, action: IDiffAction<ExternalDocument>, row?: ExternalDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: ExternalDocument[]): Promise<void> {
        const vcCollection = new DataBaseHelper(ExternalDocument);
        await vcCollection.insertMany(rows as ExternalDocument[]);
    }

    protected override async updateDocuments(rows: ExternalDocument[]): Promise<void> {
        const vcCollection = new DataBaseHelper(ExternalDocument);
        await vcCollection.updateByKey(rows as ExternalDocument[], '_restoreId');
    }

    protected override async deleteDocuments(rows: ExternalDocument[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const vcCollection = new DataBaseHelper(ExternalDocument);
        await vcCollection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: ExternalDocument): ExternalDocument {
        return data;
    }
}
