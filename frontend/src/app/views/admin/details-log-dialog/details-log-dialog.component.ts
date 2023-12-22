import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Dialog for creating tokens.
 */
@Component({
    selector: 'details-log-dialog',
    templateUrl: './details-log-dialog.component.html',
    styleUrls: ['./details-log-dialog.component.scss']
})
export class DetailsLogDialog {
    dataForm = this.fb.group({
        type: [''],
        datetime: [''],
        message: [''],
        attributes: [''],
    });

    constructor(
        public dialogRef: DynamicDialogRef, private dialogConfig: DynamicDialogConfig,
        private fb: FormBuilder) {
            this.dataForm.patchValue({
                type: dialogConfig.data.type,
                datetime: dialogConfig.data.datetime,
                message: dialogConfig.data.message,
                attributes: dialogConfig.data.attributes && dialogConfig.data.attributes.join('\r\n')
            });
    }

    ngOnInit() {
    }
}
