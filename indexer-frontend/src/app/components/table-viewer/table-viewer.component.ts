import { CommonModule } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { ButtonModule } from 'primeng/button';

import { CsvService } from '../../services/csv.service';
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
    public loadError?: string;

    private readonly filesUrl = '/api/v1/artifacts/files';

    constructor(
        private readonly http: HttpClient,
        private readonly dialog: DialogService,
        private readonly csv: CsvService
    ) {}

    public get fileId(): string | null {
        const cid = this.value?.cid;
        const map = this.analytics?.tableFiles;
        return map[cid].trim();
    }

    public openDialog(): void {
        const fileId = this.fileId;

        if (!fileId || this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.loadError = undefined;

        const url = `${this.filesUrl}/${encodeURIComponent(fileId)}`;

        this.http.get(url, { responseType: 'text', observe: 'response' }).subscribe({
            next: (resp: HttpResponse<string>) => {
                this.isLoading = false;

                const csvText = resp.body ?? '';
                const parsed = this.csv.parseCsvToTable(csvText, ',');

                const columnDefs: ColDef[] = parsed.columnKeys.map((key: string, index: number) => ({
                    field: key,
                    colId: key,
                    headerName: this.headerFromIndex(index),
                    editable: false,
                    minWidth: 100,
                    resizable: true
                }));

                this.dialog.open(TableDialogComponent, {
                    header: this.title || 'Table',
                    width: '70vw',
                    data: {
                        columnDefs,
                        rowData: parsed.rows,
                        readonly: true
                    }
                });
            },
            error: (err: unknown) => {
                this.isLoading = false;
                this.loadError = (err as any)?.error?.message || 'Failed to load table file';
            }
        });
    }

    private headerFromIndex(index: number): string {
        let n = index;
        let label = '';
        for (;;) {
            label = String.fromCharCode((n % 26) + 65) + label;
            n = Math.floor(n / 26) - 1;
            if (n < 0) {
                break
            }
        }
        return label;
    }
}
