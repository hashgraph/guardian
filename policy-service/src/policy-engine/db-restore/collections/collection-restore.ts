import { FindCursor } from "mongodb";
import { DiffActionType, ICollectionDiff, IDiffAction, Row } from './../index.js';
import crypto from "crypto";

export abstract class CollectionRestore<T extends Row> {
    protected readonly policyId: string;

    constructor(policyId: string) {
        this.policyId = policyId;
    }

    public async createCollectionBackup(): Promise<ICollectionDiff<T>> {
        const rows = this.findDocuments();

        const actions: IDiffAction<T>[] = [];
        let hash = '';
        while (await rows.hasNext()) {
            const row = await rows.next();
            if (this.needLoadFile(row)) {
                await this.loadFile(row);
            }
            const action: IDiffAction<T> = {
                type: DiffActionType.Set,
                id: row._id.toString(),
                data: this.createDocument(row)
            }
            hash = this.actionHash(hash, action, row);
            actions.push(action);
        }
        const diff: ICollectionDiff<T> = {
            hash,
            actions
        };
        return diff;
    }

    public async createCollectionDiff(
        oldCollectionDiff: ICollectionDiff<T>,
        lastUpdate: Date
    ): Promise<{ backup: ICollectionDiff<T>; diff: ICollectionDiff<T>; }> {
        const backup = oldCollectionDiff.actions || [];

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
            const id = deletedRow._id.toString();
            deletedList.add(id);
        }

        let hash = '';
        const oldActions: IDiffAction<T>[] = [];
        const newActions: IDiffAction<T>[] = [];
        for (const item of backup) {
            if (deletedList.has(item.id)) {
                const newAction = {
                    type: DiffActionType.Delete,
                    id: item.id,
                    data: null
                }
                hash = this.actionHash(hash, newAction);
                newActions.push(newAction);
            } else if (list.has(item.id)) {
                const newRow = list.get(item.id);
                const oldRow = item.data;
                list.delete(item.id);

                if (this.needLoadFile(newRow, oldRow)) {
                    await this.loadFile(newRow);
                }
                if (this.checkDocument(newRow, oldRow)) {
                    const newAction = {
                        type: DiffActionType.Update,
                        id: item.id,
                        data: this.createDocument(newRow, oldRow)
                    }
                    hash = this.actionHash(hash, newAction, newRow);
                    newActions.push(newAction);
                }
                oldActions.push({
                    ...item,
                    type: DiffActionType.Update,
                    data: Object.assign(item.data, this.createDocument(newRow))
                });
            } else {
                oldActions.push(item);
            }
        }
        for (const [id, newRow] of list.entries()) {
            if (this.needLoadFile(newRow)) {
                await this.loadFile(newRow);
            }
            const newAction: IDiffAction<T> = {
                type: DiffActionType.Create,
                id,
                data: this.createDocument(newRow)
            };
            hash = this.actionHash(hash, newAction, newRow);
            newActions.push(newAction);
            oldActions.push(newAction);
        }
        const oldHash = hash ? this.sumHash(oldCollectionDiff.hash, hash) : oldCollectionDiff.hash;
        return {
            backup: {
                hash: oldHash,
                actions: oldActions
            },
            diff: {
                hash,
                actions: newActions
            }
        }
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

    protected abstract findDocument(row: T): Promise<T>;

    protected abstract findDocuments(lastUpdate?: Date): FindCursor<T>;

    protected abstract findDeletedDocuments(): FindCursor<T>;

    protected abstract needLoadFile(newRow: T, oldRow?: T): boolean;

    protected abstract loadFile(row: T): Promise<any>;

    protected abstract createDocument(newRow: T, oldRow?: T): any;

    protected abstract checkDocument(newRow: T, oldRow: T): boolean;
}
