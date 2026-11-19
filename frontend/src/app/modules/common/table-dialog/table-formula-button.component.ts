import { Component, Input } from '@angular/core';
import { ITableFormulaAction } from './table-formula-actions';

@Component({
    selector: 'app-table-formula-button',
    standalone: true,
    template: `@if (action) {
        <button type="button" class="table-fx" [attr.aria-label]="action.label" [title]="action.label"
            (mousedown)="$event.stopPropagation()" (dblclick)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()" (click)="activate($event)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M 9.9454857,2 C 8.8846136,2 7.8672114,2.421425 7.1170635,3.171575 6.3669156,3.921725 5.9454917,4.939145 5.9454917,6.000005 v 3 H 2.9455 V 11 h 2.9999917 v 7.000036 c 0,0.5304 -0.2107194,1.039049 -0.5857784,1.414199 -0.3750739,0.375 -0.8837825,0.585749 -1.4142111,0.585749 H 2.9455 v 1.99995 h 1.0000022 c 1.0608571,0 2.0782743,-0.42135 2.8284072,-1.1715 0.750148,-0.75015 1.1715718,-1.767599 1.1715718,-2.828399 V 11 H 10.945473 V 9.000005 H 7.9454812 v -3 c 0,-0.53043 0.2107194,-1.03914 0.5857934,-1.414215 C 8.9063485,4.210715 9.4150571,4.00001 9.9454857,4.00001 H 10.945473 V 2 Z m 5.2020303,14.996986 -3.311046,4.003049 h 2.594993 l 2.014,-2.43405 2.014044,2.43405 H 21.0545 L 17.743409,16.996986 21.05045,13.00001 h -2.596043 l -2.008944,2.427975 -2.00899,-2.427975 H 11.84148 Z"/></svg>
        </button>
    }`,
    styles: [`
        :host { display: inline-flex; flex-shrink: 0; vertical-align: middle; margin-left: 4px; }
        .table-fx { display: inline-flex; align-items: center; justify-content: center; width: 22px;
            height: 22px; padding: 0; border: 0; border-radius: 4px; cursor: pointer;
            background: transparent; color: var(--color-primary); }
        .table-fx svg { display: block; width: 16px; height: 16px; fill: currentColor; opacity: 0.8; }
        .table-fx:hover { background: var(--guardian-grey-background); }
        .table-fx:hover svg { opacity: 1; }
        .table-fx:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
    `]
})
export class TableFormulaButtonComponent {
    @Input() action?: ITableFormulaAction | null;

    public activate(event: Event): void {
        event.stopPropagation();
        this.action?.open(event);
    }
}
