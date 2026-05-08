import { Component } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

export interface SavePolicyTestRecordResult {
    name: string;
    description: string;
}

@Component({
    selector: 'save-policy-test-record-dialog',
    templateUrl: './save-policy-test-record-dialog.component.html',
    styleUrls: ['./save-policy-test-record-dialog.component.scss']
})
export class SavePolicyTestRecordDialog {
    public dataForm = this.fb.group({
        name: [this.config.data?.name || '', Validators.required],
        description: [this.config.data?.description || '']
    });

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: UntypedFormBuilder,
    ) {
    }

    public onCancel(): void {
        this.dialogRef.close(null);
    }

    public onSubmit(): void {
        if (this.dataForm.invalid) {
            return;
        }

        const value = this.dataForm.value;
        const name = String(value.name || '').trim();
        const description = String(value.description || '').trim();

        if (!name) {
            return;
        }

        this.dialogRef.close({
            name,
            description
        });
    }
}
