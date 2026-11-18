import { Component, Input } from '@angular/core';
import { ITableFormulaAction } from './table-formula-actions';

@Component({
    selector: 'app-table-formula-button',
    standalone: true,
    template: `@if (action) {
        <button type="button" class="table-fx" [attr.aria-label]="action.label" [title]="action.label"
            (mousedown)="$event.stopPropagation()" (dblclick)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()" (click)="activate($event)">ƒx</button>
    }`,
    styles: [`
        :host { display: inline-flex; vertical-align: middle; margin-left: 4px; }
        .table-fx { display: inline-flex; align-items: center; justify-content: center; width: 24px;
            height: 24px; padding: 0; border: 0; border-radius: 4px; cursor: pointer; font-size: 12px;
            font-style: italic; background: transparent; color: var(--guardian-primary-color, #4169e2); }
        .table-fx:hover { background: var(--guardian-grey-background, #f0f3f9); }
        .table-fx:focus-visible { outline: 2px solid var(--guardian-primary-color, #4169e2); outline-offset: 1px; }
    `]
})
export class TableFormulaButtonComponent {
    @Input() action?: ITableFormulaAction | null;

    public activate(event: Event): void {
        event.stopPropagation();
        this.action?.open(event);
    }
}
