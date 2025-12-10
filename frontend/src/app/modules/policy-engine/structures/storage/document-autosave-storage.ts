import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { Stack, DocumentAutosaveStorageItem } from './storage';
import {DB_NAME, STORES_NAME} from 'src/app/constants';

export class DocumentAutosaveStorage<T = any> {
  private readonly DB = DB_NAME.GUARDIAN;
  private readonly STORE = STORES_NAME.DOCUMENT_AUTOSAVE_STORAGE;

  constructor(private _storage: IndexedDbRegistryService) {
    this._storage.registerStore(this.DB, { name: this.STORE, options: { keyPath: 'documentId' } });
  }

  async load(documentId: string): Promise<T | null> {
    const rec = await this._storage.get<{ documentId: string; value: T }>(this.DB, this.STORE, documentId);
    return rec?.value ?? null;
  }

  async save(documentId: string, value: T): Promise<void> {
    await this._storage.put(this.DB, this.STORE, { documentId, value, updatedAt: Date.now() });
  }

  async delete(documentId: string): Promise<void> {
    const rec = await this._storage.get<{ documentId: unknown; value: unknown }>(
        this.DB, this.STORE, documentId
    );

    try {
        await this._storage.delete(this.DB, this.STORE, documentId);
    } catch (e) {
        console.error('delete error:', e);
    }
  }
}
