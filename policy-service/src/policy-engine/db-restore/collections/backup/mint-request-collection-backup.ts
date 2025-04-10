import { DataBaseHelper, MintRequest } from "@guardian/common";
import { FindCursor } from "mongodb";
import { CollectionBackup } from "../collection-backup.js";
import { IDiffAction } from "../../interfaces/action.interface.js";

export class MintRequestCollectionBackup extends CollectionBackup<MintRequest> {
    private readonly collectionName: string = 'MintRequest';

    protected override async findDocument(row: MintRequest): Promise<MintRequest> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<MintRequest> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<MintRequest> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: MintRequest): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: MintRequest, oldRow?: MintRequest): any {
        let diff: any = this.compareData(newRow, oldRow);
        return diff;
    }

    protected override checkDocument(newRow: MintRequest, oldRow: MintRequest): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: MintRequest, oldRow?: MintRequest): boolean {
        return false;
    }

    protected override async loadFile(row: MintRequest, i: number = 0): Promise<MintRequest> {
        return row;
    }

    protected override async clearFile(row: MintRequest): Promise<MintRequest> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<MintRequest>, row?: MintRequest): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
