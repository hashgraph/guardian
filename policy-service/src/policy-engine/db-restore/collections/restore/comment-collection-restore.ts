import { DataBaseHelper, EncryptVcHelper, PolicyComment } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';
import { UserCredentials } from '../../../policy-user.js';

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
        // delete data.documentFileId;
        // delete data.encryptedDocumentFileId;
        // if (data.document) {
        //     const document = Buffer.from((data as any).document, 'base64').toString();
        //     data.document = JSON.parse(document);
        // }
        // if (data.encryptedDocument) {
        //     const document = Buffer.from((data as any).encryptedDocument, 'base64').toString();
        //     data.encryptedDocument = document;
        // }
        return data;
    }

    protected override async decryptRow(row: PolicyComment): Promise<PolicyComment> {
        // if (row.encryptedDocument) {
        //     const messageKey = await UserCredentials.loadMessageKey(this.messageId, row.owner, null);
        //     const data = await EncryptVcHelper.decrypt(row.encryptedDocument, messageKey);
        //     row.document = JSON.parse(data);
        // }
        return row;
    }
}
