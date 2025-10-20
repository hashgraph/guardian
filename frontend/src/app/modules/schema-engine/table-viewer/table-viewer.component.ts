import { ChangeDetectorRef, Component, Input, NgZone, OnChanges, OnDestroy } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { ArtifactService } from 'src/app/services/artifact.service';
import { CsvService } from 'src/app/services/csv.service';
import { TableDialogComponent } from '../../common/table-dialog/table-dialog.component';
import { firstValueFrom } from 'rxjs';
import { IndexedDbRegistryService } from '../../../services/indexed-db-registry.service';
import { GzipService } from '../../../services/gzip.service';
import { DB_NAME, STORES_NAME } from '../../../constants';

type TableRefLike = { type?: string; fileId?: string } | string | null | undefined;

@Component({
    selector: 'table-viewer',
    templateUrl: './table-viewer.component.html',
    styleUrls: ['./table-viewer.component.scss'],
    providers: [DialogService]
})

export class TableViewerComponent implements OnChanges, OnDestroy {
    @Input()
    public value: TableRefLike;

    @Input()
    public title?: string;
    @Input() delimiter: string = ',';

    public isLoading: boolean = false;
    public isDownloading = false;
    public loadError?: string;

    public previewColumnDefs: ColDef[] = [];
    public previewRowData: any[] = [];
    public canOpenPreview = false;
    public tooLargeMessage?: string;

    private readonly PREVIEW_LIMIT = 10 * 1024 * 1024;
    private readonly PREVIEW_COLUMNS_LIMIT = 8;
    private readonly PREVIEW_ROWS_LIMIT = 4;

    constructor(
        private readonly dialog: DialogService,
        private readonly artifactService: ArtifactService,
        private readonly csvService: CsvService,
        private readonly cdr: ChangeDetectorRef,
        private readonly zone: NgZone,
        private readonly idb: IndexedDbRegistryService,
        private readonly gzip: GzipService
    ) {}

    public get fileId(): string | null {
        return this.getFileIdFromValue(this.value);
    }

    public get hasData(): boolean {
        return !!this.fileId;
    }

    public get previewHeaderKeysLimited(): string[] {
        const fields = (this.previewColumnDefs || [])
            .map(def => String(def.field || '').trim())
            .filter(Boolean);
        return fields.slice(0, this.PREVIEW_COLUMNS_LIMIT);
    }

    public get previewRowsLimited(): Record<string, string>[] {
        const rows = this.previewRowData || [];
        const limitedRows = rows.slice(0, this.PREVIEW_ROWS_LIMIT);
        const keys = this.previewHeaderKeysLimited;
        return limitedRows.map(row => {
            const normalized: Record<string, string> = {};
            for (const key of keys) {
                normalized[key] = String((row as any)?.[key] ?? '');
            }
            return normalized;
        });
    }

    private wait(ms: number) {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }

    private isIdbClosingError(err: unknown): boolean {
        const asAny = err as any;

        const name: string =
            (typeof asAny?.name === 'string' && asAny.name) ||
            (typeof asAny?.target?.error?.name === 'string' && asAny.target.error.name) ||
            '';

        const code: number | undefined =
            typeof asAny?.code === 'number'
                ? asAny.code
                : typeof asAny?.target?.error?.code === 'number'
                    ? asAny.target.error.code
                    : undefined;

        const isDomException =
            (typeof DOMException !== 'undefined' && err instanceof DOMException) ||
            (typeof asAny?.constructor?.name === 'string' && asAny.constructor.name === 'DOMException');

        const isTransient =
            name === 'InvalidStateError' ||
            name === 'TransactionInactiveError' ||
            name === 'AbortError';

        const isLegacyInvalidState = code === 11;

        return isDomException && (isTransient || isLegacyInvalidState);
    }

