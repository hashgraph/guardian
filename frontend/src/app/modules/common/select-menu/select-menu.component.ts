import { Component, EventEmitter, Inject, Input, Output, SimpleChanges } from '@angular/core';

/**
 * Select menu.
 */
@Component({
    selector: 'select-menu-button',
    templateUrl: './select-menu.component.html',
    styleUrls: ['./select-menu.component.css']
})
export class SelectMenuButton {
    @Input('options') options!: {
        id: string,
        title: string,
        description: string,
        color: string
    }[];
    @Output('action') action = new EventEmitter<any>();

    constructor() {
    }

    onAction(item: any) {
        this.action.emit(item);
    }

    onClick()  {
        this.action.emit(null);
    }
}