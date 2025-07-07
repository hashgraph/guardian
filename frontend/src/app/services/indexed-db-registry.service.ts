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
            meta = {version: 1, stores: new Map([[cfg.name, cfg.options]])};
            this.metas.set(dbName, meta);
        }

        if (meta.stores.has(cfg.name)) {
            return;
        }

        meta.stores.set(cfg.name, cfg.options);
        meta.version++;
        meta.dbPromise = this.open(dbName, meta);
        await meta.dbPromise;
    }

    getDB<T = unknown>(dbName: string): Promise<IDBPDatabase<T>> {
        const meta = this.metas.get(dbName);
        if (!meta) {
            throw new Error(`DB "${dbName}" is not registered`);
        }
        if (!meta.dbPromise) {
            meta.dbPromise = this.open(dbName, meta);
        }
        return meta.dbPromise as Promise<IDBPDatabase<T>>;
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
}
