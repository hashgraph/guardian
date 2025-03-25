import { DataBaseHelper, VcDocument } from "@guardian/common";
import { FindCursor } from "mongodb";
import { CollectionBackup } from "../collection-backup.js";
import { IDiffAction } from "../../interfaces/action.interface.js";

export class VcCollectionBackup extends CollectionBackup<VcDocument> {
    private readonly collectionName: string = 'VcDocument';

    protected override async findDocument(row: VcDocument): Promise<VcDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<VcDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<VcDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: VcDocument): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newVc: VcDocument, oldVc?: VcDocument): any {
        let diff: any = this.compareData(newVc, oldVc);
        delete diff.documentFileId;
        return diff;
    }

    protected override checkDocument(newVc: VcDocument, oldVc: VcDocument): boolean {
        return (newVc._docHash !== oldVc._docHash) || (newVc._propHash !== oldVc._propHash);
    }

    protected override needLoadFile(newVc: VcDocument, oldVc?: VcDocument): boolean {
        return (!oldVc) || (newVc._docHash !== oldVc._docHash);
    }

    protected override async loadFile(row: VcDocument, i: number = 0): Promise<any> {
        try {
            if (i > 10) {
                console.error('Load file error');
                return row;
            }
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

    protected override actionHash(hash: string, action: IDiffAction<VcDocument>, row?: VcDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
