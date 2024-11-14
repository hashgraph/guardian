import { Component, Inject } from '@angular/core';
// import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

/**
 * Dialog for creating policy.
 */
@Component({
    selector: 'data-input-dialog',
    templateUrl: './data-input-dialog.component.html',
    styleUrls: ['./data-input-dialog.component.css'],
})
export class DataInputDialogComponent {
    dataForm = new UntypedFormGroup({});
    loading: boolean = false;

    title: string = '';
    fieldsConfig: any = [];

    isVisible: boolean = true;

    constructor(
        // public dialogRef: MatDialogRef<DataInputDialogComponent>,
        // @Inject(MAT_DIALOG_DATA) public data: any
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        const data = config.data;

        if (!data) {
            return;
        }
        this.title = data.title;
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
