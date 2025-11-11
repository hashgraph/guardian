import { DataBaseHelper, MintTransaction } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class MintTransactionCollectionRestore extends CollectionRestore<MintTransaction> {
    protected override actionHash(hash: string, action: IDiffAction<MintTransaction>, row?: MintTransaction): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: MintTransaction[]): Promise<void> {
        const collection = new DataBaseHelper(MintTransaction);
        await collection.insertOrUpdate(rows as MintTransaction[], '_restoreId');
    }

    protected override async updateDocuments(rows: MintTransaction[]): Promise<void> {
        const collection = new DataBaseHelper(MintTransaction);
        await collection.insertOrUpdate(rows as MintTransaction[], '_restoreId');
    }

    protected override async deleteDocuments(rows: MintTransaction[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(MintTransaction);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: MintTransaction, id: string): MintTransaction {
        data.readonly = true;
        return data;
    }

    protected override async decryptRow(row: MintTransaction, id: string): Promise<MintTransaction> {
        return row;
    }
}
