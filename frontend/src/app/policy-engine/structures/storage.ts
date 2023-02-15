interface PolicyStorageItem {
    view: string;
    value: string;
}

/**
 * Base class for storing states
 *
 * @export
 * @class Stack
 * @template T
 */
export class Stack<T> {
    private MAX_STACK_SIZE = 100;
    private stack: Array<T | null>;
    private stackSize: number;
    private stackIndex: number;
    private maxSize: number;

    constructor(maxSize: number) {
        if (maxSize > 0 && maxSize < this.MAX_STACK_SIZE) {
            this.maxSize = maxSize + 1;
        } else {
            this.maxSize = this.MAX_STACK_SIZE;
        }
        this.stack = new Array<T>(this.maxSize);
        this.stackSize = 0;
        this.stackIndex = 0;
    }

    public push(item: T): void {
        if (this.stackIndex > 0) {
            this.stackSize = this.stackSize - this.stackIndex;
            for (let index = 0; index < this.stackSize; index++) {
                this.stack[index] = this.stack[this.stackIndex];
                this.stackIndex++;
            }
        }
        this.stackSize++;
        this.stackIndex = 0;
        if (this.stackSize > this.maxSize) {
            this.stackSize = this.maxSize;
        }
        if (this.stackSize < 0) {
            this.stackSize = 0;
        }
        for (let index = this.maxSize - 1; index > 0; index--) {
            if (index > this.stackSize) {
                this.stack[index] = null;
            } else {
                this.stack[index] = this.stack[index - 1];
            }
        }
        this.stack[0] = item;
    }

    public pop(): T | null {
        if (this.stackSize < 1) {
            return null;
        }
        this.stackIndex = 0;
        let item = this.stack[0];
        for (let index = 0; index < this.maxSize; index++) {
            if (index >= this.stackSize) {
                this.stack[index] = null;
            } else {
                this.stack[index] = this.stack[index + 1];
            }
        }
        this.stackSize--;
        return item;
    }

    public undo(): T | null {
        if (this.stackSize < 1) {
            return null;
        }
        this.stackIndex++;
        if (this.stackIndex > this.stackSize) {
            this.stackIndex = this.stackSize;
        }
        return this.stack[this.stackIndex];
    }

    public redo(): T | null {
        if (this.stackSize < 1) {
            return null;
        }
        this.stackIndex--;
        if (this.stackIndex < 0) {
            this.stackIndex = 0;
        }
        return this.stack[this.stackIndex];
    }

    public current(): T | null {
        if (this.stackSize < 1) {
            return null;
        }
        if (this.stackIndex < 0) {
            this.stackIndex = 0;
        }
        return this.stack[this.stackIndex];
    }

    public clear(): void {
        this.stack = new Array<T>(this.maxSize);
        this.stackSize = 0;
        this.stackIndex = 0;
    }

    public isUndo(): boolean {
        return this.stackIndex < this.stackSize - 1;
    }

    public isRedo(): boolean {
        return this.stackIndex > 0;
    }
}

export class PolicyStorage {
    private readonly STORAGE_NAME = 'POLICY_STORAGE';

    private _storage: Storage;
    private _policyStorage: Stack<PolicyStorageItem>;
    private _policyId!: string;

    constructor(storage: Storage) {
        this._storage = storage;
        this._policyStorage = new Stack(10);
    }

    public load(policyId: string) {
        this._policyId = policyId;
        this._policyStorage.clear();

        const storageMap = this.getMap();
        const item = storageMap[policyId];
        if (item) {
            this._policyStorage.push(item);
        }
    }

    public get current(): PolicyStorageItem | null {
        return this._policyStorage.current();
    }

    public get isUndo(): boolean {
        return this._policyStorage.isUndo();
    }

    public get isRedo(): boolean {
        return this._policyStorage.isRedo();
    }

    public undo(): PolicyStorageItem | null {
        const item = this._policyStorage.undo();
        this.save();
        return item;
    }

    public redo(): PolicyStorageItem | null {
        const item = this._policyStorage.redo();
        this.save();
        return item;
    }

    public push(view: string, value: string) {
        const current = this._policyStorage.current();
        if (
            current &&
            current.value == value &&
            current.view == view
        ) {
            return;
        }
        this._policyStorage.push({
            value: value,
            view: view
        });
        this.save();
    }

    public set(view: string, value: string | null) {
        this._policyStorage.clear();
        if(value) {
            this._policyStorage.push({
                value: value,
                view: view
            });
        }
        this.save();
    }

    public save() {
        if (this._policyId) {
            this.setMap(this._policyId, this._policyStorage.current());
        }
    }

    private setMap(policyId: string, value: any): any {
        const storageMap = this.getMap();
        try {
            storageMap[policyId] = value;
            const storageValue = JSON.stringify(storageMap);
            this._storage.setItem(this.STORAGE_NAME, storageValue);
        } catch (error) {
            delete storageMap[policyId];
            const storageValue = JSON.stringify(storageMap);
            this._storage.setItem(this.STORAGE_NAME, storageValue);
        }
    }

    private getMap(): any {
        try {
            const storageValue = this._storage.getItem(this.STORAGE_NAME);
            let storageMap = {};
            if (storageValue) {
                storageMap = JSON.parse(storageValue);
            } else {
                storageMap = {};
                this._storage.setItem(this.STORAGE_NAME, JSON.stringify(storageMap));
            }
            return storageMap;
        } catch (error) {
            let storageMap = {};
            this._storage.setItem(this.STORAGE_NAME, JSON.stringify(storageMap));
            return storageMap;
        }
    }
}