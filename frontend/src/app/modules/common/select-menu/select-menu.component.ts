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
        color: string,
        permissions?: number,
    }[];
    @Input() permissions?: number;
    @Output('action') action = new EventEmitter<any>();

    constructor() {
    }

    onAction(item: any) {
        this.action.emit(item);
    }

    onClick()  {
        this.action.emit(null);
    }

    hasPermissions(index: number | undefined) {
        if (index === undefined || this.permissions === undefined) {
            return true;
        }
        if (!Number.isFinite(index) || !Number.isFinite(this.permissions)) {
            return true;
        }
        if (index < 0 || this.permissions < 0) {
            return true;
        }
        return (this.permissions >> index) % 2 != 0;
    }
}