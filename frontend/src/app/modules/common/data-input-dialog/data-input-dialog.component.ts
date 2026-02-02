import { Component, Inject } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

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
    public dataForm = new UntypedFormGroup({});
    public title: string = '';
    public fieldsConfig: any = [];
    public button: string = '';

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        const data = config.data;

        if (!data) {
            return;
        }
        this.title = data.title;
        this.button = data.button || 'Ok';
        this.fieldsConfig = data.fieldsConfig;
        this.fieldsConfig.forEach((item: any) => {
            this.dataForm.addControl(
                item.name,
                new UntypedFormControl(
                    item.initialValue,
                    item.validators
                )
            );
        });
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }
}
