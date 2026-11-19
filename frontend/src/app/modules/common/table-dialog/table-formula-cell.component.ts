import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { ITableFormulaAction, ITableFormulaActions } from './table-formula-actions';
import { TableFormulaButtonComponent } from './table-formula-button.component';

interface ITableCellParams extends ICellRendererParams {
    formulaActions: ITableFormulaActions;
    columnKey: string;
}

@Component({
    selector: 'app-table-formula-cell',
    standalone: true,
    imports: [TableFormulaButtonComponent],
    template: `<span>{{ value }}</span><app-table-formula-button [action]="action"></app-table-formula-button>`,
    styles: [':host { display: flex; align-items: center; height: 100%; min-width: 0; max-width: 100%; overflow: hidden; } span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }']
})
export class TableFormulaCellComponent implements ICellRendererAngularComp {
    public value: unknown;
    public action: ITableFormulaAction | null;

    public agInit(params: ITableCellParams): void {
        this.refresh(params);
    }

    public refresh(params: ITableCellParams): boolean {
        this.value = params.valueFormatted ?? params.value;
        this.action = params.formulaActions.cell?.(params.columnKey, params.node.sourceRowIndex) ?? null;
        return true;
    }
}
