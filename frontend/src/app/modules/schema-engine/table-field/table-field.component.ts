import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { IFieldControl } from '../schema-form-model/field-form';
import { CsvService } from '../../../services/csv.service';
import {TableDialogComponent} from '../../common/table-dialog/table-dialog.component';

type TableValue = {
    type: string;
    columnKeys: string[];
    rows: Record<string, string>[];
    fileId?: string;
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

    constructor(
        private dialog: DialogService,
        private csvService: CsvService
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

    private writeTable(next: Partial<TableValue>): void {
        const current = this.readTable();
        const merged: TableValue = {
            type: 'table',
            columnKeys: next.columnKeys ?? current.columnKeys,
            rows: next.rows ?? current.rows,
            fileId: next.fileId ?? current.fileId,
        };

        this.item?.control?.patchValue(JSON.stringify(merged), { emitEvent: true });
        this.item?.control?.markAsDirty();
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
    }

    ngOnChanges(_changes: SimpleChanges): void {}

    openModal(): void {
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

        file.text().then((csvText: string) => {
            this.applyCsvText(csvText);
        });
    }

    private applyCsvText(csvText: string): void {
        const { columnKeys, rows } = this.csvService.parseCsvToTable(
            csvText,
            this.options.delimiter || ','
        );
        this.writeTable({ columnKeys, rows });
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
}
