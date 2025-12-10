import {Injectable} from '@angular/core';
import {openDB, IDBPDatabase} from 'idb';

interface StoreConfig {
    name: string;
    options?: IDBObjectStoreParameters;
}

interface DbMeta {
    version: number;
    stores: Map<string, IDBObjectStoreParameters | undefined>;
    dbPromise?: Promise<IDBPDatabase<unknown>>;
}

@Injectable({providedIn: 'root'})
export class IndexedDbRegistryService {
    private metas = new Map<string, DbMeta>();

    async registerStores(
        dbName: string,
        storeConfigs: StoreConfig[]
    ): Promise<void> {
        if (this.metas.has(dbName)) {
            return;
        }

        const databaseExists = await this.databaseExists(dbName);

        const storesMap = new Map<string, IDBObjectStoreParameters | undefined>(
            storeConfigs.map((c) => [c.name, c.options])
        );

        const meta: DbMeta = {
            version: 1,
            stores: storesMap,
            dbPromise: undefined
        };

        this.metas.set(dbName, meta);

        if (databaseExists) {
            return;
        }

        meta.dbPromise = this.open(dbName, meta);
        await meta.dbPromise;
    }

    async getDB<T = unknown>(dbName: string): Promise<IDBPDatabase<T>> {
        const meta = this.metas.get(dbName);
        if (!meta) {
            throw new Error(`DB "${dbName}" is not registered`);
        }

        if (meta.dbPromise) {
            try {
                const oldDb = await meta.dbPromise;
                oldDb.close();
            } catch(err) {
                console.warn(`[IndexedDB] Failed to close "${dbName}", but continuing…`, err);
            }
            meta.dbPromise = undefined;
        }

        meta.dbPromise = this.open(dbName, meta);

        try {
            return await meta.dbPromise as IDBPDatabase<T>;
        } catch (error: any) {
            if (error instanceof DOMException &&
                (error.name === 'InvalidStateError' || error.name === 'VersionError')) {
                console.warn(`[IndexedDB] Re-opening "${dbName}" after error ${error.name}`);
                meta.dbPromise = this.open(dbName, meta);
                return await meta.dbPromise as IDBPDatabase<T>;
            }
            throw error;
        }
    }

    put<T = unknown>(db: string, store: string, value: T) {
        return this.getDB(db).then(conn => conn.put(store, value));
    }

    get<T = unknown>(db: string, store: string, key: IDBValidKey) {
        return this.getDB(db).then(conn => conn.get(store, key));
    }

    delete(db: string, store: string, key: IDBValidKey) {
        return this.getDB(db).then(conn => conn.delete(store, key));
    }

    private open(dbName: string, meta: DbMeta) {
        return openDB(dbName, meta.version, {
            upgrade(db) {
                meta.stores.forEach((opts, name) => {
                    if (!db.objectStoreNames.contains(name)) {
                        db.createObjectStore(name, opts);
                    }
                });
            },
        });
    }

    async clearStore(dbName: string, storeName: string): Promise<void> {
        const connection = await this.getDB(dbName);
        await connection.clear(storeName);
    }

    private async databaseExists(dbName: string): Promise<boolean> {
        try {
            const nativeIndexedDb: any = (globalThis as any).indexedDB;
            if (nativeIndexedDb && typeof nativeIndexedDb.databases === 'function') {
                const list: Array<{ name?: string }> = await nativeIndexedDb.databases();
                return list.some((d) => d.name === dbName);
            }
        } catch {
        }
        return false;
    }
}
