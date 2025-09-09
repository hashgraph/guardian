import { Component, Input } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { IFieldControl } from '../schema-form-model/field-form';
import { CsvService } from '../../../services/csv.service';
import {TableDialogComponent} from '../../common/table-dialog/table-dialog.component';

@Component({
    selector: 'table-field',
    templateUrl: './table-field.component.html',
    styleUrls: ['./table-field.component.scss'],
    providers: [DialogService],
})
export class TableFieldComponent {
    @Input() item!: IFieldControl<any>;
    @Input() readonly: boolean = false;

    rowData: Record<string, string>[] = [];
    columnDefs: ColDef[] = [];

    private fileId: string | null = null;

    constructor(
        private dialog: DialogService,
        private csvService: CsvService
    ) {}

    // ngOnInit(): void {
    //     console.log('init')
    // }

    get options(): any {
        try {
            return this.item?.comment ? JSON.parse(this.item.comment) : {};
        } catch {
            return {};
        }
    }

    onFileChange(event: Event): void {
        const input = event.target as HTMLInputElement | null;
        const file = input?.files && input.files.length > 0 ? input.files[0] : undefined;

        if (!file) {
            return;
        }

        file.text().then((csvText: string) => {
            this.applyCsvText(csvText);
        });
    }

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

            this.columnDefs = result.columnDefs || this.columnDefs;
            this.rowData = result.rowData || this.rowData;
        });
    }

    toCsvBlob(): Blob {
        const columnKeys: string[] = (this.columnDefs || []).map((def: ColDef) => def.field as string);

        const csvText: string = this.csvService.buildCsvFromTable(
            columnKeys,
            this.rowData,
            this.options.delimiter || ','
        );

        return new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    }

    getFileId(): string | null {
        return this.fileId;
    }

    setFileId(id?: string | null): void {
        this.fileId = id ?? null;
    }

    private applyCsvText(csvText: string): void {
        const { columnKeys, rows } = this.csvService.parseCsvToTable(
            csvText,
            this.options.delimiter || ','
        );

        this.columnDefs = columnKeys.map((key: string, index: number) => {
            return {
                field: key,
                headerName: this.buildColumnHeader(index),
                editable: !this.readonly,
                minWidth: 100,
                resizable: true,
            } as ColDef;
        });

        this.rowData = rows;
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
