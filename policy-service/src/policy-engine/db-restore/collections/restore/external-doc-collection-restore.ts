import { DataBaseHelper, ExternalDocument } from '@guardian/common';
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
        const collection = new DataBaseHelper(ExternalDocument);
        await collection.insertOrUpdate(rows as ExternalDocument[], '_restoreId');
    }

    protected override async updateDocuments(rows: ExternalDocument[]): Promise<void> {
        const collection = new DataBaseHelper(ExternalDocument);
        await collection.insertOrUpdate(rows as ExternalDocument[], '_restoreId');
    }

    protected override async deleteDocuments(rows: ExternalDocument[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(ExternalDocument);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: ExternalDocument, id: string): ExternalDocument {
        return data;
    }

    protected override async decryptRow(row: ExternalDocument, id: string): Promise<ExternalDocument> {
        return row;
    }
}
