import { FindCursor } from "mongodb";
import { DataBaseHelper, ApprovalDocument } from "@guardian/common";
import { CollectionBackup } from "../collection-backup.js";
import { IDiffAction } from "../../interfaces/action.interface.js";

export class ApproveCollectionBackup extends CollectionBackup<ApprovalDocument> {
    private readonly collectionName: string = 'ApprovalDocument';

    protected override async findDocument(row: ApprovalDocument): Promise<ApprovalDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<ApprovalDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<ApprovalDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: ApprovalDocument): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: ApprovalDocument, oldRow?: ApprovalDocument): any {
        let diff: any = this.compareData(newRow, oldRow);
        delete diff.documentFileId;
        return diff;
    }


    protected override checkDocument(newRow: ApprovalDocument, oldRow: ApprovalDocument): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: ApprovalDocument, oldRow?: ApprovalDocument): boolean {
        return (!oldRow) || (newRow._docHash !== oldRow._docHash);
    }

    protected override async loadFile(row: ApprovalDocument, i: number = 0): Promise<any> {
        try {
            if (i > 10) {
                console.error('Load file error');
                return row;
            }
            delete row.document;
            if (row.documentFileId) {
                const buffer = await DataBaseHelper.loadFile(row.documentFileId);
                if (buffer) {
                    (row as any).document = buffer.toString('base64');
                }
            }
            return row;
        } catch (error) {
            const newRow = await this.findDocument(row);
            return await this.loadFile(newRow, i + 1);
        }
    }

    protected override async clearFile(row: ApprovalDocument): Promise<ApprovalDocument> {
        delete row.document;
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<ApprovalDocument>, row?: ApprovalDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
