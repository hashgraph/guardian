import { DataBaseHelper, EncryptVcHelper, KeyType, PolicyComment, Wallet } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class PolicyCommentCollectionRestore extends CollectionRestore<PolicyComment> {
    protected override actionHash(hash: string, action: IDiffAction<PolicyComment>, row?: PolicyComment): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: PolicyComment[]): Promise<void> {
        const collection = new DataBaseHelper(PolicyComment);
        await collection.insertOrUpdate(rows as PolicyComment[], '_restoreId');
    }

    protected override async updateDocuments(rows: PolicyComment[]): Promise<void> {
        const collection = new DataBaseHelper(PolicyComment);
        await collection.insertOrUpdate(rows as PolicyComment[], '_restoreId');
    }

    protected override async deleteDocuments(rows: PolicyComment[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(PolicyComment);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: PolicyComment): PolicyComment {
        console.log('PolicyComment', data);
        delete data.documentFileId;
        delete data.encryptedDocumentFileId;
        if (data.encryptedDocument) {
            const document = Buffer.from((data as any).encryptedDocument, 'base64').toString();
            data.encryptedDocument = document;
        }
        return data;
    }

    protected override async decryptRow(row: PolicyComment): Promise<PolicyComment> {
        if (row.encryptedDocument) {
            const commentKey: string = await this.getKey(this.policyOwner, row.discussionId);
            const data = await EncryptVcHelper.decrypt(row.encryptedDocument, commentKey);
            row.document = JSON.parse(data);
        }
        return row;
    }

    private getKey(
        did: string,
        discussionId: string,
    ): Promise<string> {
        const wallet = new Wallet();
        return wallet.getUserKey(
            did,
            KeyType.DISCUSSION,
            discussionId,
            null
        )
    }
}
