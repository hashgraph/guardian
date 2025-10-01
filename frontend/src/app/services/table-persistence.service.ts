import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ArtifactService } from './artifact.service';
import { IPFSService } from './ipfs.service';
import { IndexedDbRegistryService } from './indexed-db-registry.service';
import { ITableField } from '@guardian/interfaces';
import {DB_NAME, STORES_NAME} from "../constants";

@Injectable({ providedIn: 'root' })
export class TablePersistenceService {
    constructor(
        private artifactService: ArtifactService,
        private ipfsService: IPFSService,
        private indexedDb: IndexedDbRegistryService
    ) {}

    public async persistTablesInDocument(root: unknown, isDryRun: boolean): Promise<void> {
        await this.visitNode(root, isDryRun);
    }

    private async visitNode(node: unknown, isDryRun: boolean): Promise<void> {
        if (Array.isArray(node)) {
            for (let index = 0; index < node.length; index += 1) {
                const element = node[index];
                if (typeof element === 'string') {
                    node[index] = await this.processTableString(element, isDryRun);
                } else {
                    await this.visitNode(element, isDryRun);
                }
            }
            return;
        }

        if (node && typeof node === 'object') {
            const object = node as Record<string, unknown>;
            const keys = Object.keys(object);
            for (const key of keys) {
                const value = object[key];
                if (typeof value === 'string') {
                    object[key] = await this.processTableString(value, isDryRun);
                } else {
                    await this.visitNode(value, isDryRun);
                }
            }
        }
    }

    private async processTableString(input: string, isDryRun: boolean): Promise<string> {
        const parsed = this.tryParseTable(input);
        if (!parsed) {
            return input;
        }

        const idbKey = (parsed.idbKey || '').trim();
        const existingFileId = (parsed.fileId || '').trim();
        const existingCid = (parsed.cid || '').trim();

        const hasFilesStore = await this.hasFilesStore();
        let fileFromIndexedDb: File | null = null;

        if (hasFilesStore && idbKey) {
            fileFromIndexedDb = await this.readFileFromIndexedDb(idbKey);
        }

        if (fileFromIndexedDb) {
            const fileId = await this.uploadToGridFs(fileFromIndexedDb, existingFileId || undefined);
            const cid = await this.uploadToIpfs(fileFromIndexedDb, isDryRun);
            await this.deleteFromIndexedDb(idbKey);
            return this.buildCompactTableJson(fileId, cid);
        }

        return this.buildCompactTableJson(existingFileId || null, existingCid || null);
    }

    private tryParseTable(value: unknown): ITableField | null {
        if (typeof value !== 'string') {
            return null;
        }

        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
            return null;
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && parsed.type === 'table') {
                return parsed as ITableField;
            }
            return null;
        } catch {
            return null;
        }
    }

    private async hasFilesStore(): Promise<boolean> {
        try {
            const db = await this.indexedDb.getDB(DB_NAME.TABLES);
            const contains = db.objectStoreNames.contains(STORES_NAME.FILES_STORE);
            db.close();
            return contains;
        } catch {
            return false;
        }
    }

    private async readFileFromIndexedDb(key: string): Promise<File | null> {
        try {
            const record: any = await this.indexedDb.get(DB_NAME.TABLES, STORES_NAME.FILES_STORE, key);
            if (!record || !record.blob) {
                return null;
            }

            const blob: Blob = record.blob as Blob;
            const fileName = typeof record.originalName === 'string' && record.originalName ? record.originalName : 'table.csv.gz';
            const mimeType = (blob as any)?.type && String((blob as any).type).trim() ? String((blob as any).type).trim() : 'application/gzip';

            return new File([blob], fileName, { type: mimeType });
        } catch {
            return null;
        }
    }

    private async deleteFromIndexedDb(key?: string): Promise<void> {
        const normalized = (key || '').trim();
        if (!normalized) {
            return;
        }

        try {
            await this.indexedDb.delete(DB_NAME.TABLES, STORES_NAME.FILES_STORE, normalized);
        } catch {}
    }

    private async uploadToGridFs(file: File, existingFileId?: string): Promise<string> {
        const response = await firstValueFrom(this.artifactService.upsertFile(file, existingFileId));
        return response.fileId;
    }

    private async uploadToIpfs(file: File, isDryRun: boolean): Promise<string | null> {
        if (isDryRun) {
            return null;
        }

        const cid = await firstValueFrom(this.ipfsService.addFileDirect(file));
        if (typeof cid === 'string' && cid.trim()) {
            return cid.trim();
        }

        return null;
    }

    private buildCompactTableJson(fileId?: string | null, cid?: string | null): string {
        const compact: any = { type: 'table' };

        if (fileId && fileId.trim()) {
            compact.fileId = fileId.trim();
        }

        if (cid && cid.trim()) {
            compact.cid = cid.trim();
        }

        return JSON.stringify(compact);
    }
}
