import { RestoreEntity } from '@guardian/common';
import { DiffActionType, ICollectionDiff, IDiffAction } from '../index.js';
import crypto from 'crypto';
import { ObjectId } from '@mikro-orm/mongodb';

export abstract class CollectionRestore<T extends RestoreEntity> {
    protected readonly policyId: string;
    protected readonly policyOwner: string;
    protected readonly messageId: string;

    constructor(
        policyId: string,
        policyOwner: string,
        messageId: string
    ) {
        this.policyId = policyId;
        this.policyOwner = policyOwner;
        this.messageId = messageId;
    }

    public async restoreBackup(backup: ICollectionDiff<T>): Promise<ICollectionDiff<T>> {
        await this.clearCollection();

        if (!backup) {
            return null;
        }

        let hash = '';
        const rows: T[] = [];
        for (const action of backup.actions) {
            const row = this.createRow(action.data, action.id);
            await this.decryptRow(row, action.id);
            this.setRowId(row, action);
            rows.push(row);
            hash = this.actionHash(hash, action, row);
        }

        await this.insertDocuments(rows);

        if (backup.hash === hash) {
            return {
                hash,
                fullHash: hash,
                actions: []
            }
        } else {
            return null;
        }
    }

    public async restoreDiff(
        diff: ICollectionDiff<T>,
        oldCollectionDiff: ICollectionDiff<T>,
    ): Promise<ICollectionDiff<T>> {
        if (!diff) {
            return null;
        }

        const insertRows: T[] = [];
        const updateRows: T[] = [];
        const deleteRows: T[] = [];

        let hash = '';
        for (const action of diff.actions) {
            const row = this.createRow(action.data, action.id);
            await this.decryptRow(row, action.id);
            this.setRowId(row, action);

            if (action.type === DiffActionType.Delete) {
                deleteRows.push(row);
            } else if (action.type === DiffActionType.Update) {
                updateRows.push(row);
            } else {
                insertRows.push(row);
            }

            hash = this.actionHash(hash, action);
        }
        const fullHash = oldCollectionDiff ?
            (hash ?
                this.sumHash(oldCollectionDiff.fullHash, hash) :
                oldCollectionDiff.fullHash
            ) : null;

        await this.insertDocuments(insertRows);
        await this.updateDocuments(updateRows);
        await this.deleteDocuments(deleteRows);

        if (
            diff.hash === hash &&
            diff.fullHash === fullHash
        ) {
            return {
                hash,
                fullHash,
                actions: []
            }
        } else {
            return null;
        }
    }

    protected sumHash(...hash: string[]): string {
        const result = hash?.join('');
        if (result) {
            return crypto
                .createHash('md5')
                .update(result)
                .digest('hex');
        } else {
            return '';
        }
    }

    protected setRowId(row: T, action: IDiffAction<T>) {
        row._id = new ObjectId(action.id);
        row.id = action.id;
        row._restoreId = action.id;
    }

    protected abstract actionHash(hash: string, action: IDiffAction<T>, row?: T): string;

    protected abstract createRow(data: any, id: string): T;
    protected abstract decryptRow(row: T, id: string): Promise<T>;

    protected abstract clearCollection(): Promise<void>;
    protected abstract insertDocuments(rows: T[]): Promise<void>;
    protected abstract updateDocuments(rows: T[]): Promise<void>;
    protected abstract deleteDocuments(rows: T[]): Promise<void>;
}
