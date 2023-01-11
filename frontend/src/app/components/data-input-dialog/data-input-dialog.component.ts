import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';

/**
 * Dialog for creating policy.
 */
@Component({
    selector: 'data-input-dialog',
    templateUrl: './data-input-dialog.component.html',
    styleUrls: ['./data-input-dialog.component.css'],
})
export class DataInputDialogComponent {
    dataForm = new FormGroup({});
    loading: boolean = false;

    title: string = '';
    fieldsConfig: any = [];

    constructor(
        public dialogRef: MatDialogRef<DataInputDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        if (!data) {
            return;
        }
        this.title = data.title;
        this.fieldsConfig = data.fieldsConfig;
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
        this.dialogRef.close(null);
    }
}