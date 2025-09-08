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

    private colName(index: number): string {
        let n = index;
        let s = '';
        while (true) {
            s = String.fromCharCode((n % 26) + 65) + s;
            n = Math.floor(n / 26) - 1;
            if (n < 0) {
                break;
            }
        }
        return s;
    }

    private colKey(i: number): string {
        return `C${i + 1}`;
    }

    importCsv(file?: File): void {
        if (!file) {
            return;
        }

        Papa.parse<string[]>(file, {
            header: false,
            delimiter: this.options.delimiter || ',',
            skipEmptyLines: true,
            worker: true,
            complete: (res) => {
                const rows: string[][] = (res.data as unknown as string[][]) ?? [];
                const maxCols = rows.reduce<number>((max, r) => Math.max(max, r?.length ?? 0), 0);

                this.columnDefs = Array.from({ length: maxCols }, (_, i) => ({
                    field: this.colKey(i),
                    headerName: this.colName(i),
                    editable: true,
                    minWidth: 100,
                    resizable: true,
                }));

                this.rowData = rows.map((r) => {
                    const obj: Record<string, string> = {};
                    for (let i = 0; i < maxCols; i++) {
                        obj[this.colKey(i)] = r?.[i] ?? '';
                    }
                    return obj;
                });
            },
            error: (err) => {
                console.error('CSV parse error:', err);
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
            if (!v) {
                return
            }

            this.columnDefs = v.columnDefs || this.columnDefs;
            this.rowData = v.rowData || this.rowData;
        });
    }

    toCsvBlob(): Blob {
        const header = this.options.header !== false;
        const fields = (this.columnDefs || []).map((c) => c.field as string);
        const rows = (this.rowData || []).map((r) => {
            const obj: any = {};

            for (const f of fields) {
                obj[f] = r[f]
            };

            return obj;
        });

        const csv = Papa.unparse(rows, {
            delimiter: this.options.delimiter || ',',
            header: false,
            columns: fields as any,
        });
        return new Blob([csv], { type: 'text/csv;charset=utf-8' });
    }

    getFileId() {
        return this.fileId;
    }
    setFileId(id?: string | null) {
        this.fileId = id ?? null;
    }
}
