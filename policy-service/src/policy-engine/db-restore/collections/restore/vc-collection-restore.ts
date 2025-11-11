import { DataBaseHelper, EncryptVcHelper, VcDocument } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';
import { UserCredentials } from './../../../policy-user.js';

export class VcCollectionRestore extends CollectionRestore<VcDocument> {
    protected override actionHash(hash: string, action: IDiffAction<VcDocument>, row?: VcDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: VcDocument[]): Promise<void> {
        const collection = new DataBaseHelper(VcDocument);
        await collection.insertOrUpdate(rows as VcDocument[], '_restoreId');
    }

    protected override async updateDocuments(rows: VcDocument[]): Promise<void> {
        const collection = new DataBaseHelper(VcDocument);
        await collection.insertOrUpdate(rows as VcDocument[], '_restoreId');
    }

    protected override async deleteDocuments(rows: VcDocument[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(VcDocument);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: VcDocument, id: string): VcDocument {
        delete data.documentFileId;
        delete data.encryptedDocumentFileId;
        if (data.document) {
            const document = Buffer.from((data as any).document, 'base64').toString();
            data.document = JSON.parse(document);
        }
        if (data.encryptedDocument) {
            const document = Buffer.from((data as any).encryptedDocument, 'base64').toString();
            data.encryptedDocument = document;
        }
        return data;
    }

    protected override async decryptRow(row: VcDocument, id: string): Promise<VcDocument> {
        if (row.encryptedDocument) {
            const messageKey = await UserCredentials.loadMessageKey(this.messageId, row.owner, null);
            const data = await EncryptVcHelper.decrypt(row.encryptedDocument, messageKey);
            row.document = JSON.parse(data);
        }
        return row;
    }
}
