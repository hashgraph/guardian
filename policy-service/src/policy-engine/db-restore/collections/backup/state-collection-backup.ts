import { DataBaseHelper, BlockState } from "@guardian/common";
import { FindCursor } from "mongodb";
import { CollectionBackup } from "../collection-backup.js";
import { IDiffAction } from "../../interfaces/action.interface.js";

export class StateCollectionBackup extends CollectionBackup<BlockState> {
    private readonly collectionName: string = 'BlockState';

    protected override async findDocument(row: BlockState): Promise<BlockState> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<BlockState> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<BlockState> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: BlockState): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: BlockState, oldRow?: BlockState): any {
        let diff: any = this.compareData(newRow, oldRow);
        return diff;
    }

    protected override checkDocument(newRow: BlockState, oldRow: BlockState): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: BlockState, oldRow?: BlockState): boolean {
        return false;
    }

    protected override async loadFile(row: BlockState, i: number = 0): Promise<any> {
        return row;
    }

    protected override async clearFile(row: BlockState): Promise<BlockState> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<BlockState>, row?: BlockState): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
