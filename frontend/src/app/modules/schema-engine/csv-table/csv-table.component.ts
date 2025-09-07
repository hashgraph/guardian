import { Component, Input } from '@angular/core';
import Papa from 'papaparse';
import { DialogService } from 'primeng/dynamicdialog';
import { ColDef } from 'ag-grid-community';
import { IFieldControl } from '../schema-form-model/field-form';
import { CsvTableModalComponent } from '../csv-table-modal/csv-table-modal.component';

@Component({
    selector: 'csv-table',
    templateUrl: './csv-table.component.html',
    styleUrls: ['./csv-table.component.scss'],
    providers: [DialogService],
})
export class CsvTableComponent {
    @Input() item!: IFieldControl<any>;
    @Input() readonly = false;

    rowData: any[] = [];
    columnDefs: ColDef[] = [];
    private fileId: string | null = null;

    constructor(private dialog: DialogService) {}

    get options(): any {
        try {
            return this.item?.comment ? JSON.parse(this.item.comment) : {};
        } catch {
            return {};
        }
    }

    onFileChange(e: Event) {
        const input = e.target as HTMLInputElement | null;
        const file = input?.files && input.files.length ? input.files[0] : undefined;
        this.importCsv(file);
    }

    importCsv(file?: File) {
        if (!file) return;
        Papa.parse(file, {
            header: this.options.header !== false,
            delimiter: this.options.delimiter || ',',
            skipEmptyLines: true,
            complete: (res) => {
                const rows: any[] = res.data as any[];
                const fields =
                    (res.meta?.fields as string[]) || Object.keys(rows[0] || {});
                this.columnDefs = fields.map((f) => ({
                    field: f,
                    headerName: f,
                    editable: true,
                }));
                this.rowData = rows;
            },
        });
    }

    openModal() {
        const ref = this.dialog.open(CsvTableModalComponent, {
            header: this.item.title || 'Table',
            width: '70vw',
            data: { columnDefs: this.columnDefs, rowData: this.rowData },
        });
        ref.onClose.subscribe((v: any) => {
            if (!v) return;
            this.columnDefs = v.columnDefs || this.columnDefs;
            this.rowData = v.rowData || this.rowData;
        });
    }

    toCsvBlob(): Blob {
        const header = this.options.header !== false;
        const fields = (this.columnDefs || []).map((c) => c.field as string);
        const rows = (this.rowData || []).map((r) => {
            const obj: any = {};
            for (const f of fields) obj[f] = r[f];
            return obj;
        });
        const csv = Papa.unparse(rows, { delimiter: this.options.delimiter || ',', header });
        return new Blob([csv], { type: 'text/csv;charset=utf-8' });
    }

    getFileId() {
        return this.fileId;
    }
    setFileId(id?: string | null) {
        this.fileId = id ?? null;
    }
}
