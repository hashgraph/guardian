import { Component } from '@angular/core';
import { IInnerHeaderAngularComp } from 'ag-grid-angular';
import { IHeaderParams } from 'ag-grid-community';
import { ITableFormulaActions } from './table-formula-actions';
import { TableFormulaButtonComponent } from './table-formula-button.component';

interface ITableHeaderParams extends IHeaderParams {
    formulaActions: ITableFormulaActions;
    columnKey: string;
}

@Component({
    selector: 'app-table-formula-header',
    standalone: true,
    imports: [TableFormulaButtonComponent],
    template: `<span>{{ params.displayName }}</span><app-table-formula-button [action]="params.formulaActions.column(params.columnKey)"></app-table-formula-button>`,
    styles: [':host { display: inline-flex; align-items: center; min-width: 0; }']
})
export class TableFormulaHeaderComponent implements IInnerHeaderAngularComp {
    public params: ITableHeaderParams;

    public agInit(params: ITableHeaderParams): void {
        this.params = params;
    }

    public refresh(params: ITableHeaderParams): boolean {
        this.params = params;
        return true;
    }
}
