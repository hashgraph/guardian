import { CommonModule } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';

import { CsvService } from '../../services/csv.service';
import { TableDialogComponent } from '../../dialogs/table-dialog/table-dialog.component';

/**
 * TableViewerComponent
 *
 * Standalone container that:
 *  - Receives a schema-form "item" (with .value already resolved by SchemaFormView)
 *  - Detects a node with shape { type: 'table', fileId: '<id>' } inside item.value
 *  - Downloads CSV from GridFS: GET /api/artifacts/files/:fileId
 *  - Parses CSV via CsvService
 *  - Opens read-only AG Grid modal for preview
 *
 * UI:
 *  - "Download CSV" button (enabled when fileId is found)
 *  - "Preview table" button (enabled only after successful download)
 *  - "Save CSV" button (client-side save of the downloaded CSV)
 */
@Component({
    selector: 'app-table-viewer',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        DynamicDialogModule
    ],
    templateUrl: './table-viewer.component.html',
    styleUrls: ['./table-viewer.component.scss'],
    providers: [DialogService]
})
export class TableViewerComponent implements OnChanges {
    /**
     * Full schema-form item. We only need .value and some meta for the header.
     * Example of .value:
     *   { type: 'table', fileId: '6661f61a8f...' }
     */
    @Input()
    public item: any;

    private readonly apiUrlPrefix: string = '/api/artifacts/files';

    public fileId: string | null = null;

    public isDownloading: boolean = false;
    public hasDownloaded: boolean = false;

    public downloadedCsvText?: string;
    public parsedColumnDefs: ColDef[] = [];
    public parsedRows: Record<string, string>[] = [];

    public downloadFileName: string = 'table.csv';
    public downloadError?: string;

    constructor(
        private readonly http: HttpClient,
        private readonly dialog: DialogService,
        private readonly csv: CsvService
    ) {}

    /**
     * Re-evaluate fileId whenever the bound item changes.
     */
    public ngOnChanges(_: SimpleChanges): void {
        const value: unknown = this.item?.value;
        this.fileId = this.findFileId(value);
    }

    /**
     * Returns a user-facing title for the dialog.
     */
    public getHeader(): string {
        const fromItem: string =
            (this.item?.title || this.item?.description || this.item?.name || '').toString().trim();

        return fromItem || 'Table';
    }

    /**
     * Trigger CSV download from GridFS. After success, "Preview" and "Save" become enabled.
     */
    public onDownloadClick(): void {
        if (!this.fileId) {
            return;
        }

        this.isDownloading = true;
        this.downloadError = undefined;

        const url: string = `${this.apiUrlPrefix}/${encodeURIComponent(this.fileId.trim())}`;

        this.http.get(url, { responseType: 'text', observe: 'response' }).subscribe({
            next: (resp: HttpResponse<string>) => {
                this.isDownloading = false;
                this.hasDownloaded = true;

                this.downloadedCsvText = resp.body ?? '';
                this.downloadFileName = this.extractFilename(resp) ?? 'table.csv';

                const parsed = this.csv.parseCsvToTable(this.downloadedCsvText, ',');
                this.parsedColumnDefs = parsed.columnKeys.map((key: string, index: number) => {
                    return {
                        field: key,
                        colId: key,
                        headerName: this.excelLikeHeader(index),
                        editable: false,
                        resizable: true,
                        minWidth: 100
                    } as ColDef;
                });
                this.parsedRows = parsed.rows;
            },
            error: (err: unknown) => {
                this.isDownloading = false;
                this.hasDownloaded = false;

                this.downloadedCsvText = undefined;
                this.parsedColumnDefs = [];
                this.parsedRows = [];

                this.downloadError = (err as any)?.message || 'Failed to download CSV file.';
            }
        });
    }

    /**
     * Open read-only modal with parsed data.
     */
    public onPreviewClick(): void {
        if (!this.hasDownloaded || this.parsedColumnDefs.length === 0) {
            return;
        }

        this.dialog.open(TableDialogComponent, {
            header: this.getHeader(),
            width: '70vw',
            data: {
                columnDefs: this.parsedColumnDefs,
                rowData: this.parsedRows,
                readonly: true
            }
        });
    }

    /**
     * Save the downloaded CSV to a file on the client.
     */
    public onSaveCsvClick(): void {
        if (!this.hasDownloaded || !this.downloadedCsvText) {
            return;
        }

        const blob: Blob = new Blob([this.downloadedCsvText], { type: 'text/csv;charset=utf-8' });
        const objectUrl: string = window.URL.createObjectURL(blob);

        const anchor: HTMLAnchorElement = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = this.downloadFileName;

        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        window.URL.revokeObjectURL(objectUrl);
    }

    // ---------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------

    /**
     * Find a nested node with shape { type: 'table', fileId: '<id>' }.
     */
    private findFileId(root: unknown): string | null {
        try {
            return this.walkAndFindFileId(root);
        } catch {
            return null;
        }
    }

    /**
     * Depth-first search through objects/arrays to detect fileId.
     */
    private walkAndFindFileId(node: unknown): string | null {
        if (node === null || node === undefined) {
            return null;
        }

        if (Array.isArray(node)) {
            for (const element of node) {
                const found: string | null = this.walkAndFindFileId(element);
                if (found) {
                    return found;
                }
            }
            return null;
        }

        if (typeof node === 'object') {
            const obj: Record<string, unknown> = node as Record<string, unknown>;

            const isTable: boolean =
                obj?.['type'] === 'table' &&
                typeof obj?.['fileId'] === 'string' &&
                Boolean((obj['fileId'] as string).trim());

            if (isTable) {
                return (obj['fileId'] as string).trim();
            }

            for (const key of Object.keys(obj)) {
                const found: string | null = this.walkAndFindFileId(obj[key]);
                if (found) {
                    return found;
                }
            }

            return null;
        }

        // If it's a string that looks like JSON, try parse and continue.
        if (typeof node === 'string') {
            const text: string = node.trim();
            if (text.startsWith('{') || text.startsWith('[')) {
                try {
                    const parsed: unknown = JSON.parse(text);
                    return this.walkAndFindFileId(parsed);
                } catch {
                    return null;
                }
            }
        }

        return null;
    }

    /**
     * Build Excel-like headers: A, B, ..., Z, AA, AB, ...
     */
    private excelLikeHeader(index: number): string {
        let n: number = index;
        let label: string = '';

        for (;;) {
            const charCode: number = (n % 26) + 65;
            label = String.fromCharCode(charCode) + label;
            n = Math.floor(n / 26) - 1;

            if (n < 0) {
                break;
            }
        }

        return label;
    }

    /**
     * Naive parser for `Content-Disposition: attachment; filename="..."`.
     */
    private extractFilename(resp: HttpResponse<string>): string | null {
        const header: string | null = resp.headers.get('content-disposition');

        if (!header) {
            return null;
        }

        const match: RegExpMatchArray | null = header.match(/filename\*?=(?:UTF-8''|")?([^;"']+)/i);
        if (match && match[1]) {
            return match[1].replace(/"/g, '').trim();
        }

        return null;
    }
}
