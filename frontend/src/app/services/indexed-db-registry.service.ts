import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';

interface StoreConfig {
    name: string;
    options?: IDBObjectStoreParameters;
}

interface DbMeta {
    version: number;
    stores: Map<string, IDBObjectStoreParameters | undefined>;
    dbPromise?: Promise<IDBPDatabase<unknown>>;
}

@Injectable({ providedIn: 'root' })
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

    async registerStore(dbName: string, cfg: StoreConfig): Promise<void> {
        let meta = this.metas.get(dbName);
        if (!meta) {
            meta = { version: 1, stores: new Map() };
            this.metas.set(dbName, meta);
        }

        meta.stores.set(cfg.name, cfg.options);

        const probe = await openDB(dbName);
        const existingVersion = probe.version;
        const hasStoreInDB = probe.objectStoreNames.contains(cfg.name);
        probe.close();

        const openWithListener = () =>
            this.open(dbName, meta).then((db: any) => {
                db.addEventListener('versionchange', () => {
                    try { db.close(); } catch { }
                    const m = this.metas.get(dbName);
                    if (m) m.dbPromise = undefined;
                });
                return db;
            });

        if (!hasStoreInDB) {
            meta.version = Math.max(meta.version, existingVersion) + 1;
            meta.dbPromise = openWithListener();
            await meta.dbPromise;
            return;
        }

        meta.version = Math.max(meta.version, existingVersion);
        if (!meta.dbPromise) {
            meta.dbPromise = openWithListener();
            await meta.dbPromise;
        }
    }

    async getDB<T = unknown>(dbName: string): Promise<IDBPDatabase<T>> {
        const meta = this.metas.get(dbName);
        if (!meta) {
            throw new Error(`DB "${dbName}" is not registered`);
        }

        if (meta.dbPromise) {
            try { return await meta.dbPromise as IDBPDatabase<T>; }
            catch { meta.dbPromise = undefined; }
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

    public put<T = unknown>(db: string, store: string, value: T): Promise<IDBValidKey> {
        return this.getDB(db).then(conn => conn.put(store, value));
    }

    public get<T = unknown>(db: string, store: string, key: IDBValidKey): Promise<T> {
        return this.getDB(db).then(conn => conn.get(store, key));
    }

    public getAll<T = unknown>(db: string, store: string, range: IDBValidKey | IDBKeyRange): Promise<T[]> {
        return this.getDB(db).then(conn => conn.getAll(store, range));
    }

    public delete(db: string, store: string, key: IDBValidKey): Promise<void> {
        return this.getDB(db).then(conn => conn.delete(store, key));
    }

    public getBatch<T = unknown>(db: string, store: string, keys: IDBValidKey[]): Promise<T[]> {
        return new Promise<T[]>((resolve) => {
            if (!keys?.length) {
                resolve([]);
                return;
            }
            this.getDB(db).then((conn) => {
                let index = 0;
                const items: T[] = [];
                for (const key of keys) {
                    conn.get(store, key).then((value) => {
                        if (value) {
                            items.push(value);
                        }
                        index++;
                        if (index >= keys.length) {
                            resolve(items);
                        }
                    }).catch(() => {
                        index++;
                        if (index >= keys.length) {
                            resolve(items);
                        }
                    })
                }
            });
        });
    }

    private open(dbName: string, meta: DbMeta) {
        const storesSnapshot = Array.from(meta.stores.entries());

        return openDB(dbName, meta.version, {
            upgrade(db, oldVersion, newVersion, tx) {
                for (const [name, opts] of storesSnapshot) {
                    const exists = db.objectStoreNames.contains(name);
                    const os = exists ? tx.objectStore(name) : db.createObjectStore(name, opts);
                }
            },

            blocked() {
                console.warn(`[IndexedDB] Upgrade for "${dbName}" is blocked by another tab. Close other tabs to continue.`);
            },
            blocking() {
                console.warn(`[IndexedDB] Another tab is upgrading "${dbName}". This connection will be closed.`);
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

    async clearByKeyPrefixAcrossStores(
        databaseName: string,
        storeNames: string[],
        keyPrefix: string
    ): Promise<void> {
        const metadata = this.metas.get(databaseName);

        if (!metadata) {
            const exists = await this.databaseExists(databaseName);
            if (!exists) {
                return;
            }
        }

        let connection: IDBPDatabase | null = null;

        if (metadata?.dbPromise) {
            connection = await metadata.dbPromise;
        } else if (metadata) {
            return;
        } else {
            connection = await openDB(databaseName);
        }

        for (const storeName of storeNames) {
            if (!connection.objectStoreNames.contains(storeName)) {
                continue;
            }

            const readOnlyTransaction = connection.transaction(storeName, 'readonly');
            const readOnlyStore = readOnlyTransaction.objectStore(storeName);
            const allKeys = await readOnlyStore.getAllKeys();

            const keysToDelete = allKeys.filter((key) => {
                const keyString = String(key ?? '');
                return keyString.includes(keyPrefix);
            });

            if (keysToDelete.length === 0) {
                continue;
            }

            const writeTransaction = connection.transaction(storeName, 'readwrite');
            const writeStore = writeTransaction.objectStore(storeName);

            for (const key of keysToDelete) {
                await writeStore.delete(key);
            }

            await writeTransaction.done;
        }
    }
}
