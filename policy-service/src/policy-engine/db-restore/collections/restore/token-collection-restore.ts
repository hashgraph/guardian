import { DataBaseHelper, Token } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class TokenCollectionRestore extends CollectionRestore<Token> {
    protected override actionHash(hash: string, action: IDiffAction<Token>, row?: Token): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: Token[]): Promise<void> {
        const collection = new DataBaseHelper(Token);
        await collection.insertOrUpdate(rows as Token[], '_restoreId');
    }

    protected override async updateDocuments(rows: Token[]): Promise<void> {
        const collection = new DataBaseHelper(Token);
        await collection.insertOrUpdate(rows as Token[], '_restoreId');
    }

    protected override async deleteDocuments(rows: Token[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(Token);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: Token, id: string): Token {
        data.view = true;
        return data;
    }

    protected override async decryptRow(row: Token, id: string): Promise<Token> {
        return row;
    }
}
