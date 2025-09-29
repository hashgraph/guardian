import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { IFieldControl } from '../schema-form-model/field-form';
import { CsvService } from '../../../services/csv.service';
import {TableDialogComponent} from '../../common/table-dialog/table-dialog.component';
import {ArtifactService} from '../../../services/artifact.service';
import {IndexedDbRegistryService} from '../../../services/indexed-db-registry.service';
import { GzipService } from '../../../services/gzip.service';

type TableValue = {
    type: string;
    columnKeys: string[];
    rows: Record<string, string>[];
    fileId?: string;
    cid?: string;
    sizeBytes?: number;
    idbKey?: string;
};

@Component({
    selector: 'table-field',
    templateUrl: './table-field.component.html',
    styleUrls: ['./table-field.component.scss'],
    providers: [DialogService],
})
export class TableFieldComponent implements OnInit, OnChanges {
    @Input() item!: IFieldControl<any>;
    @Input() readonly: boolean = false;

    private hydrated = false;
    public previewError?: string;
    public isImporting = false;
    public importError?: string;

    private readonly MAX_PREVIEW_BYTES = 10 * 1024 * 1024;

    private readonly PREVIEW_COLUMNS_LIMIT = 8;
    private readonly PREVIEW_ROWS_LIMIT = 4;

    private readonly IDB_NAME = 'TABLES';
    private readonly FILES_STORE = 'FILES';

    constructor(
        private dialog: DialogService,
        private csvService: CsvService,
        private artifactService: ArtifactService,
        private idb: IndexedDbRegistryService,
        private gzip: GzipService
    ) {}

    private storesReady?: Promise<void>;

    get hasData(): boolean {
        const value = this.readTable();
        const hasColumns = (value.columnKeys?.length || 0) > 0;
        const hasRows = (value.rows?.length || 0) > 0;
        const hasFileBack = !!(value.idbKey || value.fileId);
        return hasColumns || hasRows || hasFileBack;
    }

    get previewHeaderKeysLimited(): string[] {
        const value = this.readTable();
        const keys = value.columnKeys || [];
        return keys.slice(0, this.PREVIEW_COLUMNS_LIMIT);
    }

    get previewRowsLimited(): Record<string, string>[] {
        const value = this.readTable();
        const rows = value.rows || [];
        const limited = rows.slice(0, this.PREVIEW_ROWS_LIMIT);
        const keys = this.previewHeaderKeysLimited;

        return limited.map(row => {
            const normalized: Record<string, string> = {};
            for (const key of keys) {
                normalized[key] = row[key] ?? '';
            }
            return normalized;
        });
    }

    get isTooLargeForPreview(): boolean {
        const v = this.readTable();
        const hasBackedFile = !!((v.idbKey || '').trim() || (v.fileId || '').trim());
        const size = typeof v.sizeBytes === 'number' ? v.sizeBytes : 0;
        return hasBackedFile && size > this.MAX_PREVIEW_BYTES;
    }

    private setPreviewLimitMessage(): void {
        this.previewError = this.isTooLargeForPreview
            ? 'File is too large for preview (>10 MB). You can still download it.'
            : undefined;
    }

    private ensureIdbStores(): Promise<void> {
        if (!this.storesReady) {
            this.storesReady = this.idb.registerStore(
                this.IDB_NAME,
                { name: this.FILES_STORE, options: { keyPath: 'id' } }
            );
        }
        return this.storesReady;
    }

    private getDefaultTable(): TableValue {
        return { type: 'table', columnKeys: [], rows: [] };
    }

    private readTable(): TableValue {
        const rawValue = this.item?.control?.value;
        if (typeof rawValue === 'string' && rawValue) {
            try {
                return JSON.parse(rawValue);
            } catch {
                return this.getDefaultTable();
            }
        }
        return this.getDefaultTable();
    }

