import { Component, Input } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { ArtifactService } from 'src/app/services/artifact.service';
import { CsvService } from 'src/app/services/csv.service';
import { TableDialogComponent } from '../../common/table-dialog/table-dialog.component';

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
    public loadError?: string;

    constructor(
        private readonly dialog: DialogService,
        private readonly artifactService: ArtifactService,
        private readonly csvService: CsvService
    ) {}

    public get fileId(): string | null {
        return this.getFileIdFromValue(this.value);
    }

    public openDialog(): void {
        const fileId = this.fileId;

        if (!fileId) {
            return;
        }

        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.loadError = undefined;

        this.artifactService.getFile(fileId).subscribe({
            next: (csvText: string) => {
                this.isLoading = false;

                const parsed = this.csvService.parseCsvToTable(csvText, ',');

                const columnDefinitions: ColDef[] = parsed.columnKeys.map((key: string, index: number) => {
                    const definition: ColDef = {
                        field: key,
                        colId: key,
                        headerName: this.buildColumnHeader(index),
                        editable: false,
                        minWidth: 100,
                        resizable: true
                    };
                    return definition;
                });

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
                this.isLoading = false;
                const message = (err as any)?.error?.message || 'Failed to load table file';
                this.loadError = String(message);
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
                typeof obj['type'] === 'string' &&
                obj['type'].toLowerCase() === 'table';

            const hasFileId =
                typeof obj['fileId'] === 'string' &&
                (obj['fileId'] as string).trim().length > 0;

            if (isTableType && hasFileId) {
                const id = (obj['fileId'] as string).trim();
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
