import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ArtifactService } from './artifact.service';
import { IPFSService } from './ipfs.service';
import { IndexedDbRegistryService } from './indexed-db-registry.service';
import { ITableField } from '@guardian/interfaces';
import { GzipService } from './gzip.service';

import {DB_NAME, STORES_NAME} from "../constants";

@Injectable({ providedIn: 'root' })
export class TablePersistenceService {
    private draftMode = false;
    private pendingIpfsCids = new Set<string>();
    private pendingGridFsFiles: { fileId: string; idbKey: string }[] = [];

    constructor(
        private artifactService: ArtifactService,
        private ipfsService: IPFSService,
        private indexedDb: IndexedDbRegistryService,
        private gzip: GzipService
    ) {}

    public async persistTablesInDocument(root: unknown, isDryRun: boolean, policyId: string = '', blockId: string = '', draft: boolean = false): Promise<void> {
        this.draftMode = draft;
        this.pendingIpfsCids.clear();
        this.pendingGridFsFiles = [];
        await this.visitNode(root, isDryRun);
    }

    private async copyToDraftStore(idbKey: string): Promise<boolean> {
        const key = (idbKey || '').trim();
        if (!key) {
           return false;
        }

        try {
            const rec: any = await this.indexedDb.get(DB_NAME.TABLES, STORES_NAME.FILES_STORE, key);
            if (!rec) {
                return false;
            }

            await this.indexedDb.put(DB_NAME.TABLES, STORES_NAME.DRAFT_STORE, { ...rec, id: key });
            return true;
        } catch {
            return false;
        }
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

        const idbKey = parsed.idbKey?.trim();
        const existingFileId = parsed.fileId?.trim();
        const existingCid = parsed.cid?.trim();

        if (this.draftMode) {
            if (idbKey) {
                await this.copyToDraftStore(idbKey);
            }

            return input;
        }

        let fileFromIndexedDb: File | null = null;
        if (idbKey) {
            fileFromIndexedDb = await this.readFileFromIndexedDb(idbKey);
        }

        if (fileFromIndexedDb) {
            const fileId = await this.uploadToGridFs(fileFromIndexedDb, idbKey ?? "", existingFileId);
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
            await this.indexedDb.delete(DB_NAME.TABLES, STORES_NAME.DRAFT_STORE, normalized);
        } catch {}
    }

    private async uploadToGridFs(file: File, idbKey: string, existingFileId?: string): Promise<string> {
        const response = await firstValueFrom(this.artifactService.upsertFile(file, existingFileId));

        const fileId = response.fileId;

        this.pendingGridFsFiles.push({
            fileId,
            idbKey,
        });

        return fileId;
    }

    private async uploadToIpfs(file: File, isDryRun: boolean): Promise<string | null> {
        if (isDryRun) {
            return null;
        }

        const cid = await firstValueFrom(this.ipfsService.addFileDirect(file));

        if (typeof cid === 'string' && cid.trim()) {
            const normalizedCid = cid.trim();

            this.pendingIpfsCids.add(normalizedCid);

            return normalizedCid;
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

    public async restoreTablesFromDraft(node: unknown): Promise<void> {
        if (Array.isArray(node)) {
            for (let index = 0; index < node.length; index += 1) {
                const element = node[index];

                if (typeof element === 'string') {
                    const tableField = this.tryParseTable(element);

                    if (tableField?.idbKey) {
                        await this.restoreOneFromDraft(tableField.idbKey);
                    }
                } else {
                    await this.restoreTablesFromDraft(element);
                }
            }

            return;
        }

        if (node && typeof node === 'object') {
            const objectNode = node as Record<string, unknown>;
            const objectKeys = Object.keys(objectNode);

            for (const objectKey of objectKeys) {
                const objectValue = objectNode[objectKey];

                if (typeof objectValue === 'string') {
                    const tableField = this.tryParseTable(objectValue);

                    if (tableField?.idbKey) {
                        await this.restoreOneFromDraft(tableField.idbKey);
                    }
                } else {
                    await this.restoreTablesFromDraft(objectValue);
                }
            }
        }
    }

    private async restoreOneFromDraft(idbKey: string): Promise<boolean> {
        const normalizedKey = (idbKey || '').trim();

        if (!normalizedKey) {
            return false;
        }

        try {
            const draftRecord: any = await this.indexedDb.get(
                DB_NAME.TABLES,
                STORES_NAME.DRAFT_STORE,
                normalizedKey
            );

            if (!draftRecord) {
                return false;
            }

            await this.indexedDb.put(
                DB_NAME.TABLES,
                STORES_NAME.FILES_STORE,
                { ...draftRecord, id: normalizedKey }
            );

            return true;
        } catch {
            return false;
        }
    }

    public async rollbackIpfsUploads(): Promise<void> {
        const cids = Array.from(this.pendingIpfsCids);
        this.pendingIpfsCids.clear();

        for (const cid of cids) {
            try {
                await firstValueFrom(this.ipfsService.deleteCid(cid));
            } catch {}
        }

        const gridFiles = [...this.pendingGridFsFiles];
        this.pendingGridFsFiles = [];

        for (const { fileId, idbKey } of gridFiles) {
            try {
                const blob = await firstValueFrom(this.artifactService.getFileBlob(fileId));

                const csvText = await this.gzip.gunzipToText(blob);
                const originalSize = new Blob([csvText]).size;

                const record = {
                    id: idbKey,
                    originalName: `${fileId}.csv.gz`,
                    originalSize,
                    gzSize: blob.size,
                    delimiter: ',',
                    createdAt: Date.now(),
                    blob
                };

                await Promise.all([
                    this.saveToIndexedDb(DB_NAME.TABLES, STORES_NAME.FILES_STORE, record),
                    this.saveToIndexedDb(DB_NAME.TABLES, STORES_NAME.DRAFT_STORE, record)
                ]);

                await firstValueFrom(this.artifactService.deleteFile(fileId));
            } catch {}
        }
    }

    public async saveToIndexedDb(
        dbName: string,
        storeName: string,
        record: {
            id: string,
            originalName: string;
            originalSize: number;
            gzSize: number;
            delimiter: string;
            createdAt: number;
            blob: Blob;
        }
    ): Promise<boolean> {
        try {
            await this.indexedDb.put(dbName, storeName, record);
            return true;
        } catch {
            return false;
        }
    }
}
