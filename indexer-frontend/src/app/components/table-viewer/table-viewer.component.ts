import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, NgZone, OnChanges, OnDestroy } from '@angular/core';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';

import { CsvService } from '@services/csv.service';
import { ArtifactsService } from '@services/artifacts.service';
import { TableDialogComponent } from '../../dialogs/table-dialog/table-dialog.component';

import { IndexedDbRegistryService } from '@services/indexed-db-registry.service';
import { GzipService } from '@services/gzip.service';

import {DB_NAME, STORES_NAME} from "../../constants";

@Component({
    selector: 'app-table-viewer',
    standalone: true,
    imports: [CommonModule, ButtonModule, DynamicDialogModule],
    templateUrl: './table-viewer.component.html',
    styleUrls: ['./table-viewer.component.scss'],
    providers: [DialogService]
})

export class TableViewerComponent implements OnChanges, OnDestroy {
    @Input() public value: any;
    @Input() public title?: string;
    @Input() public analytics?: any;
    @Input() delimiter: string = ',';

    public isLoading = false;
    public isDownloading = false;
    public loadError?: string;

    public tooLargeMessage?: string;
    public canOpenPreview = false;

    public previewColumnDefs: ColDef[] = [];
    public previewRowData: Record<string, string>[] = [];

    private readonly PREVIEW_LIMIT = 10 * 1024 * 1024;

    private storesReady?: Promise<void>;
    private idbQueue: Promise<void> = Promise.resolve();
    private putInflight = new Map<string, Promise<void>>();

    constructor(
        private readonly dialog: DialogService,
        private readonly csv: CsvService,
        private readonly artifacts: ArtifactsService,
        private readonly cdr: ChangeDetectorRef,
        private readonly zone: NgZone,
        private readonly idb: IndexedDbRegistryService,
        private readonly gzip: GzipService
    ) {}

    public get fileId(): string | null {
        return this.getFileIdFromValue(this.value, this.analytics?.tableFiles);
    }

    public get hasData(): boolean {
        return !!this.fileId;
    }

    public get previewHeaderKeysLimited(): string[] {
        const keys = (this.previewColumnDefs || [])
            .map(def => String(def.field || '').trim())
            .filter(Boolean);

        return keys.slice(0, 8);
    }

    public get previewRowsLimited(): Record<string, string>[] {
        const sourceRows = this.previewRowData || [];
        const limitedRows = sourceRows.slice(0, 4);
        const headerKeys = this.previewHeaderKeysLimited;

        return limitedRows.map(row => {
            const normalized: Record<string, string> = {};
            for (const key of headerKeys) {
                normalized[key] = String((row as any)?.[key] ?? '');
            }
            return normalized;
        });
    }

    public buildColumnHeader(index: number): string {
        let currentIndex = index;
        let label = '';

        for (;;) {
            label = String.fromCharCode((currentIndex % 26) + 65) + label;
            currentIndex = Math.floor(currentIndex / 26) - 1;

            if (currentIndex < 0) {
                break;
            }
        }

        return label;
    }

    ngOnChanges(): void {
        (async () => {
            await this.ensureIdbStores();
            await this.initPreview();
        })().catch(() => {
            //
        });
    }

    async ngOnDestroy(): Promise<void> {
        await this.idb.clearStore(DB_NAME.TABLES, STORES_NAME.FILES_VIEW_STORE);
    }

    public openDialog(): void {
        const id = this.fileId;
        if (!id || this.isLoading) { return; }

        this.isLoading = true;
        this.loadError = undefined;
        this.mark();

        (async () => {
            let cached = await this.getFromIdb(id);
            if (!cached) {
                const resp = await firstValueFrom(this.artifacts.getFileBlob(id));
                const gz: Blob | undefined = resp.body ?? undefined;
                if (!gz) {
                    throw new Error('No blob');
                }
                await this.putToIdb(id, gz);
                cached = await this.getFromIdb(id);
            }

            if (!cached) {
                throw new Error('No cached file');
            }

            const csvText = await this.gzip.gunzipToText(cached.gz);
            const unzippedBytes = this.utf8Size(csvText);

            if (unzippedBytes > this.PREVIEW_LIMIT) {
                const mb = (unzippedBytes / (1024 * 1024)).toFixed(1);
                this.zone.run(() => {
                    this.loadError = `File is too large for preview (${mb} MB). Use "Download CSV" instead.`;
                    this.mark();
                });
                return;
            }

            let parsed: { columnKeys: string[]; rows: any[] };
            parsed = this.csv.parseCsvToTable(csvText, ',');

            const columnDefs: ColDef[] = parsed.columnKeys.map((key: string, i: number) => ({
                field: key,
                colId: key,
                headerName: this.excelHeader(i),
                editable: false,
                minWidth: 100,
                resizable: true
            }));

            this.dialog.open(TableDialogComponent, {
                header: 'View table',
                width: '70vw',
                data: { columnDefs, rowData: parsed.rows, readonly: true }
            });
        })()
            .catch((e: any) => {
                this.zone.run(() => {
                    this.loadError = e?.message || 'Failed to open table';
                    this.mark();
                });
            })
            .finally(() => this.stop('isLoading'));
    }

