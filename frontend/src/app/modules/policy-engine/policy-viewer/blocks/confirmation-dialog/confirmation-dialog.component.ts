import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Dialog allowing you to select a file and load schemes.
 */
@Component({
    selector: 'confirmation-dialog',
    templateUrl: './confirmation-dialog.component.html',
    styleUrls: ['./confirmation-dialog.component.scss'],
})
export class ConfirmationDialog {
    value: FormControl = new FormControl('', Validators.required);
    title: string = '';
    description?: string;
    descriptions?: string[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.title = this.config.data.title;
        if (Array.isArray(this.config.data.description)) {
            this.descriptions = this.config.data.description;
        } else {
            this.description = this.config.data.description;
        }
    }

    ngOnInit() {
    }

    onNoClick(): void {
        this.ref.close(null);
    }

    onSubmit() {
        if (this.value.invalid) {
            return;
        }
        this.ref.close(this.value.value);
    }
}
