import { FindCursor } from "mongodb";
import { DataBaseHelper, Token } from "@guardian/common";
import { CollectionBackup } from "../collection-backup.js";
import { IDiffAction } from "../../interfaces/action.interface.js";

export class TokenCollectionBackup extends CollectionBackup<Token> {
    private readonly collectionName: string = 'Token';

    protected override async findDocument(row: Token): Promise<Token> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<Token> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<Token> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: Token): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newVc: Token, oldVc?: Token): any {
        let diff: any = this.compareData(newVc, oldVc);
        delete diff.documentFileId;
        return diff;
    }

    protected override checkDocument(newVc: Token, oldVc: Token): boolean {
        return (newVc._docHash !== oldVc._docHash) || (newVc._propHash !== oldVc._propHash);
    }

    protected override needLoadFile(newVc: Token, oldVc?: Token): boolean {
        return false;
    }

    protected override async loadFile(row: Token, i: number = 0): Promise<any> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<Token>, row?: Token): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
