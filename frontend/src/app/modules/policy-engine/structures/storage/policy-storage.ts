import { Stack, PolicyStorageItem } from "./storage";

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

    public destroy(): void {

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
        if (current &&
            current.value == value &&
            current.view == view) {
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
        if (value) {
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
