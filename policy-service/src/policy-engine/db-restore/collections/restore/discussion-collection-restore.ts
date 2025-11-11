import { DataBaseHelper, EncryptVcHelper, KeyType, PolicyDiscussion, Wallet } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class PolicyDiscussionCollectionRestore extends CollectionRestore<PolicyDiscussion> {
    protected override actionHash(hash: string, action: IDiffAction<PolicyDiscussion>, row?: PolicyDiscussion): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: PolicyDiscussion[]): Promise<void> {
        const collection = new DataBaseHelper(PolicyDiscussion);
        await collection.insertOrUpdate(rows as PolicyDiscussion[], '_restoreId');
    }

    protected override async updateDocuments(rows: PolicyDiscussion[]): Promise<void> {
        const collection = new DataBaseHelper(PolicyDiscussion);
        await collection.insertOrUpdate(rows as PolicyDiscussion[], '_restoreId');
    }

    protected override async deleteDocuments(rows: PolicyDiscussion[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(PolicyDiscussion);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: PolicyDiscussion): PolicyDiscussion {
        console.log('PolicyDiscussion', data);
        delete data.documentFileId;
        delete data.encryptedDocumentFileId;
        if (data.encryptedDocument) {
            const document = Buffer.from((data as any).encryptedDocument, 'base64').toString();
            data.encryptedDocument = document;
        }
        return data;
    }

    protected override async decryptRow(row: PolicyDiscussion): Promise<PolicyDiscussion> {
        if (row.encryptedDocument) {
            const commentKey: string = await this.getKey(this.policyOwner, row.id);
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
