import { FindCursor } from 'mongodb';
import { DeleteCache, RestoreEntity } from '@guardian/common';
import { DiffActionType, ICollectionDiff, IDiffAction } from '../index.js';
import crypto from 'node:crypto';

interface DiffResult<T extends RestoreEntity> {
    backup: ICollectionDiff<T>;
    diff: ICollectionDiff<T>;
}

export abstract class CollectionBackup<T extends RestoreEntity> {
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

    public async createCollectionBackup(): Promise<DiffResult<T>> {
        const rows = this.findDocuments();

        const backupActions: IDiffAction<T>[] = [];
        const diffActions: IDiffAction<T>[] = [];
        let hash = '';
        while (await rows.hasNext()) {
            const row = await rows.next();
            if (this.needLoadFile(row)) {
                await this.loadFile(row);
            } else {
                this.clearFile(row);
            }
            const backupAction: IDiffAction<T> = {
                type: DiffActionType.Set,
                id: row._id.toString(),
                data: this.createBackupData(row)
            }
            const diffAction: IDiffAction<T> = {
                type: DiffActionType.Set,
                id: row._id.toString(),
                data: this.createDiffData(row)
            }
            backupActions.push(backupAction);
            diffActions.push(diffAction);
            hash = this.actionHash(hash, diffAction, row);
        }
        return {
            backup: {
                hash,
                fullHash: hash,
                actions: backupActions
            },
            diff: {
                hash,
                fullHash: hash,
                actions: diffActions
            }
        }
    }

    public async createCollectionDiff(
        oldCollectionDiff: ICollectionDiff<T>,
        lastUpdate: Date
    ): Promise<DiffResult<T>> {
        const backup = oldCollectionDiff?.actions || [];

        const rows = this.findDocuments(lastUpdate);
        const list = new Map<string, T>();
        while (await rows.hasNext()) {
            const row = await rows.next();
            const id = row._id.toString();
            list.set(id, row);
        }

        const deletedRows = this.findDeletedDocuments();
        const deletedList = new Set<string>();
        while (await deletedRows.hasNext()) {
            const deletedRow = await deletedRows.next();
            const id = deletedRow.rowId.toString();
            deletedList.add(id);
        }

        let hash = '';
        const backupActions: IDiffAction<T>[] = [];
        const diffActions: IDiffAction<T>[] = [];
        for (const item of backup) {
            if (deletedList.has(item.id)) {
                const diffAction = {
                    type: DiffActionType.Delete,
                    id: item.id,
                    data: null
                }
                hash = this.actionHash(hash, diffAction);
                diffActions.push(diffAction);
            } else if (list.has(item.id)) {
                const newRow = list.get(item.id);
                const oldRow = item.data;
                list.delete(item.id);

                if (this.needLoadFile(newRow, oldRow)) {
                    await this.loadFile(newRow);
                } else {
                    this.clearFile(newRow);
                }
                if (this.checkDocument(newRow, oldRow)) {
                    const backupAction = {
                        type: DiffActionType.Update,
                        id: item.id,
                        data: Object.assign(item.data, this.createBackupData(newRow))
                    }
                    const diffAction = {
                        type: DiffActionType.Update,
                        id: item.id,
                        data: this.createDiffData(newRow, oldRow)
                    }
                    backupActions.push(backupAction);
                    diffActions.push(diffAction);
                    hash = this.actionHash(hash, diffAction, newRow);
                } else {
                    backupActions.push(item);
                }
            } else {
                backupActions.push(item);
            }
        }
        for (const [id, newRow] of list.entries()) {
            if (this.needLoadFile(newRow)) {
                await this.loadFile(newRow);
            } else {
                this.clearFile(newRow);
            }
            const backupAction: IDiffAction<T> = {
                type: DiffActionType.Create,
                id,
                data: this.createBackupData(newRow)
            };
            const diffAction: IDiffAction<T> = {
                type: DiffActionType.Create,
                id,
                data: this.createDiffData(newRow)
            };
            backupActions.push(backupAction);
            diffActions.push(diffAction);
            hash = this.actionHash(hash, diffAction, newRow);
        }
        const oldFullHash = oldCollectionDiff?.fullHash || '';
        const backupHash = hash ? this.sumHash(oldFullHash, hash) : oldFullHash;
        return {
            backup: {
                hash: backupHash,
                fullHash: backupHash,
                actions: backupActions
            },
            diff: {
                hash,
                fullHash: backupHash,
                actions: diffActions
            }
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

    protected compareValue(oldValue: any, newValue: any): boolean {
        return oldValue === newValue;
    }

    protected compareData(newVc: T, oldVc?: T): any {
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
                if (!this.compareValue(newVc[key], oldVc[key])) {
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
        return diff;
    }

    protected abstract actionHash(hash: string, action: IDiffAction<T>, row?: T): string;

    protected abstract findDocument(row: T): Promise<T>;

    protected abstract findDocuments(lastUpdate?: Date): FindCursor<T>;

    protected abstract findDeletedDocuments(): FindCursor<DeleteCache>;

    protected abstract needLoadFile(newRow: T, oldRow?: T): boolean;

    protected abstract loadFile(row: T): Promise<T>;

    protected abstract clearFile(row: T): Promise<T>;

    protected abstract createBackupData(row: T): any;

    protected abstract createDiffData(newRow: T, oldRow?: T): any;

    protected abstract checkDocument(newRow: T, oldRow: T): boolean;
}
