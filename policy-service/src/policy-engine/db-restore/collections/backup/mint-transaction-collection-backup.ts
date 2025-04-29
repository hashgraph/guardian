import { DataBaseHelper, MintTransaction } from '@guardian/common';
import { FindCursor } from 'mongodb';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class MintTransactionCollectionBackup extends CollectionBackup<MintTransaction> {
    private readonly collectionName: string = 'MintTransaction';

    protected override async findDocument(row: MintTransaction): Promise<MintTransaction> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<MintTransaction> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<MintTransaction> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: MintTransaction): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: MintTransaction, oldRow?: MintTransaction): any {
        const diff: any = this.compareData(newRow, oldRow);
        return diff;
    }

    protected override checkDocument(newRow: MintTransaction, oldRow: MintTransaction): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: MintTransaction, oldRow?: MintTransaction): boolean {
        return false;
    }

    protected override async loadFile(row: MintTransaction, i: number = 0): Promise<MintTransaction> {
        return row;
    }

    protected override async clearFile(row: MintTransaction): Promise<MintTransaction> {
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<MintTransaction>, row?: MintTransaction): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
