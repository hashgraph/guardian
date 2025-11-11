import { DataBaseHelper, BlockState } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class StateCollectionRestore extends CollectionRestore<BlockState> {
    protected override actionHash(hash: string, action: IDiffAction<BlockState>, row?: BlockState): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: BlockState[]): Promise<void> {
        const collection = new DataBaseHelper(BlockState);
        await collection.insertOrUpdate(rows as BlockState[], '_restoreId');
    }

    protected override async updateDocuments(rows: BlockState[]): Promise<void> {
        const collection = new DataBaseHelper(BlockState);
        await collection.insertOrUpdate(rows as BlockState[], '_restoreId');
    }

    protected override async deleteDocuments(rows: BlockState[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(BlockState);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: BlockState, id: string): BlockState {
        return data;
    }

    protected override async decryptRow(row: BlockState, id: string): Promise<BlockState> {
        return row;
    }
}
