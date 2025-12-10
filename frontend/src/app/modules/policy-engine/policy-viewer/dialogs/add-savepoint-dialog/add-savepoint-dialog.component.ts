import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

export type AddSavepointResult =
    | { type: 'cancel' }
    | { type: 'add'; name: string };

@Component({
    selector: 'app-add-savepoint-dialog',
    templateUrl: './add-savepoint-dialog.component.html',
    styleUrls: ['./add-savepoint-dialog.component.scss'],
})
export class AddSavepointDialog {
    public name = '';

    constructor(
        private ref: DynamicDialogRef,
        private config: DynamicDialogConfig
    ) {}

    get canAdd(): boolean {
        return this.name.trim().length > 0;
    }

    onCancel(): void {
        this.ref.close(<AddSavepointResult>{ type: 'cancel' });
    }

    onAdd(): void {
        const name = this.name.trim();
        if (!name) return;
        this.ref.close(<AddSavepointResult>{ type: 'add', name });
    }
}
