import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { Stack, PolicyStorageItem } from './storage';
import {DB_NAME, STORES_NAME} from 'src/app/constants';

export class PolicyStorage {
    private readonly DB_NAME = DB_NAME.GUARDIAN;
    private readonly STORAGE_NAME = STORES_NAME.POLICY_STORAGE;

    private _storage: IndexedDbRegistryService;
    private _policyStorage: Stack<PolicyStorageItem>;
    private _policyId!: string;

    constructor(storage: IndexedDbRegistryService) {
        this._storage = storage;
        this._policyStorage = new Stack(10);

        this._storage.registerStore(DB_NAME.GUARDIAN, { name: STORES_NAME.POLICY_STORAGE, options: { keyPath: 'policyId' } });
    }

    public async load(policyId: string, initialState?: PolicyStorageItem) {
        this._policyId = policyId;
        this._policyStorage.clear();

        const item = await this.getPolicyById(policyId);

        if (item) {
            this._policyStorage.push(item);
        } else if (initialState) {
            this._policyStorage.push(initialState);
        }
    }

    public destroy(): void {}

    public get current(): PolicyStorageItem | null {
        return this._policyStorage.current();
    }

    public get isUndo(): boolean {
        return this._policyStorage.isUndo();
    }

    public get isRedo(): boolean {
        return this._policyStorage.isRedo();
    }

    public async undo(): Promise<PolicyStorageItem | null> {
        const item = this._policyStorage.undo();
        await this.save();
        return item;
    }

    public async redo(): Promise<PolicyStorageItem | null> {
        const item = this._policyStorage.redo();
        await this.save();
        return item;
    }

    public async push(view: string, value: string) {
        const current = this._policyStorage.current();
        if (current && current.value === value && current.view === view) {
            return;
        }
        this._policyStorage.push({ value, view });
        await this.save();
    }

    public async set(view: string, value: string | null) {
        this._policyStorage.clear();
        if (value) {
            this._policyStorage.push({ value, view });
        }
        await this.save();
    }

    public async save() {
        if (!this._policyId) {
            return;
        }

        const curr = this._policyStorage.current();
        if (!curr) {
            await this._storage.delete(this.DB_NAME, this.STORAGE_NAME, this._policyId);
            return
        }

        if (this._policyId) {
            await this.setMap(this._policyId, this._policyStorage.current());
        }
    }

    public async deleteById(policyId: string): Promise<void> {
        const db = await this._storage.getDB(this.DB_NAME);
        const tx = db.transaction(this.STORAGE_NAME, 'readwrite');
        tx.objectStore(this.STORAGE_NAME).delete(policyId);
        await tx.done;
    }

    private async setMap(policyId: string, value: any): Promise<void> {
        await this._storage.put(this.DB_NAME, this.STORAGE_NAME, { policyId, ...value });
    }

    public async getPolicyById(policyId: string): Promise<PolicyStorageItem | null> {
        const item = await this._storage.get<PolicyStorageItem>(this.DB_NAME, this.STORAGE_NAME, policyId);
        return item ?? null;
    }

    private async getMap(): Promise<any> {
        const db = await this._storage.getDB(this.DB_NAME);
        const tx = db.transaction(this.STORAGE_NAME, 'readonly');
        const store = tx.objectStore(this.STORAGE_NAME);

        const allItems = await store.getAll();
        const map: Record<string, any> = {};
        allItems.forEach(item => map[item.policyId] = item);

        return map;
    }
}
