import {Component, OnInit} from '@angular/core';
import {
    BodyScrollEvent, CellEditingStoppedEvent, ColDef, GridApi, GridReadyEvent,
    ModuleRegistry, AllCommunityModule, themeQuartz
} from 'ag-grid-community';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
    selector: 'app-csv-table-modal',
    templateUrl: './csv-table-modal.component.html',
    styleUrls: ['./csv-table-modal.component.scss']
})
export class CsvTableModalComponent implements OnInit {
    theme = themeQuartz.withParams({ rowHeight: 42, headerHeight: 48 });

    private dataColumnDefs: ColDef[] = [];

    get columnDefs(): ColDef[] { return [this.rowNumberCol, ...this.dataColumnDefs]; }

    rowData: any[] = [];
    defaultColDef: ColDef = { editable: true, resizable: true, minWidth: 100 };

    private api?: GridApi;

    private initRows = 100;
    private initCols = 26;
    private rowGrowChunk = 100;
    private colGrowChunk = 10;
    private growThreshold = 10;

    private rowNumberCol: ColDef = {
        headerName: '№',
        colId: '__row__',
        width: 48,
        minWidth: 48,
        maxWidth: 60,
        pinned: 'left',
        suppressMovable: true,
        resizable: false,
        suppressSizeToFit: true,
        editable: false,
        sortable: false,
        filter: false,
        menuTabs: [],
        valueGetter: p => (p.node?.rowIndex ?? 0) + 1,
        cellClass: 'row-number-cell',
        headerClass: 'row-number-header'
    };

    constructor(
        private ref: DynamicDialogRef,
        private config: DynamicDialogConfig
    ) {}

    ngOnInit(): void {
        const data = (this.config?.data ?? {}) as { columnDefs?: ColDef[]; rowData?: any[] };

        if (data.columnDefs?.length) {
            this.dataColumnDefs = data.columnDefs.map(c => ({ ...c }));
        }
        if (data.rowData?.length) {
            this.rowData = data.rowData.map(r => ({ ...r }));
        }

        if (!this.dataColumnDefs.length || !this.rowData.length) {
            this.initBlank(this.initRows, this.initCols);
        }
    }

    onGridReady(e: GridReadyEvent): void {
        this.api = e.api;
        setTimeout(() => this.api?.sizeColumnsToFit(), 0);
    }

    onPasteStart(ev: any): void {
        const data: any[][] = ev?.data || [];
        if (!Array.isArray(data) || !data.length) { return; }
        const rows = data.length;
        const cols = Math.max(...data.map(r => r.length));
        const startRow = ev?.target?.rowIndex ?? 0;
        const startColKey = ev?.target?.column?.getColId?.() as string | undefined;
        const startCol = startColKey ? this.colIndexByKey(startColKey) : 0;
        this.ensureSize(startRow + rows, startCol + cols);
    }

    onCellEditStop(ev: CellEditingStoppedEvent): void {
        const r = ev.rowIndex ?? 0;
        const c = this.colIndexByKey(ev.column.getColId());
        if (r >= this.rowData.length - 1) {
            this.ensureSize(this.rowData.length + this.rowGrowChunk, this.dataColumnDefs.length);
        }
        if (c >= this.dataColumnDefs.length - 1) {
            this.ensureSize(this.rowData.length, this.dataColumnDefs.length + this.colGrowChunk);
        }
    }

    onBodyScroll(_ev: BodyScrollEvent): void {
        if (!this.api) { return; }
        const lastIdx = this.api.getLastDisplayedRowIndex() ?? (this.rowData.length - 1);
        if (lastIdx >= this.rowData.length - this.growThreshold) {
            this.ensureSize(this.rowData.length + this.rowGrowChunk, this.dataColumnDefs.length);
        }

        const displayed: any[] = (this.api as any).getDisplayedCenterColumns?.() ?? [];
        const rightMost = displayed[displayed.length - 1];
        if (rightMost) {
            const idx = this.colIndexByKey(rightMost.getColId());
            if (idx >= this.dataColumnDefs.length - this.growThreshold) {
                this.ensureSize(this.rowData.length, this.dataColumnDefs.length + this.colGrowChunk);
            }
        }
    }

    private initBlank(rows: number, cols: number): void {
        this.dataColumnDefs = Array.from({ length: cols }, (_, i) => this.makeColDef(i));
        this.rowData = Array.from({ length: rows }, () => this.makeEmptyRow());
    }

    private ensureSize(minRows: number, minCols: number): void {

        if (minCols > this.dataColumnDefs.length) {
            const start = this.dataColumnDefs.length;
            for (let i = start; i < minCols; i++) {
                this.dataColumnDefs.push(this.makeColDef(i));
            }
            this.api?.setGridOption('columnDefs', this.columnDefs);

            for (const row of this.rowData) {
                for (let i = start; i < minCols; i++) {
                    row[this.colKey(i)] ??= '';
                }
            }
        }

        if (minRows > this.rowData.length) {
            const extra = Array.from({ length: minRows - this.rowData.length }, () => this.makeEmptyRow());
            this.rowData = this.rowData.concat(extra);
            this.api?.setGridOption('rowData', this.rowData);
        }
    }

    private makeColDef(i: number): ColDef {
        const key = this.colKey(i);
        return { field: key, colId: key, headerName: this.colName(i), editable: true };
    }

    private makeEmptyRow(): any {
        const obj: any = {};
        for (let i = 0; i < this.dataColumnDefs.length; i++) { obj[this.colKey(i)] = ''; }
        return obj;
    }

    private colName(index: number): string {
        let n = index;
        let s = '';
        for (;;) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; if (n < 0) { break; } }
        return s;
    }

    private colKey(i: number): string { return `C${i + 1}`; }
    private colIndexByKey(key: string): number { return parseInt(key.slice(1), 10) - 1; }

    cancel(): void {
        this.ref.close(null);
    }

    save(): void {
        this.api?.stopEditing();
        this.ref.close({
            columnDefs: this.dataColumnDefs,
            rowData: this.rowData
        });
    }
}
