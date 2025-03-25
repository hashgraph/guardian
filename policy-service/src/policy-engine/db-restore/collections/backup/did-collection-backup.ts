import { DataBaseHelper, DidDocument } from "@guardian/common";
import { FindCursor } from "mongodb";
import { CollectionBackup } from "../collection-backup.js";
import { IDiffAction } from "../../interfaces/action.interface.js";

export class DidCollectionBackup extends CollectionBackup<DidDocument> {
    private readonly collectionName: string = 'DidDocument';

    protected override async findDocument(row: DidDocument): Promise<DidDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<DidDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<DidDocument> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: DidDocument): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newVc: DidDocument, oldVc?: DidDocument): any {
        let diff: any = this.compareData(newVc, oldVc);
        return diff;
    }

    protected override checkDocument(newVc: DidDocument, oldVc: DidDocument): boolean {
        return (newVc._docHash !== oldVc._docHash) || (newVc._propHash !== oldVc._propHash);
    }

    protected override needLoadFile(newVc: DidDocument, oldVc?: DidDocument): boolean {
        return false;
    }

    protected override async loadFile(row: any, i: number = 0): Promise<any> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<DidDocument>, row?: DidDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
