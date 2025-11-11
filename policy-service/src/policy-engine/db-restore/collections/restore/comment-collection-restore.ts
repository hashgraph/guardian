import { DataBaseHelper, EncryptVcHelper, KeyType, PolicyComment, PolicyDiscussion, VcDocument, Wallet } from '@guardian/common';
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

    protected override createRow(data: PolicyComment, id: string): PolicyComment {
        console.log('PolicyComment', data);
        delete data.documentFileId;
        delete data.encryptedDocumentFileId;
        if (data.encryptedDocument) {
            const document = Buffer.from((data as any).encryptedDocument, 'base64').toString();
            data.encryptedDocument = document;
        }
        return data;
    }

    protected override async decryptRow(row: PolicyComment, id: string): Promise<PolicyComment> {
        if (row.encryptedDocument) {
            const commentKey: string = await this.getKey(this.policyOwner, row.discussionId);
            const data = await EncryptVcHelper.decrypt(row.encryptedDocument, commentKey);
            row.document = JSON.parse(data);
        }
        if (row.document) {
            const subject = this.getCredentialSubject(row.document);
            row.text = subject.text;
            row.sender = subject.sender;
            row.senderRole = subject.senderRole;
            row.senderName = subject.senderName;
            row.recipients = subject.users || [];
            row.fields = subject.fields || [];
        }
        if (row.discussionMessageId) {
            const collection = new DataBaseHelper(PolicyDiscussion);
            const discussion = await collection.findOne({ messageId: row.discussionMessageId });
            if (discussion) {
                row.field = discussion.field;
                row.relationships = discussion.relationships;
                row.relationshipIds = discussion.relationshipIds;
            }
        }
        if (row.target) {
            const collection = new DataBaseHelper(VcDocument);
            const vc = await collection.findOne({ messageId: row.target });
            if (vc) {
                row.isDocumentOwner = vc.owner === row.owner;
            }
        }
        console.log('decryptRow PolicyComment 3', JSON.stringify(row, null, 4));
        return row;
    }

    private getCredentialSubject(document: any): any {
        if (Array.isArray(document.credentialSubject)) {
            return document.credentialSubject[0];
        } else {
            return document.credentialSubject;
        }
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
