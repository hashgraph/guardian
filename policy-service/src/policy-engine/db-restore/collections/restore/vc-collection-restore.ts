import { DataBaseHelper, VcDocument } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class VcCollectionRestore extends CollectionRestore<VcDocument> {
    protected override actionHash(hash: string, action: IDiffAction<VcDocument>, row?: VcDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: VcDocument[]): Promise<void> {
        const collection = new DataBaseHelper(VcDocument);
        await collection.insertOrUpdate(rows as VcDocument[], '_restoreId');
    }

    protected override async updateDocuments(rows: VcDocument[]): Promise<void> {
        const collection = new DataBaseHelper(VcDocument);
        await collection.insertOrUpdate(rows as VcDocument[], '_restoreId');
    }

    protected override async deleteDocuments(rows: VcDocument[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(VcDocument);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: VcDocument): VcDocument {
        if (data.document) {
            console.debug('--- createRow 1', !!data)
            const document = Buffer.from((data as any).document, 'base64').toString();
            console.debug('--- createRow 2', !!document)
            data.document = JSON.parse(document);
            console.debug('--- createRow 3', !!data.document)
        }
        return data;
    }
}
