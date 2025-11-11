import { DataBaseHelper, MultiDocuments } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class MultiDocCollectionRestore extends CollectionRestore<MultiDocuments> {
    protected override actionHash(hash: string, action: IDiffAction<MultiDocuments>, row?: MultiDocuments): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: MultiDocuments[]): Promise<void> {
        const collection = new DataBaseHelper(MultiDocuments);
        await collection.insertOrUpdate(rows as MultiDocuments[], '_restoreId');
    }

    protected override async updateDocuments(rows: MultiDocuments[]): Promise<void> {
        const collection = new DataBaseHelper(MultiDocuments);
        await collection.insertOrUpdate(rows as MultiDocuments[], '_restoreId');
    }

    protected override async deleteDocuments(rows: MultiDocuments[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(MultiDocuments);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: MultiDocuments, id: string): MultiDocuments {
        delete data.documentFileId;
        if (data.document) {
            const document = Buffer.from((data as any).document, 'base64').toString();
            data.document = JSON.parse(document);
        }
        return data;
    }

    protected override async decryptRow(row: MultiDocuments, id: string): Promise<MultiDocuments> {
        return row;
    }
}