    private writeTable(next: Partial<TableValue>, opts?: { emitEvent?: boolean; markDirty?: boolean }): void {
        const current = this.readTable();

        const merged: TableValue = {
            type: 'table',

            columnKeys: (Object.prototype.hasOwnProperty.call(next, 'columnKeys'))
                ? (next.columnKeys as string[])
                : current.columnKeys,

            rows: (Object.prototype.hasOwnProperty.call(next, 'rows'))
                ? (next.rows as Record<string, string>[])
                : current.rows,

            fileId: (Object.prototype.hasOwnProperty.call(next, 'fileId'))
                ? next.fileId
                : current.fileId,

            cid: (Object.prototype.hasOwnProperty.call(next, 'cid'))
                ? next.cid
                : current.cid,

            sizeBytes: (Object.prototype.hasOwnProperty.call(next, 'sizeBytes'))
                ? next.sizeBytes
                : current.sizeBytes,

            idbKey: (Object.prototype.hasOwnProperty.call(next, 'idbKey'))
                ? next.idbKey
                : current.idbKey,
        };

        const emitEvent = opts?.emitEvent ?? true;
        const markDirty = opts?.markDirty ?? true;

        this.item?.control?.patchValue(JSON.stringify(merged), { emitEvent });

        if (markDirty) {
            this.item?.control?.markAsDirty();
        }
    }

    get columnDefs(): ColDef[] {
        const table = this.readTable();
        return table.columnKeys.map((key, index) => ({
            field: key,
            headerName: this.buildColumnHeader(index),
            editable: !this.readonly,
            minWidth: 100,
            resizable: true,
        }));
    }

    get rowData(): Record<string, string>[] {
        return this.readTable().rows;
    }

    get options(): any {
        try {
            return this.item?.comment ? JSON.parse(this.item.comment) : {};
        } catch {
            return {};
        }
    }

    async ngOnInit(): Promise<void> {
        await this.ensureIdbStores();

        const tableValue = this.readTable();
        this.item?.control?.patchValue(JSON.stringify(tableValue), { emitEvent: false });

        this.setPreviewLimitMessage();
        this.hydrateFromFile();
    }

    ngOnChanges(_changes: SimpleChanges): void {
        //
    }

    private async loadCsvTextFromIdb(idbKey: string): Promise<string | null> {
        const record: any = await this.idb.get(this.IDB_NAME, this.FILES_STORE, idbKey);

        if (!record || !record.blob) {
            return null;
        }

        const blob: Blob = record.blob;

        const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
        const isGzip = head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b;

        if (isGzip) {
            return await this.gzip.gunzipToText(blob);
        }

        return await blob.text();
    }

    private async loadCsvTextForEdit(): Promise<string | null> {
        const table = this.readTable();

        const idbKey = (table.idbKey || '').trim();
        if (idbKey) {
            const text = await this.loadCsvTextFromIdb(idbKey);
            if (text) { return text; }
        }

        const fileId = (table.fileId || '').trim();
        if (fileId) {
            return await new Promise<string>((resolve, reject) => {
                this.artifactService.getFile(fileId).subscribe({
                    next: (csvText: string) => resolve(csvText),
                    error: (err) => reject(err),
                });
            });
        }

        if (table.columnKeys.length && table.rows.length) {
            const delimiter = this.options?.delimiter || ',';
            const file = this.csvService.toCsvFile(table.columnKeys, table.rows, 'table.csv', {
                delimiter,
                bom: false,
                mime: 'text/csv;charset=utf-8',
            });
            return await file.text();
        }

        return null;
    }

    private makePreview(
        columnKeys: string[],
        rows: Record<string, string>[],
        limitCols: number = 10,
        limitRows: number = 10
    ): { columnKeys: string[]; rows: Record<string, string>[] } {
        const previewColumnKeys = columnKeys.slice(0, Math.min(limitCols, columnKeys.length));

        const previewRows = rows.slice(0, Math.min(limitRows, rows.length)).map((row) => {
            const out: Record<string, string> = {};
            for (let i = 0; i < previewColumnKeys.length; i += 1) {
                const key = previewColumnKeys[i];
                out[key] = row[key] ?? '';
            }
            return out;
        });

        return { columnKeys: previewColumnKeys, rows: previewRows };
    }

    private buildCsvFile(
        columnKeys: string[],
        rows: Record<string, string>[],
        filename: string = 'table.csv'
    ): File {
        const delimiter = this.options?.delimiter || ',';
        return this.csvService.toCsvFile(columnKeys, rows, filename, {
            delimiter,
            bom: false,
            mime: 'text/csv;charset=utf-8',
        });
    }

