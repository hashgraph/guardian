import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ColDef, GridApi } from 'ag-grid-community';

@Component({
    selector: 'app-csv-table-modal',
    templateUrl: './csv-table-modal.component.html',
    styleUrls: ['./csv-table-modal.component.scss']
})
export class CsvTableModalComponent {
    columnDefs: ColDef[] = [];
    rowData: any[] = [];
    private api?: GridApi;

    constructor(public ref: DynamicDialogRef, public cfg: DynamicDialogConfig) {
        const d = cfg?.data || {};
        this.columnDefs = d.columnDefs?.length ? d.columnDefs : [{ field: 'year' }, { field: 'value' }];
        this.rowData = d.rowData || [{ year: '', value: '' }];
    }

    onGridReady(e: any) { this.api = e.api; this.api?.sizeColumnsToFit(); }
    addRow() { const obj: any = {}; this.columnDefs.forEach(c => c.field && (obj[c.field] = '')); this.api?.applyTransaction({ add: [obj] }); }
    addCol() { const idx = this.columnDefs.length + 1; this.columnDefs = [...this.columnDefs, { field: `col${idx}`, headerName: `Column ${idx}`, editable: true }]; }
    save() {
        const rows: any[] = [];
        this.api?.forEachNode(n => n?.data && rows.push({ ...n.data }));
        this.ref.close({ columnDefs: this.columnDefs, rowData: rows.length ? rows : this.rowData });
    }
    cancel() { this.ref.close(); }
}
