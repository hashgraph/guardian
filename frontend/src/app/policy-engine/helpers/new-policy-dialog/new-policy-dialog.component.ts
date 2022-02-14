import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

/**
 * Dialog for creating policy.
 */
@Component({
    selector: 'new-policy-dialog',
    templateUrl: './new-policy-dialog.component.html',
    styleUrls: ['./new-policy-dialog.component.css']
})
export class NewPolicyDialog {
    started = false;
    dataForm = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        topicDescription: [''],
        policyTag: ['', Validators.required],
    });

    constructor(
        public dialogRef: MatDialogRef<NewPolicyDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            data.policyTag = data.policyTag.replace(/\s/g, '');
            this.dialogRef.close(data);
        }
    }
}
