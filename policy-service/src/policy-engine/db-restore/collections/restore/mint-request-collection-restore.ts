import { DataBaseHelper, MintRequest } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class MintRequestCollectionRestore extends CollectionRestore<MintRequest> {
    protected override actionHash(hash: string, action: IDiffAction<MintRequest>, row?: MintRequest): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: MintRequest[]): Promise<void> {
        const collection = new DataBaseHelper(MintRequest);
        await collection.insertOrUpdate(rows as MintRequest[], '_restoreId');
    }

    protected override async updateDocuments(rows: MintRequest[]): Promise<void> {
        const collection = new DataBaseHelper(MintRequest);
        await collection.insertOrUpdate(rows as MintRequest[], '_restoreId');
    }

    protected override async deleteDocuments(rows: MintRequest[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(MintRequest);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: MintRequest): MintRequest {
        data.readonly = true
        return data;
    }
}
