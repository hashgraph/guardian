import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

/**
 * Dialog for creating tokens.
 */
@Component({
    selector: 'details-log-dialog',
    templateUrl: './details-log-dialog.component.html',
    styleUrls: ['./details-log-dialog.component.css']
})
export class DetailsLogDialog {
    dataForm = this.fb.group({
        type: [''],
        datetime: [''],
        message: [''],
        attributes: [''],
    });

    constructor(
        public dialogRef: MatDialogRef<DetailsLogDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
            this.dataForm.patchValue({
                type: data.type,
                datetime: data.datetime,
                message: data.message,
                attributes: data.attributes && data.attributes.join('\r\n')
            });
    }

    ngOnInit() {
    }
}