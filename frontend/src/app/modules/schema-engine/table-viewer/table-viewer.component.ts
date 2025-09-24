import {ChangeDetectorRef, Component, Input, NgZone} from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { ArtifactService } from 'src/app/services/artifact.service';
import { CsvService } from 'src/app/services/csv.service';
import { TableDialogComponent } from '../../common/table-dialog/table-dialog.component';
import {finalize, switchMap, take} from 'rxjs/operators';
import {EMPTY} from "rxjs";

type TableRefLike = { type?: string; fileId?: string } | string | null | undefined;

@Component({
    selector: 'table-viewer',
    templateUrl: './table-viewer.component.html',
    styleUrls: ['./table-viewer.component.scss'],
    providers: [DialogService]
})
export class TableViewerComponent {
    @Input()
    public value: TableRefLike;

    @Input()
    public title?: string;

    public isLoading: boolean = false;
    public isDownloading = false;
    public loadError?: string;

    private readonly PREVIEW_LIMIT = 10 * 1024 * 1024;

    constructor(
        private readonly dialog: DialogService,
        private readonly artifactService: ArtifactService,
        private readonly csvService: CsvService,
        private readonly cdr: ChangeDetectorRef,
        private readonly zone: NgZone
    ) {}

    public get fileId(): string | null {
        return this.getFileIdFromValue(this.value);
    }

    public openDialog(): void {
        const id = this.fileId;
        if (!id || this.isLoading) return;

        this.isLoading = true;
        this.loadError = undefined;
        this.mark();

        this.artifactService
            .getFileBlob(id)
            .pipe(
                take(1),
                switchMap((blob: Blob) => {
                    if (blob && blob.size > this.PREVIEW_LIMIT) {
                        this.zone.run(() => {
                            const mb = (blob.size / (1024 * 1024)).toFixed(1);
                            this.loadError = `File is too large for preview (${mb} MB). Use "Download CSV" instead.`;
                            this.mark();
                        });
                        return EMPTY;
                    }
                    return this.artifactService.getFile(id).pipe(take(1));
                }),
                finalize(() => this.stop('isLoading'))
            )
            .subscribe({
                next: (csvText: string) => {
                    let parsed: { columnKeys: string[]; rows: any[] };
                    try {
                        parsed = this.csvService.parseCsvToTable(csvText, ',');
                    } catch (e: any) {
                        this.zone.run(() => {
                            this.loadError = e?.message || 'Failed to parse CSV';
                            this.mark();
                        });
                        return;
                    }

                    const columnDefinitions: ColDef[] = parsed.columnKeys.map((key: string, index: number) => ({
                        field: key,
                        colId: key,
                        headerName: this.buildColumnHeader(index),
                        editable: false,
                        minWidth: 100,
                        resizable: true
                    }));

                    this.dialog.open(TableDialogComponent, {
                        header: this.title || 'Table',
                        width: '70vw',
                        data: {
                            columnDefs: columnDefinitions,
                            rowData: parsed.rows,
                            readOnly: true
                        }
                    });
                },
                error: (err: unknown) => {
                    this.zone.run(() => {
                        this.loadError = (err as any)?.error?.message || 'Failed to load table file';
                        this.mark();
                    });
                }
            });
    }

    private isUserCancel(err: any): boolean {
        const name = err?.name;
        return name === 'AbortError' || name === 'NotAllowedError';
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
        const id = this.fileId;
        if (!id || this.isDownloading) { return; }

        this.isDownloading = true;
        this.mark();

        const w = window as any;

        if (w?.showSaveFilePicker && window.isSecureContext) {
            (async () => {
                let handle: any;
                let stream: any;

                try {
                    handle = await w.showSaveFilePicker({
                        suggestedName: `${id}.csv`,
                        types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'], 'application/octet-stream': ['.csv'] } }]
                    });
                } catch (e: any) {
                    if (this.isUserCancel(e)) { this.stop('isDownloading'); return; }
                }

                try {
                    if (handle) {
                        stream = await handle.createWritable();
                        this.artifactService
                            .getFileBlob(id)
                            .pipe(
                                take(1),
                                finalize(() => this.stop('isDownloading'))
                            )
                            .subscribe({
                                next: async (resp: any) => {
                                    const blob: Blob = resp instanceof Blob ? resp : (resp?.body as Blob);
                                    await stream.write(blob);
                                    await stream.close();
                                },
                                error: (err: unknown) => {
                                    this.zone.run(() => {
                                        this.loadError = (err as any)?.error?.message || 'Failed to download CSV';
                                        this.mark();
                                    });
                                    // tslint:disable-next-line:no-unused-expression
                                    try { stream && stream.close && stream.close(); } catch {}
                                }
                            });
                        return;
                    }
                } catch {
                    // tslint:disable-next-line:no-unused-expression
                    try { stream && stream.close && stream.close(); } catch {}
                }
            })().catch(() => this.stop('isDownloading'));
            return;
        }

        this.artifactService
            .getFileBlob(id)
            .pipe(
                take(1),
                finalize(() => this.stop('isDownloading'))
            )
            .subscribe({
                next: (resp: any) => {
                    const blob: Blob = resp instanceof Blob ? resp : (resp?.body as Blob);
                    const objectUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = `${id}.csv`.replace(/"/g, '');
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

    private buildColumnHeader(index: number): string {
        let numberIndex = index;
        let label = '';

        for (;;) {
            const code = (numberIndex % 26) + 65;
            label = String.fromCharCode(code) + label;
            numberIndex = Math.floor(numberIndex / 26) - 1;

            if (numberIndex < 0) {
                break;
            }
        }

        return label;
    }
}