    private async withIdbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
        for (let i = 0; i < attempts; i += 1) {
            try {
                return await this.queueIdb(fn);
            } catch (e) {
                if (this.isIdbClosingError(e) && i < attempts - 1) {
                    this.storesReady = undefined;
                    await this.wait(30);
                    continue;
                }
                throw e;
            }
        }
        throw new Error('withIdbRetry exhausted retries');
    }

    private idbQueue: Promise<void> = Promise.resolve();

    private queueIdb<T>(op: () => Promise<T>): Promise<T> {
        const run = this.idbQueue.then(() => op());
        this.idbQueue = run.then(
            () => undefined,
            () => undefined
        );
        return run;
    }

    private putInflight = new Map<string, Promise<void>>();

    private storesReady?: Promise<void>;

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

    private async isGzip(blob: Blob): Promise<boolean> {
        const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
        return head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b;
    }

    private async putToIdb(fileId: string, gzBlobFromGridFs: Blob): Promise<void> {
        const existing = this.putInflight.get(fileId);
        if (existing) {
            await existing;
            return;
        }

        const task = (async () => {
            if (!(await this.isGzip(gzBlobFromGridFs))) {
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
                    createdAt: Date.now(),
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

        if (!record) {
            return null;
        }

        const blob: Blob | undefined = record.blob;
        if (!(blob instanceof Blob)) {
            return null;
        }

        return { gz: blob };
    }

    private makePreview(
        columnKeys: string[],
        rows: Record<string, string>[],
        maxColumns: number = 10,
        maxRows: number = 10
    ): { columns: string[]; rows: Record<string, string>[] } {
        const limitedColumns: string[] = columnKeys.slice(
            0,
            Math.min(maxColumns, columnKeys.length)
        );

        const limitedRows: Record<string, string>[] = rows
            .slice(0, Math.min(maxRows, rows.length))
            .map((sourceRow) => {
                const previewRow: Record<string, string> = {};

                for (const key of limitedColumns) {
                    previewRow[key] = sourceRow[key] ?? '';
                }

                return previewRow;
            });

        return {
            columns: limitedColumns,
            rows: limitedRows
        };
    }

    public buildColumnHeader(index: number): string {
        let current = index;
        let label = '';

        while (true) {
            const code = (current % 26) + 65;
            label = String.fromCharCode(code) + label;
            current = Math.floor(current / 26) - 1;

            if (current < 0) {
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

    private handlePreviewLimit(byteLength: number): boolean {
        if (byteLength <= this.PREVIEW_LIMIT) {
            return true;
        }

        const mb = (byteLength / (1024 * 1024)).toFixed(1);
        this.tooLargeMessage = `File is too large for preview (${mb} MB). Use "Download CSV".`;
        this.canOpenPreview = false;
        this.mark();
        return false;
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
                const resp = await firstValueFrom(this.artifactService.getFileBlob(fileId));
                const gz: Blob | undefined = resp instanceof Blob ? resp : (resp as any)?.body;
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

            const byteLength = new TextEncoder().encode(csvText).length;
            if (byteLength > this.PREVIEW_LIMIT) {
                const mb = (byteLength / (1024 * 1024)).toFixed(1);
                this.tooLargeMessage = `File is too large for preview (${mb} MB). Use "Download CSV".`;
                this.canOpenPreview = false;
            } else {
                this.tooLargeMessage = undefined;
                this.canOpenPreview = true;
            }

            const parsed = this.csvService.parseCsvToTable(csvText, ',');

            const preview = this.makePreview(
                parsed.columnKeys,
                parsed.rows,
                this.PREVIEW_COLUMNS_LIMIT,
                this.PREVIEW_ROWS_LIMIT
            );

            this.previewColumnDefs = preview.columns.map((key: string, index: number) => ({
                field: key,
                headerName: this.buildColumnHeader(index),
                editable: false,
                minWidth: 100,
                resizable: true,
            }));

            this.previewRowData = preview.rows;

            this.mark();
        } catch (error: any) {
            this.loadError = error?.message ?? 'Failed to prepare preview';
            this.mark();
        }
    }

    private utf8Size(text: string): number {
        return new TextEncoder().encode(text).length;
    }

    public async openDialog(): Promise<void> {
        const fileId = this.fileId;
        if (!fileId || this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.loadError = undefined;
        this.mark();

        try {
            let cached = await this.getFromIdb(fileId);

            if (!cached) {
                const resp = await firstValueFrom(this.artifactService.getFileBlob(fileId));
                const gzBlob: Blob | undefined = resp instanceof Blob ? resp : (resp as any)?.body;
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

            const unzippedBytes = this.utf8Size(csvText);

            if (!this.handlePreviewLimit(unzippedBytes)) {
                return
            }

            const parsed = this.csvService.parseCsvToTable(csvText, ',');
            const columnDefs: ColDef[] = parsed.columnKeys.map((key: string, index: number) => ({
                field: key,
                colId: key,
                headerName: this.buildColumnHeader(index),
                editable: false,
                minWidth: 100,
                resizable: true,
            }));

            this.dialog.open(TableDialogComponent, {
                header: 'View table',
                width: '70vw',
                data: { columnDefs, rowData: parsed.rows, readOnly: true },
            });
        } catch (error: any) {
            this.zone.run(() => {
                this.loadError = error?.message ?? 'Failed to open table';
                this.mark();
            });
        } finally {
            this.stop('isLoading');
        }
    }

    private mark(): void {
        this.cdr.markForCheck();
    }

    private stop(flag: 'isLoading' | 'isDownloading'): void {
        this.zone.run(() => {
            (this as any)[flag] = false;
            this.mark();
        });
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
                const blobResponse = await firstValueFrom(this.artifactService.getFileBlob(fileId));
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

    private getFileIdFromValue(input: TableRefLike): string | null {
        if (!input) {
            return null;
        }

        if (typeof input === 'string') {
            const trimmed = input.trim();

            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return this.getFileIdFromValue(parsed);
                } catch {
                    return null;
                }
            }

            return null;
        }

        if (typeof input === 'object') {
            const obj = input as Record<string, unknown>;

            const isTableType =
                typeof obj.type === 'string' &&
                obj.type.toLowerCase() === 'table';

            const hasFileId =
                typeof obj.fileId === 'string' &&
                obj.fileId.trim().length > 0;

            if (isTableType && hasFileId) {
                const id = (obj.fileId as string).trim();
                return id || null;
            }
        }

        return null;
    }
}