    public downloadCsv(): void {
        const fileId = this.fileId;

        if (!fileId || this.isDownloading) {
            return;
        }

        this.isDownloading = true;
        this.mark();

        (async () => {
            let cached = await this.getFromIdb(fileId);

            if (!cached) {
                const blobResponse = await firstValueFrom(this.artifacts.getFileBlob(fileId));
                const gzBlob: Blob | undefined =
                    blobResponse instanceof Blob ? blobResponse : (blobResponse as any)?.body;

                if (!gzBlob) {
                    throw new Error('No blob');
                }

                await this.putToIdb(fileId, gzBlob);
                cached = await this.getFromIdb(fileId);
            }

            if (!cached) {
                throw new Error('No cached file');
            }

            const csvText = await this.gzip.gunzipToText(cached.gz);

            const outBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
            const objectUrl = URL.createObjectURL(outBlob);

            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `${fileId}.csv`.replace(/"/g, '');

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(objectUrl);
        })()
            .catch((error: any) => {
                this.zone.run(() => {
                    this.loadError = error?.message || 'Failed to download CSV';
                    this.mark();
                });
            })
            .finally(() => this.stop('isDownloading'));
    }

    private makePreview(
        columnKeys: string[],
        rows: Record<string, string>[],
        maxColumns: number,
        maxRows: number
    ): { columns: string[]; rows: Record<string, string>[] } {
        const limitedColumns = columnKeys.slice(0, Math.min(maxColumns, columnKeys.length));

        const limitedRows = rows
            .slice(0, Math.min(maxRows, rows.length))
            .map(source => {
                const out: Record<string, string> = {};
                for (const key of limitedColumns) {
                    out[key] = source[key] ?? '';
                }
                return out;
            });

        return {
            columns: limitedColumns,
            rows: limitedRows
        };
    }

    private async initPreview(): Promise<void> {
        const fileId = this.fileId;

        this.tooLargeMessage = undefined;
        this.loadError = undefined;
        this.canOpenPreview = false;
        this.previewColumnDefs = [];
        this.previewRowData = [];
        this.mark();

        if (!fileId) {
            return;
        }

        try {
            let cached = await this.getFromIdb(fileId);
            if (!cached) {
                const resp = await firstValueFrom(this.artifacts.getFileBlob(fileId));
                const gz: Blob | undefined =
                    resp instanceof Blob ? resp : (resp as any)?.body;

                if (!gz) {
                    throw new Error('No blob');
                }

                await this.putToIdb(fileId, gz);
                cached = await this.getFromIdb(fileId);
            }

            if (!cached) {
                throw new Error('No cached file');
            }

            const csvText = await this.gzip.gunzipToText(cached.gz);
            const unzippedBytes = this.utf8Size(csvText);

            if (unzippedBytes > this.PREVIEW_LIMIT) {
                const megabytes = (unzippedBytes / (1024 * 1024)).toFixed(1);
                this.tooLargeMessage = `File is too large for preview (${megabytes} MB). Use "Download CSV".`;
                this.canOpenPreview = false;
            } else {
                this.canOpenPreview = true;
            }

            const parsed = this.csv.parseCsvToTable(csvText, ',');

            const preview = this.makePreview(parsed.columnKeys, parsed.rows, 8, 4);

            this.previewColumnDefs = preview.columns.map((key: string, index: number) => ({
                field: key,
                headerName: this.buildColumnHeader(index),
                editable: false,
                minWidth: 100,
                resizable: true
            }));

            this.previewRowData = preview.rows;
            this.mark();
        } catch (error: any) {
            this.loadError = error?.message ?? 'Failed to prepare preview';
            this.previewColumnDefs = [];
            this.previewRowData = [];
            this.mark();
        }
    }

    private ensureIdbStores(): Promise<void> {
        if (!this.storesReady) {
            this.storesReady = this.idb.registerStores(
                DB_NAME.TABLES,
                [
                    { name: STORES_NAME.DRAFT_STORE, options: { keyPath: 'id' } },
                    { name: STORES_NAME.FILES_STORE, options: { keyPath: 'id' } },
                    { name: STORES_NAME.FILES_VIEW_STORE, options: { keyPath: 'id' } },
                ]
            );
        }
        return this.storesReady;
    }

    private wait(ms: number): Promise<void> {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }

    private isIdbClosingError(err: unknown): boolean {
        const anyErr = err as any;

        const name: string =
            (typeof anyErr?.name === 'string' && anyErr.name) ||
            (typeof anyErr?.target?.error?.name === 'string' && anyErr.target.error.name) ||
            '';

        const code: number | undefined =
            typeof anyErr?.code === 'number'
                ? anyErr.code
                : typeof anyErr?.target?.error?.code === 'number'
                    ? anyErr.target.error.code
                    : undefined;

        const isDomException =
            (typeof DOMException !== 'undefined' && err instanceof DOMException) ||
            (typeof anyErr?.constructor?.name === 'string' && anyErr.constructor.name === 'DOMException');

        const isTransient =
            name === 'InvalidStateError' ||
            name === 'TransactionInactiveError' ||
            name === 'AbortError' ||
            name === 'VersionError';

        const isLegacyInvalidState = code === 11;

        return isDomException && (isTransient || isLegacyInvalidState);
    }

    private async withIdbRetry<T>(fn: () => Promise<T>, attempts: number = 3): Promise<T> {
        for (let i = 0; i < attempts; i += 1) {
            try {
                return await this.queueIdb(fn);
            } catch (e) {
                if (this.isIdbClosingError(e) && i < attempts - 1) {
                    await this.wait(30);
                    continue;
                }
                throw e;
            }
        }
        throw new Error('withIdbRetry exhausted retries');
    }

    private queueIdb<T>(op: () => Promise<T>): Promise<T> {
        const run = this.idbQueue.then(() => op());
        this.idbQueue = run.then(
            () => undefined,
            () => undefined
        );
        return run;
    }

    private async putToIdb(fileId: string, gzBlobFromGridFs: Blob): Promise<void> {
        const existing = this.putInflight.get(fileId);
        if (existing) {
            await existing;
            return;
        }

        const task = (async () => {
            const head = new Uint8Array(await gzBlobFromGridFs.slice(0, 2).arrayBuffer());
            const isGzip = head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b;
            if (!isGzip) {
                throw new Error('Expected gz blob from GridFS');
            }

            await this.withIdbRetry(() =>
                this.idb.put(DB_NAME.TABLES, STORES_NAME.FILES_VIEW_STORE, {
                    id: fileId,
                    blob: gzBlobFromGridFs,
                    originalName: `${fileId}.csv.gz`,
                    originalSize: undefined,
                    gzSize: gzBlobFromGridFs.size,
                    delimiter: this.delimiter,
                    createdAt: Date.now()
                })
            );
        })();

        this.putInflight.set(fileId, task);
        try {
            await task;
        } finally {
            this.putInflight.delete(fileId);
        }
    }

    private async getFromIdb(fileId: string): Promise<{ gz: Blob } | null> {
        const record: any = await this.withIdbRetry(() =>
            this.idb.get(DB_NAME.TABLES, STORES_NAME.FILES_VIEW_STORE, fileId)
        );

        const blob: Blob | undefined = record?.blob;
        if (!(blob instanceof Blob)) {
            return null;
        }

        return { gz: blob };
    }

    private stop(flag: 'isLoading' | 'isDownloading'): void {
        this.zone.run(() => {
            (this as any)[flag] = false;
            this.mark();
        });
    }

    private mark(): void {
        this.cdr.markForCheck();
    }

    private getFileIdFromValue(
        value: unknown,
        tableFiles?: Record<string, string>
    ): string | null {
        if (!tableFiles) {
            return null;
        }

        if (value === null) {
            return null;
        }

        if (typeof value === 'string') {
            const s = value.trim();
            if (s.startsWith('{') || s.startsWith('[')) {
                try {
                    return this.getFileIdFromValue(JSON.parse(s), tableFiles);
                } catch {
                    return null;
                }
            }

            return null;
        }

        if (typeof value === 'object') {
            const obj = value as { type?: unknown; cid?: unknown };

            const type =
                typeof obj.type === 'string' ? obj.type.toLowerCase() : '';
            if (type !== 'table') {
                return null;
            }

            const cid =
                typeof obj.cid === 'string' ? obj.cid.trim() : '';
            if (!cid) {
                return null;
            }

            return tableFiles[cid] ?? null;
        }

        return null;
    }

    private excelHeader(index: number): string {
        let n = index;
        let label = '';
        for (;;) {
            label = String.fromCharCode((n % 26) + 65) + label;
            n = Math.floor(n / 26) - 1;
            if (n < 0) {
                break;
            }
        }
        return label;
    }

    private utf8Size(text: string): number {
        return new TextEncoder().encode(text).length;
    }
}
