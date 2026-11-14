import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { Stack, DocumentAutosaveStorageItem } from './storage';
import {DB_NAME, STORES_NAME} from 'src/app/constants';

/**
 * An autosave is stale when the draft record was saved again after the autosave was based on it,
 * for example from another browser. Restoring it would overwrite the newer data.
 * Both times come from the server, so the browser clock does not matter. With a missing or
 * unreadable time the autosave is kept.
 */
export function isAutosaveStale(baseUpdateDate: string | undefined, recordUpdateDate: string | undefined): boolean {
  const base = baseUpdateDate ? Date.parse(baseUpdateDate) : NaN;
  const record = recordUpdateDate ? Date.parse(recordUpdateDate) : NaN;
  if (Number.isNaN(base) || Number.isNaN(record)) {
    return false;
  }
  return base !== record;
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

  async loadRecord(documentId: string): Promise<{ value: T; updatedAt?: number; baseUpdateDate?: string } | null> {
    const rec = await this._storage.get<{ documentId: string; value: T; updatedAt?: number; baseUpdateDate?: string }>(
      this.DB, this.STORE, documentId
    );
    if (!rec || rec.value == null) {
      return null;
    }
    return { value: rec.value, updatedAt: rec.updatedAt, baseUpdateDate: rec.baseUpdateDate };
  }

  /**
   * @param baseUpdateDate Update time, from the server, of the draft record the value is based on
   */
  async save(documentId: string, value: T, baseUpdateDate?: string): Promise<void> {
    await this._storage.put(this.DB, this.STORE, { documentId, value, updatedAt: Date.now(), baseUpdateDate });
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
