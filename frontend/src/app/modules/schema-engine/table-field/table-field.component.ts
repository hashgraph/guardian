import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { IFieldControl } from '../schema-form-model/field-form';
import { CsvService } from '../../../services/csv.service';
import {TableDialogComponent} from '../../common/table-dialog/table-dialog.component';
import {ArtifactService} from '../../../services/artifact.service';

type TableValue = {
    type: string;
    columnKeys: string[];
    rows: Record<string, string>[];
    fileId?: string;
    cid?: string;
    sizeBytes?: number;
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

    constructor(
        private dialog: DialogService,
        private csvService: CsvService,
        private artifactService: ArtifactService
    ) {}

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
            columnKeys: next.columnKeys ?? current.columnKeys,
            rows: next.rows ?? current.rows,
            fileId: next.fileId ?? current.fileId,
            sizeBytes: next.sizeBytes ?? current.sizeBytes,
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

    ngOnInit(): void {
        const tableValue = this.readTable();
        this.item?.control?.patchValue(JSON.stringify(tableValue), { emitEvent: false });

        this.hydrateFromFile();
    }

    ngOnChanges(_changes: SimpleChanges): void {
        //
    }

    openModal(): void {
        const table = this.readTable();
        const size = typeof table.sizeBytes === 'number'
            ? table.sizeBytes
            : undefined;

        if (size !== undefined && size > this.MAX_PREVIEW_BYTES) {
            this.previewError = 'File is too large for preview (>10 MB).';
            this.item?.control?.setErrors?.({ tableTooLarge: true });
            return;
        } else {
            this.previewError = undefined;

            if (this.item?.control?.errors?.tableTooLarge) {
                const { tableTooLarge, ...rest } = this.item.control.errors;
                this.item.control.setErrors(Object.keys(rest).length ? rest : null);
            }
        }

        const ref = this.dialog.open(TableDialogComponent, {
            header: this.item.title || 'Table',
            width: '70vw',
            data: {
                columnDefs: this.columnDefs,
                rowData: this.rowData,
            },
        });

        ref.onClose.subscribe((result: any) => {
            if (!result) {
                return;
            }

            const columnKeys: string[] =
                (result.columnDefs || this.columnDefs)
                    .map((d: ColDef) => String(d.field || '').trim())
                    .filter(Boolean);

            const rowData: Record<string, string>[] = result.rowData || this.rowData;

            this.writeTable({ columnKeys, rows: rowData });
        });
    }

    onFileChange(event: Event): void {
        const input = event.target as HTMLInputElement | null;
        const file = input?.files?.[0];
        if (!file) {
            return;
        }

        this.isImporting = true;
        this.importError = undefined;

        const sizeBytes = file.size;
        file.text().then((csvText: string) => {
            this.applyCsvText(csvText, sizeBytes);
        }).catch((e) => { this.importError = e?.message || 'Failed to read file'; })
            .finally(() => {
                this.isImporting = false;
                if (input) { input.value = ''; }
            });
    }

    private applyCsvText(csvText: string, sizeBytes?: number): void {
        const { columnKeys, rows } = this.csvService.parseCsvToTable(
            csvText,
            this.options.delimiter || ','
        );
        this.writeTable({ columnKeys, rows, sizeBytes });
    }

    private buildColumnHeader(index: number): string {
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

    clearTable(): void {
        this.writeTable(
            { columnKeys: [], rows: [], fileId: undefined, cid: undefined, sizeBytes: undefined },
            { emitEvent: true, markDirty: true }
        );
    }

    private hydrateFromFile(): void {
        if (this.hydrated) {
            return;
        }

        if (!this.item || !this.item.control) {
            this.hydrated = true;
            return;
        }

        const table = this.readTable();
        const hasColumns = Array.isArray(table.columnKeys) && table.columnKeys.length > 0;
        const hasRows = Array.isArray(table.rows) && table.rows.length > 0;
        const fileId = (table.fileId ?? '').trim();

        if (!hasColumns && !hasRows && fileId) {
            const delimiter = this.options?.delimiter || ',';

            this.artifactService.getFile(fileId).subscribe({
                next: (csvText: string) => {
                    const parsed = this.csvService.parseCsvToTable(csvText, delimiter);
                    const sizeBytes = new Blob([csvText]).size;

                    this.writeTable(
                        { columnKeys: parsed.columnKeys, rows: parsed.rows, fileId, sizeBytes },
                        { emitEvent: false, markDirty: false }
                    );

                    this.hydrated = true;
                },
                error: () => {
                    this.hydrated = true;
                },
            });

            return;
        }

        this.hydrated = true;
    }
}
