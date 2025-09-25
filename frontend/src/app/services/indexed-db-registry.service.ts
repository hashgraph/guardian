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
                try { db.close(); } catch {}
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
}
