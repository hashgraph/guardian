import { FindCursor } from "mongodb";
import { DiffActionType, ICollectionDiff, IDiffAction, IPolicyDiff, Row } from '../index.js';
import crypto from "crypto";

export abstract class CollectionRestore<T extends Row> {
    protected readonly policyId: string;

    constructor(policyId: string) {
        this.policyId = policyId;
    }

    public async restoreBackup(backup: ICollectionDiff<T>): Promise<boolean> {
        await this.clearCollection();

        let hash = '';
        const rows: T[] = [];
        for (const action of backup.actions) {
            const row = this.createRow(action.data);
            row._restoreId = action.id;
            rows.push(row);
            hash = this.actionHash(hash, action, row);
        }

        await this.insertDocuments(rows);

        console.log(backup.hash, hash)

        return backup.hash === hash;
    }

    public async restoreDiff(diff: ICollectionDiff<T>): Promise<void> {

        const insertRows: T[] = [];
        const updateRows: T[] = [];
        const deleteRows: T[] = [];

        for (const action of diff.actions) {
            const row = this.createRow(action.data);
            row._restoreId = action.id;

            if (action.type === DiffActionType.Delete) {
                deleteRows.push(row);
            } else if (action.type === DiffActionType.Update) {
                updateRows.push(row);
            } else {
                insertRows.push(row);
            }
        }

        await this.insertDocuments(insertRows);
        await this.updateDocuments(updateRows);
        await this.deleteDocuments(deleteRows);
    }

    protected sumHash(...hash: string[]): string {
        const result = hash?.join('');
        if (result) {
            return crypto
                .createHash('md5')
                .update(result)
                .digest("hex");
        } else {
            return '';
        }
    }

    protected abstract actionHash(hash: string, action: IDiffAction<T>, row?: T): string;

    protected abstract createRow(data: any): T;

    protected abstract clearCollection(): Promise<void>;
    protected abstract insertDocuments(rows: T[]): Promise<void>;
    protected abstract updateDocuments(rows: T[]): Promise<void>;
    protected abstract deleteDocuments(rows: T[]): Promise<void>;
}
