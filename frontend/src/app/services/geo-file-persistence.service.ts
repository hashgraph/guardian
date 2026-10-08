import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DB_NAME, STORES_NAME } from '../constants';
import { gzipBlob } from '../modules/schema-engine/geo-file/geo-file-compression';
import { ArtifactService } from './artifact.service';
import { IndexedDbRegistryService } from './indexed-db-registry.service';
import { IPFSService } from './ipfs.service';

export type GeoFileFormat = 'geojson' | 'kml' | 'kmz';

export interface GeoFileLink {
    idbKey?: string;
    fileId?: string;
    cid?: string;
    name: string;
    format: GeoFileFormat;
    sizeBytes: number;
    previewSizeBytes: number;
    noPreview?: boolean;
    automaticPoint?: [number, number] | [number, number, number];
}

interface GeoFileRecord {
    id: string;
    blob: Blob;
    originalName: string;
    originalSize: number;
    createdAt: number;
}

interface PendingGridFile {
    fileId: string;
    idbKey: string;
    record: GeoFileRecord;
    link: GeoFileLink;
}

@Injectable({ providedIn: 'root' })
export class GeoFilePersistenceService {
    private pendingGridFiles: PendingGridFile[] = [];
    private storesReady?: Promise<void>;

    constructor(
        private readonly artifacts: ArtifactService,
        private readonly ipfs: IPFSService,
        private readonly indexedDb: IndexedDbRegistryService
    ) {}

    public async keepOriginal(file: File, format: GeoFileFormat): Promise<GeoFileLink> {
        await this.ensureStores();
        const idbKey = crypto.randomUUID();
        const record: GeoFileRecord = {
            id: idbKey,
            blob: file,
            originalName: file.name,
            originalSize: file.size,
            createdAt: Date.now()
        };
        await this.indexedDb.put(DB_NAME.TABLES, STORES_NAME.FILES_STORE, record);
        return {
            idbKey,
            name: file.name,
            format,
            sizeBytes: file.size,
            previewSizeBytes: file.size
        };
    }

    public async discard(link?: GeoFileLink): Promise<void> {
        const key = link?.idbKey?.trim();
        if (!key) return;
        await this.ensureStores();
        await Promise.all([
            this.indexedDb.delete(DB_NAME.TABLES, STORES_NAME.FILES_STORE, key),
            this.indexedDb.delete(DB_NAME.TABLES, STORES_NAME.DRAFT_STORE, key)
        ]);
    }

    public async persistGeoFilesInDocument(
        root: unknown,
        isDryRun: boolean,
        draft = false
    ): Promise<void> {
        await this.ensureStores();
        this.pendingGridFiles = [];
        await this.visit(root, async link => {
            if (draft) {
                await this.copyToDraft(link.idbKey);
                return;
            }
            await this.persistLink(link, isDryRun);
        });
    }

    public async restoreGeoFilesFromDraft(root: unknown): Promise<void> {
        await this.ensureStores();
        await this.visit(root, async link => {
            const key = link.idbKey?.trim();
            if (!key) return;
            const record = await this.readRecord(STORES_NAME.DRAFT_STORE, key);
            if (record) {
                await this.indexedDb.put(
                    DB_NAME.TABLES,
                    STORES_NAME.FILES_STORE,
                    { ...record, id: key }
                );
            }
        });
    }

    public async rollbackGridFsUploads(): Promise<void> {
        const pending = this.pendingGridFiles;
        this.pendingGridFiles = [];
        for (const item of pending) {
            try {
                const record: GeoFileRecord = {
                    ...item.record,
                    id: item.idbKey
                };
                await Promise.all([
                    this.indexedDb.put(DB_NAME.TABLES, STORES_NAME.FILES_STORE, record),
                    this.indexedDb.put(DB_NAME.TABLES, STORES_NAME.DRAFT_STORE, record)
                ]);
                await firstValueFrom(this.artifacts.deleteFile(item.fileId));
                item.link.idbKey = item.idbKey;
                delete item.link.fileId;
                delete item.link.cid;
            } catch {}
        }
    }

    private ensureStores(): Promise<void> {
        if (!this.storesReady) {
            this.storesReady = this.indexedDb.registerStores(DB_NAME.TABLES, [
                { name: STORES_NAME.DRAFT_STORE, options: { keyPath: 'id' } },
                { name: STORES_NAME.FILES_STORE, options: { keyPath: 'id' } },
                { name: STORES_NAME.FILES_VIEW_STORE, options: { keyPath: 'id' } }
            ]);
        }
        return this.storesReady;
    }

    private async persistLink(link: GeoFileLink, isDryRun: boolean): Promise<void> {
        const key = link.idbKey?.trim();
        if (!key) return;
        const record = await this.readRecord(STORES_NAME.FILES_STORE, key);
        if (!record) return;
        const compress = link.format !== 'kmz';
        const file = new File(
            [compress ? await gzipBlob(record.blob) : record.blob],
            record.originalName,
            { type: compress ? 'application/gzip' : record.blob.type || 'application/octet-stream' }
        );
        const response = await firstValueFrom(this.artifacts.upsertFile(file));
        this.pendingGridFiles.push({ fileId: response.fileId, idbKey: key, record, link });
        const cid = isDryRun ? undefined : await this.uploadToIpfs(file);
        link.fileId = response.fileId;
        if (cid) link.cid = cid;
        else delete link.cid;
        delete link.idbKey;
        await Promise.all([
            this.indexedDb.delete(DB_NAME.TABLES, STORES_NAME.FILES_STORE, key),
            this.indexedDb.delete(DB_NAME.TABLES, STORES_NAME.DRAFT_STORE, key)
        ]);
    }

    private async uploadToIpfs(file: File): Promise<string | undefined> {
        const cid = await firstValueFrom(this.ipfs.addFileDirect(file));
        return typeof cid === 'string' && cid.trim() ? cid.trim() : undefined;
    }

    private async copyToDraft(idbKey?: string): Promise<void> {
        const key = idbKey?.trim();
        if (!key) return;
        const record = await this.readRecord(STORES_NAME.FILES_STORE, key);
        if (record) {
            await this.indexedDb.put(
                DB_NAME.TABLES,
                STORES_NAME.DRAFT_STORE,
                { ...record, id: key }
            );
        }
    }

    private async readRecord(store: string, key: string): Promise<GeoFileRecord | null> {
        try {
            const record = await this.indexedDb.get<GeoFileRecord>(DB_NAME.TABLES, store, key);
            return record?.blob ? record : null;
        } catch {
            return null;
        }
    }

    private async visit(
        root: unknown,
        action: (link: GeoFileLink) => Promise<void>
    ): Promise<void> {
        const seen = new Set<object>();
        const walk = async (value: unknown): Promise<void> => {
            if (!value || typeof value !== 'object') return;
            if (seen.has(value)) return;
            seen.add(value);
            if (Array.isArray(value)) {
                for (const item of value) await walk(item);
                return;
            }
            const record = value as Record<string, unknown>;
            if (this.isGeoFileLink(record.geoFile)) {
                await action(record.geoFile);
            }
            for (const child of Object.values(record)) await walk(child);
        };
        await walk(root);
    }

    private isGeoFileLink(value: unknown): value is GeoFileLink {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const link = value as Record<string, unknown>;
        return typeof link.name === 'string' &&
            (link.format === 'geojson' || link.format === 'kml' || link.format === 'kmz') &&
            typeof link.sizeBytes === 'number' &&
            typeof link.previewSizeBytes === 'number';
    }
}