    async openModal(): Promise<void> {
        let parsedColumnKeys: string[] = [];
        let parsedRows: Record<string, string>[] = [];

        try {
            const csvText = await this.loadCsvTextForEdit();

            if (csvText) {
                const delimiter = this.options?.delimiter || ',';
                const parsed = this.csvService.parseCsvToTable(csvText, delimiter);
                parsedColumnKeys = parsed.columnKeys;
                parsedRows = parsed.rows;
            } else {
                parsedColumnKeys = [];
                parsedRows = [];
            }
        } catch (e: any) {
            parsedColumnKeys = [];
            parsedRows = [];
        }

        const columnDefs: ColDef[] = parsedColumnKeys.map((key, index) => ({
            field: key,
            headerName: this.buildColumnHeader(index),
            editable: !this.readonly,
            minWidth: 100,
            resizable: true,
        }));

        const ref = this.dialog.open(TableDialogComponent, {
            header: 'Edit table',
            width: '70vw',
            data: { columnDefs, rowData: parsedRows },
        });

        ref.onClose.subscribe(async (result: any) => {
            if (!result) { return; }

            const nextColumnKeys: string[] =
                (result.columnDefs || columnDefs)
                    .map((d: ColDef) => String(d.field || '').trim())
                    .filter(Boolean);

            const nextRows: Record<string, string>[] = result.rowData || parsedRows;

            try {
                await this.ensureIdbStores();

                const csvFile = this.buildCsvFile(nextColumnKeys, nextRows);
                const sizeBytes = csvFile.size;

                const gzippedFile =
                    await this.gzip.gzip(csvFile);

                const currentValue = this.readTable();
                const existingIdbKey = (currentValue.idbKey || '').trim();
                const idbKey = existingIdbKey || this.generateFreshIdbKey();

                await this.idb.put(this.IDB_NAME, this.FILES_STORE, {
                    id: idbKey,
                    blob: gzippedFile,
                    originalName: csvFile.name,
                    originalSize: sizeBytes,
                    gzSize: gzippedFile.size,
                    delimiter: this.options?.delimiter || ',',
                    createdAt: Date.now(),
                });

                const preview = this.makePreview(nextColumnKeys, nextRows, 10, 10);

                this.writeTable({
                    columnKeys: preview.columnKeys,
                    rows: preview.rows,
                    sizeBytes,
                    idbKey,
                    fileId: undefined,
                    cid: undefined,
                });
            } catch (e: any) {
                this.writeTable({ columnKeys: nextColumnKeys, rows: nextRows });
                this.importError = e?.message || 'Failed to save table locally';
            }
        });
    }

