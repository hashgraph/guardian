import { DataBaseHelper, ApprovalDocument } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class ApproveCollectionRestore extends CollectionRestore<ApprovalDocument> {
    protected override actionHash(hash: string, action: IDiffAction<ApprovalDocument>, row?: ApprovalDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: ApprovalDocument[]): Promise<void> {
        const collection = new DataBaseHelper(ApprovalDocument);
        await collection.insertOrUpdate(rows as ApprovalDocument[], '_restoreId');
    }

    protected override async updateDocuments(rows: ApprovalDocument[]): Promise<void> {
        const collection = new DataBaseHelper(ApprovalDocument);
        await collection.insertOrUpdate(rows as ApprovalDocument[], '_restoreId');
    }

    protected override async deleteDocuments(rows: ApprovalDocument[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(ApprovalDocument);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: ApprovalDocument, id: string): ApprovalDocument {
        delete data.documentFileId;
        if (data.document) {
            const document = Buffer.from((data as any).document, 'base64').toString();
            data.document = JSON.parse(document);
        }
        return data;
    }

    protected override async decryptRow(row: ApprovalDocument, id: string): Promise<ApprovalDocument> {
        return row;
    }
}
