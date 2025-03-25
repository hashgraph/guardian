import { FindCursor } from "mongodb";
import { DataBaseHelper, Tag } from "@guardian/common";
import { CollectionBackup } from "../collection-backup.js";
import { IDiffAction } from "../../interfaces/action.interface.js";

export class TagCollectionBackup extends CollectionBackup<Tag> {
    private readonly collectionName: string = 'Tag';

    protected override async findDocument(row: Tag): Promise<Tag> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<Tag> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<Tag> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: Tag): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newVc: Tag, oldVc?: Tag): any {
        let diff: any = this.compareData(newVc, oldVc);
        delete diff.documentFileId;
        return diff;
    }

    protected override checkDocument(newVc: Tag, oldVc: Tag): boolean {
        return (newVc._docHash !== oldVc._docHash) || (newVc._propHash !== oldVc._propHash);
    }

    protected override needLoadFile(newVc: Tag, oldVc?: Tag): boolean {
        return false;
    }

    protected override async loadFile(row: Tag, i: number = 0): Promise<any> {
        return row;
    }
    protected override actionHash(hash: string, action: IDiffAction<Tag>, row?: Tag): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
