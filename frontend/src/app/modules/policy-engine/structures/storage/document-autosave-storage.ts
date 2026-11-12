import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { Stack, DocumentAutosaveStorageItem } from './storage';
import {DB_NAME, STORES_NAME} from 'src/app/constants';

/**
 * An autosave is stale when the server record it was made for was saved after it,
 * for example from another browser. Restoring it would overwrite the newer data.
 * With a missing or unreadable time the autosave is kept.
 */
export function isAutosaveStale(autosavedAt: number | undefined, recordUpdateDate: string | undefined): boolean {
  const recordTime = recordUpdateDate ? Date.parse(recordUpdateDate) : NaN;
  if (autosavedAt == null || Number.isNaN(recordTime)) {
    return false;
  }
  return recordTime > autosavedAt;
}

export class DocumentAutosaveStorage<T = any> {
  private readonly DB = DB_NAME.GUARDIAN;
  private readonly STORE = STORES_NAME.DOCUMENT_AUTOSAVE_STORAGE;

  constructor(private _storage: IndexedDbRegistryService) {
    this._storage.registerStore(this.DB, { name: this.STORE, options: { keyPath: 'documentId' } });
  }

  async load(documentId: string): Promise<T | null> {
    return (await this.loadRecord(documentId))?.value ?? null;
  }

  async loadRecord(documentId: string): Promise<{ value: T; updatedAt?: number } | null> {
    const rec = await this._storage.get<{ documentId: string; value: T; updatedAt?: number }>(this.DB, this.STORE, documentId);
    if (!rec || rec.value == null) {
      return null;
    }
    return { value: rec.value, updatedAt: rec.updatedAt };
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
