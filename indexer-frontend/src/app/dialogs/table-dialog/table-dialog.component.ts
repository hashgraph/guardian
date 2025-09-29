import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AgGridModule } from 'ag-grid-angular';
import {
    AllCommunityModule,
    BodyScrollEvent,
    CellEditingStoppedEvent,
    ColDef,
    GridApi,
    GridReadyEvent,
    ModuleRegistry,
    themeQuartz
} from 'ag-grid-community';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Reusable AG Grid modal dialog.
 * When `readonly = true`, editing is disabled and "Save" is hidden.
 */
@Component({
    selector: 'app-table-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        AgGridModule
    ],
    templateUrl: './table-dialog.component.html',
    styleUrls: ['./table-dialog.component.scss']
})
export class TableDialogComponent implements OnInit {
    public theme = themeQuartz.withParams({
        rowHeight: 42,
        headerHeight: 48
    });

    public readonly: boolean = true;
    public errorMessage?: string;

    private dataColumnDefs: ColDef[] = [];

    public get columnDefs(): ColDef[] {
        return [this.rowNumberCol, ...this.dataColumnDefs];
    }

    public rowData: any[] = [];

    public defaultColDef: ColDef = {
        editable: false,
        resizable: true,
        minWidth: 100
    };

    private api?: GridApi;

    private readonly initialRows: number = 100;
    private readonly initialCols: number = 26;
    private readonly rowGrowChunk: number = 100;
    private readonly colGrowChunk: number = 10;
    private readonly growThreshold: number = 10;

    private readonly rowNumberCol: ColDef = {
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
        valueGetter: params => (params.node?.rowIndex ?? 0) + 1,
        cellClass: 'row-number-cell',
        headerClass: 'row-number-header'
    };

    constructor(
        private readonly ref: DynamicDialogRef,
        private readonly config: DynamicDialogConfig
    ) {}

    public ngOnInit(): void {
        const data = (this.config?.data ?? {}) as {
            columnDefs?: ColDef[];
            rowData?: any[];
            readonly?: boolean;
            error?: string;
        };

        this.readonly = data.readonly ?? true;
        this.errorMessage = data.error;

        this.defaultColDef = {
            ...this.defaultColDef,
            editable: !this.readonly
        };

        if (Array.isArray(data.columnDefs) && data.columnDefs.length > 0) {
            this.dataColumnDefs = data.columnDefs.map((c: ColDef) => {
                return {
                    ...c,
                    editable: !this.readonly
                };
            });
        }

        if (Array.isArray(data.rowData) && data.rowData.length > 0) {
            this.rowData = data.rowData.map((r: any) => {
                return { ...r };
            });
        }

        if (!this.errorMessage && (this.dataColumnDefs.length === 0 || this.rowData.length === 0)) {
            this.initializeBlank(this.initialRows, this.initialCols);
        }
    }

    public onGridReady(event: GridReadyEvent): void {
        this.api = event.api;

        // Allow grid to size columns after first paint
        setTimeout(() => {
            this.api?.sizeColumnsToFit();
        }, 0);
    }

    public onCellEditingStopped(event: CellEditingStoppedEvent): void {
        if (this.readonly) {
            return;
        }

        const rowIndex: number = event.rowIndex ?? 0;
        const colIndex: number = this.getColumnIndexByKey(event.column.getColId());

        if (rowIndex >= this.rowData.length - 1) {
            this.ensureSize(this.rowData.length + this.rowGrowChunk, this.dataColumnDefs.length);
        }

        if (colIndex >= this.dataColumnDefs.length - 1) {
            this.ensureSize(this.rowData.length, this.dataColumnDefs.length + this.colGrowChunk);
        }
    }

    public onBodyScroll(_event: BodyScrollEvent): void {
        if (this.readonly || !this.api) {
            return;
        }

        const lastIdx: number = this.api.getLastDisplayedRowIndex() ?? (this.rowData.length - 1);

        if (lastIdx >= this.rowData.length - this.growThreshold) {
            this.ensureSize(this.rowData.length + this.rowGrowChunk, this.dataColumnDefs.length);
        }

        const displayed: any[] = (this.api as any).getDisplayedCenterColumns?.() ?? [];
        const rightMost: any = displayed[displayed.length - 1];

        if (rightMost) {
            const idx: number = this.getColumnIndexByKey(rightMost.getColId());

            if (idx >= this.dataColumnDefs.length - this.growThreshold) {
                this.ensureSize(this.rowData.length, this.dataColumnDefs.length + this.colGrowChunk);
            }
        }
    }

    public onCancel(): void {
        this.ref.close(null);
    }

    public onSave(): void {
        if (this.readonly) {
            this.ref.close(null);
            return;
        }

        this.api?.stopEditing();

        this.ref.close({
            columnDefs: this.dataColumnDefs,
            rowData: this.rowData
        });
    }

    // ---------- Private helpers ----------

    private initializeBlank(rows: number, cols: number): void {
        this.dataColumnDefs = Array.from({ length: cols }, (_: unknown, i: number) => {
            return this.createColDef(i);
        });

        this.rowData = Array.from({ length: rows }, () => {
            return this.createEmptyRow();
        });
    }

    private ensureSize(minRows: number, minCols: number): void {
        if (minCols > this.dataColumnDefs.length) {
            const start: number = this.dataColumnDefs.length;

            for (let i: number = start; i < minCols; i += 1) {
                this.dataColumnDefs.push(this.createColDef(i));
            }

            this.api?.setGridOption('columnDefs', this.columnDefs);

            for (const row of this.rowData) {
                for (let i: number = start; i < minCols; i += 1) {
                    const key: string = this.getColumnKey(i);
                    if (typeof row[key] === 'undefined') {
                        row[key] = '';
                    }
                }
            }
        }

        if (minRows > this.rowData.length) {
            const extraRows: any[] = Array.from({ length: minRows - this.rowData.length }, () => {
                return this.createEmptyRow();
            });

            this.rowData = this.rowData.concat(extraRows);
            this.api?.setGridOption('rowData', this.rowData);
        }
    }

    private createColDef(index: number): ColDef {
        const key: string = this.getColumnKey(index);

        return {
            field: key,
            colId: key,
            headerName: this.getColumnHeaderName(index),
            editable: !this.readonly
        };
    }

    private createEmptyRow(): any {
        const obj: any = {};

        for (let i: number = 0; i < this.dataColumnDefs.length; i += 1) {
            obj[this.getColumnKey(i)] = '';
        }

        return obj;
    }

    private getColumnHeaderName(index: number): string {
        let n: number = index;
        let label: string = '';

        for (;;) {
            label = String.fromCharCode((n % 26) + 65) + label;
            n = Math.floor(n / 26) - 1;

            if (n < 0) {
                break;
            }
        }

        return label;
    }

    private getColumnKey(index: number): string {
        return `C${index + 1}`;
    }

    private getColumnIndexByKey(key: string): number {
        return parseInt(key.slice(1), 10) - 1;
    }
}