    private generateFreshIdbKey(): string {
        const base =
            (this.item?.title || this.item?.path || this.item?.name || 'table')
                .toString()
                .trim() || 'table';

        const uid =
            (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
                ? (crypto as any).randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        return `${base}__${uid}.csv.gz`;
    }

    async onFileChange(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement | null;
        const file = input?.files?.[0];

        if (!file) {
            return;
        }

        this.isImporting = true;
        this.importError = undefined;

        try {
            await this.ensureIdbStores();

            const delimiter = this.options?.delimiter || ',';
            const csvText = await file.text();

            const parsed = this.csvService.parseCsvToTable(csvText, delimiter);

            const previewColumnCount = Math.min(10, parsed.columnKeys.length);
            const previewRowCount = Math.min(10, parsed.rows.length);

            const previewColumnKeys = parsed.columnKeys.slice(0, previewColumnCount);

            const previewRows = parsed.rows.slice(0, previewRowCount).map((row) => {
                const result: Record<string, string> = {};
                for (let index = 0; index < previewColumnKeys.length; index += 1) {
                    const key = previewColumnKeys[index];
                    result[key] = row[key] ?? '';
                }
                return result;
            });

            const gzippedFile =
                await this.gzip.gzip(file);

            const currentValue = this.readTable();
            const existingIdbKey = (currentValue.idbKey || '').trim();
            const idbKey = existingIdbKey || this.generateFreshIdbKey();

            await this.idb.put(this.IDB_NAME, this.FILES_STORE, {
                id: idbKey,
                blob: gzippedFile,
                originalName: file.name,
                originalSize: file.size,
                gzSize: gzippedFile.size,
                delimiter,
                createdAt: Date.now(),
            });

            this.writeTable({
                columnKeys: previewColumnKeys,
                rows: previewRows,
                sizeBytes: file.size,
                idbKey,
            });

            this.setPreviewLimitMessage();

        } catch (error: any) {
            this.importError = error?.message || 'Failed to import CSV';
        } finally {
            this.isImporting = false;
            if (input) {
                input.value = '';
            }
        }
    }

    public buildColumnHeader(index: number): string {
        let numberIndex = index;
        let label = '';

        for (;;) {
            label = String.fromCharCode((numberIndex % 26) + 65) + label;
            numberIndex = Math.floor(numberIndex / 26) - 1;
            if (numberIndex < 0) {
                break;
            }
        }

        return label;
    }

    private async clearIdbRecordIfAny(): Promise<void> {
        const table = this.readTable();
        const idbKey = (table.idbKey || '').trim();

        if (!idbKey) {
            return;
        }

        try {
            await this.idb.delete(this.IDB_NAME, this.FILES_STORE, idbKey);
        } catch (error) {
            console.warn('[table-field] Failed to delete IDB record:', error);
        }
    }

    async clearTable(): Promise<void> {
        this.isImporting = true;
        this.importError = undefined;

        try {
            await this.clearIdbRecordIfAny();

            this.writeTable(
                {
                    columnKeys: [],
                    rows: [],
                    fileId: undefined,
                    idbKey: undefined,
                    cid: undefined,
                    sizeBytes: undefined
                },
                { emitEvent: true, markDirty: true }
            );

            this.previewError = undefined;
        } finally {
            this.isImporting = false;
        }
    }

    private hydrateFromFile(): void {
        if (this.hydrated) {
            return;
        }

        if (!this.item || !this.item.control) {
            this.hydrated = true;
            return;
        }

        const tableValue = this.readTable();

        const hasColumns =
            Array.isArray(tableValue.columnKeys) &&
            tableValue.columnKeys.length > 0;

        const hasRows =
            Array.isArray(tableValue.rows) &&
            tableValue.rows.length > 0;

        const fileId =
            (tableValue.fileId ?? '').trim();

        if (!hasColumns && !hasRows && fileId) {
            const delimiter =
                this.options?.delimiter || ',';

            this.artifactService
                .getFileBlob(fileId)
                .subscribe({
                    next: async (blob: Blob) => {
                        try {
                            const csvText =
                                await this.gzip.gunzipToText(blob);

                            const parsed =
                                this.csvService.parseCsvToTable(
                                    csvText,
                                    delimiter
                                );

                            const sizeBytes =
                                new Blob([csvText]).size;

                            this.writeTable(
                                {
                                    columnKeys: parsed.columnKeys,
                                    rows: parsed.rows,
                                    fileId,
                                    sizeBytes
                                },
                                {
                                    emitEvent: false,
                                    markDirty: false
                                }
                            );

                            this.hydrated = true;
                        } catch {
                            this.hydrated = true;
                        }
                    },
                    error: () => {
                        this.hydrated = true;
                    }
                });

            return;
        }

        this.hydrated = true;
    }

    async downloadCsv(): Promise<void> {
        try {
            const table = this.readTable();
            let csvText: string | null = null;

            const idbKey = (table.idbKey || '').trim();
            if (idbKey) {
                csvText = await this.loadCsvTextFromIdb(idbKey);
            }

            if (!csvText && (table.fileId || '').trim()) {
                csvText = await new Promise<string>((resolve, reject) => {
                    this.artifactService.getFile(table.fileId!).subscribe({
                        next: text => resolve(text),
                        error: error => reject(error)
                    });
                });
            }

            if (!csvText) {
                const delimiter = this.options?.delimiter || ',';
                const file = this.csvService.toCsvFile(
                    table.columnKeys || [],
                    table.rows || [],
                    'table.csv',
                    { delimiter, bom: false, mime: 'text/csv;charset=utf-8' }
                );
                csvText = await file.text();
            }

            const blob = new Blob([csvText || ''], { type: 'text/csv;charset=utf-8' });
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = objectUrl;
            anchor.download = 'table.csv';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            this.importError = (error as any)?.message || 'Failed to download CSV';
        }
    }
}
