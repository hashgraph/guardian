import { FindCursor } from "mongodb";
import { DataBaseHelper, Topic } from "@guardian/common";
import { CollectionBackup } from "../collection-backup.js";
import { IDiffAction } from "../../interfaces/action.interface.js";

export class TopicCollectionBackup extends CollectionBackup<Topic> {
    private readonly collectionName: string = 'Topic';

    protected override async findDocument(row: Topic): Promise<Topic> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<Topic> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<Topic> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: Topic): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newVc: Topic, oldVc?: Topic): any {
        let diff: any = this.compareData(newVc, oldVc);
        delete diff.documentFileId;
        return diff;
    }

    protected override checkDocument(newVc: Topic, oldVc: Topic): boolean {
        return (newVc._docHash !== oldVc._docHash) || (newVc._propHash !== oldVc._propHash);
    }

    protected override needLoadFile(newVc: Topic, oldVc?: Topic): boolean {
        return false;
    }

    protected override async loadFile(row: Topic, i: number = 0): Promise<any> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<Topic>, row?: Topic): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
