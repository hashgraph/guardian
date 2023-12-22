import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

/**
 * Dialog for creating policy.
 */
@Component({
    selector: 'data-input-dialog',
    templateUrl: './data-input-dialog.component.html',
    styleUrls: ['./data-input-dialog.component.scss'],
})
export class DataInputDialogComponent {
    dataForm = new FormGroup({});
    loading: boolean = false;

    title: string = '';
    fieldsConfig: any = [];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
    ) {
        if (!config) {
            return;
        }

        this.title = config.data.title;
        this.fieldsConfig = config.data.fieldsConfig;
        this.fieldsConfig.forEach((item: any) => {
            this.dataForm.addControl(
                item.name,
                new FormControl(
                    item.initialValue,
                    item.required ? Validators.required : null
                )
            );
        });
    }

    onNoClick(): void {
        this.ref.close(null);
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.ref.close(data);
        }
    }
}
