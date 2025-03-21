import { DataBaseHelper } from "@guardian/common";
import { FindCursor } from "mongodb";
import { CollectionBackup, IDiffAction, VC } from '../index.js';

export class VcCollectionBackup extends CollectionBackup<VC> {
    protected override async findDocument(row: VC): Promise<VC> {
        const vcCollection = DataBaseHelper.orm.em.getCollection('VcDocument');
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<VC> {
        const vcCollection = DataBaseHelper.orm.em.getCollection('VcDocument');
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<VC> {
        const vcCollection = DataBaseHelper.orm.em.getCollection('VcDocument');
        const vcRows = vcCollection.find<any>({ policyId: this.policyId, t: 1 });
        return vcRows;
    }

    protected override createBackupData(row: VC): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newVc: VC, oldVc?: VC): any {
        let diff: any;
        if (oldVc) {
            const list = new Set<string>();
            for (const key of Object.keys(newVc)) {
                list.add(key);
            }
            for (const key of Object.keys(oldVc)) {
                list.add(key);
            }
            diff = {};
            for (const key of list) {
                if (!this.compare(newVc[key], oldVc[key])) {
                    diff[key] = newVc[key];
                }

            }
        } else {
            diff = newVc;
        }
        delete diff._id;
        delete diff.id;
        delete diff.createDate;
        delete diff.updateDate;
        delete diff.documentFileId;
        return diff;
    }

    protected override async loadFile(row: any, i: number = 0): Promise<any> {
        try {
            if (i > 10) {
                console.error('Load file error');
                return row;
            }
            if (row.documentFileId) {
                const buffer = await DataBaseHelper.loadFile(row.documentFileId);
                if (buffer) {
                    row.document = buffer.toString('base64');
                }
            }
        } catch (error) {
            const newRow = this.findDocument(row);
            return await this.loadFile(newRow, i + 1);
        }
    }

    protected override checkDocument(newVc: VC, oldVc: VC): boolean {
        return (newVc._docHash !== oldVc._docHash) || (newVc._propHash !== oldVc._propHash);
    }

    protected override needLoadFile(newVc: VC, oldVc?: VC): boolean {
        return (!oldVc) || (newVc._docHash !== oldVc._docHash);
    }

    protected override actionHash(hash: string, action: IDiffAction<VC>, row?: VC): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
