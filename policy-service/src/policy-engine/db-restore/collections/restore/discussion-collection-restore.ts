import { DataBaseHelper, EncryptVcHelper, KeyType, PolicyDiscussion, VcDocument, Wallet } from '@guardian/common';
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
        await collection.insertOrUpdate(rows as PolicyDiscussion[], 'messageId');
    }

    protected override async updateDocuments(rows: PolicyDiscussion[]): Promise<void> {
        const collection = new DataBaseHelper(PolicyDiscussion);
        await collection.insertOrUpdate(rows as PolicyDiscussion[], 'messageId');
    }

    protected override async deleteDocuments(rows: PolicyDiscussion[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(PolicyDiscussion);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: PolicyDiscussion, id: string): PolicyDiscussion {
        delete data.documentFileId;
        delete data.encryptedDocumentFileId;
        if (data.encryptedDocument) {
            const document = Buffer.from((data as any).encryptedDocument, 'base64').toString();
            data.encryptedDocument = document;
        }
        return data;
    }

    protected override async decryptRow(row: PolicyDiscussion, id: string): Promise<PolicyDiscussion> {
        if (row.encryptedDocument) {
            const commentKey: string = await this.getKey(this.policyOwner, row.messageId);
            if (commentKey) {
                const data = await EncryptVcHelper.decrypt(row.encryptedDocument, commentKey);
                row.document = JSON.parse(data);
            }
        }
        if (row.document) {
            const subject = this.getCredentialSubject(row.document);
            row.name = subject.name;
            row.privacy = subject.privacy;
            row.relationships = subject.relationships || [];
            row.parent = subject.parent || null;
            row.field = subject.field || null;
            row.fieldName = subject.fieldName || null;
        }
        if (row.relationships?.length) {
            const collection = new DataBaseHelper(VcDocument);
            const vcs = await collection.find({ policyId: this.policyId, messageId: { $in: row.relationships } });
            row.relationshipIds = vcs.map((vc) => vc.id);
        }
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
        messageId: string,
    ): Promise<string> {
        const wallet = new Wallet();
        return wallet.getUserKey(
            did,
            KeyType.DISCUSSION,
            messageId,
            null
        )
    }
}
