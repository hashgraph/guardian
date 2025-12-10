import { DataBaseHelper, DocumentState } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class DocStateCollectionRestore extends CollectionRestore<DocumentState> {
    protected override actionHash(hash: string, action: IDiffAction<DocumentState>, row?: DocumentState): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: DocumentState[]): Promise<void> {
        const collection = new DataBaseHelper(DocumentState);
        await collection.insertOrUpdate(rows as DocumentState[], '_restoreId');
    }

    protected override async updateDocuments(rows: DocumentState[]): Promise<void> {
        const collection = new DataBaseHelper(DocumentState);
        await collection.insertOrUpdate(rows as DocumentState[], '_restoreId');
    }

    protected override async deleteDocuments(rows: DocumentState[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(DocumentState);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: DocumentState, id: string): DocumentState {
        return data;
    }

    protected override async decryptRow(row: DocumentState, id: string): Promise<DocumentState> {
        return row;
    }
}
