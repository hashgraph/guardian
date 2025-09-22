import { CommonModule } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input, NgZone } from '@angular/core';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { ButtonModule } from 'primeng/button';
import { finalize, take } from 'rxjs';

import { CsvService } from '@services/csv.service';
import { ArtifactsService } from '@services/artifacts.service';
import { TableDialogComponent } from '../../dialogs/table-dialog/table-dialog.component';

@Component({
    selector: 'app-table-viewer',
    standalone: true,
    imports: [CommonModule, ButtonModule, DynamicDialogModule],
    templateUrl: './table-viewer.component.html',
    styleUrls: ['./table-viewer.component.scss'],
    providers: [DialogService]
})
export class TableViewerComponent {
    @Input() public value: any;
    @Input() public title?: string;
    @Input() public analytics?: any;

    public isLoading = false;
    public isDownloading = false;
    public loadError?: string;

    constructor(
        private readonly dialog: DialogService,
        private readonly csv: CsvService,
        private readonly artifacts: ArtifactsService,
        private readonly cdr: ChangeDetectorRef,
        private readonly zone: NgZone
    ) {}

    public get fileId(): string | null {
        const cid: string | undefined = this.value?.cid;
        const tableFiles: Record<string, string> | undefined = this.analytics?.tableFiles;
        const raw = cid && tableFiles ? tableFiles[cid] : undefined;
        return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
    }

    public openDialog(): void {
        const id = this.fileId;
        if (!id || this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.loadError = undefined;
        this.mark();

        this.artifacts
            .getFileText(id)
            .pipe(
                take(1),
                finalize(() => this.stop('isLoading'))
            )
            .subscribe({
                next: (resp: HttpResponse<string>) => {
                    const csvText = resp.body ?? '';
                    const parsed = this.csv.parseCsvToTable(csvText, ',');

                    const columnDefs: ColDef[] = parsed.columnKeys.map((key: string, i: number) => ({
                        field: key,
                        colId: key,
                        headerName: this.excelHeader(i),
                        editable: false,
                        minWidth: 100,
                        resizable: true
                    }));

                    this.dialog.open(TableDialogComponent, {
                        header: this.title || 'Table',
                        width: '70vw',
                        data: { columnDefs, rowData: parsed.rows, readonly: true }
                    });
                },
                error: (err: unknown) => {
                    this.zone.run(() => {
                        this.isLoading = false;
                        this.loadError = (err as any)?.error?.message || 'Failed to load table file';
                        this.mark();
                    });
                }
            });
    }

    public downloadCsv(): void {
        const id = this.fileId;
        if (!id || this.isDownloading) {
            return;
        }

        this.isDownloading = true;
        this.mark();

        this.artifacts
            .getFileBlob(id)
            .pipe(
                take(1),
                finalize(() => this.stop('isDownloading'))
            )
            .subscribe({
                next: async (resp: HttpResponse<Blob>) => {
                    const blob = new Blob([resp.body ?? new Blob([])], { type: 'text/csv;charset=utf-8' });
                    const suggested = this.filenameFromDisposition(resp) ?? `${id}.csv`;

                    const w = window as any;
                    if (w.showSaveFilePicker) {
                        try {
                            const handle = await w.showSaveFilePicker({
                                suggestedName: suggested,
                                types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }]
                            });
                            const stream = await handle.createWritable();
                            await stream.write(blob);
                            await stream.close();
                            return;
                        } catch (e: any) {
                            if (this.isUserCancel(e)) {
                                return;
                            }
                        }
                    }

                    const objectUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = suggested;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(objectUrl);
                },
                error: (err: unknown) => {
                    this.zone.run(() => {
                        this.loadError = (err as any)?.error?.message || 'Failed to download CSV';
                        this.mark();
                    });
                }
            });
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

    private filenameFromDisposition(resp: HttpResponse<any>): string | null {
        const header = resp.headers.get('content-disposition') || '';
        const m = header.match(/filename\*?=(?:UTF-8''|")?([^;"']+)/i);
        return m && m[1] ? m[1].replace(/"/g, '').trim() : null;
    }

    private isUserCancel(err: any): boolean {
        const name = err?.name;
        return name === 'AbortError' || name === 'NotAllowedError' || name === 'SecurityError';
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
}
