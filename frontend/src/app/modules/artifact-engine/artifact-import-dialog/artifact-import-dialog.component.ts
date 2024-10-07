import { Component, Inject } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { PolicyType } from '@guardian/interfaces';

/**
 * Import Artifacts Dialog.
 */
@Component({
    selector: 'artifact-import-dialog',
    templateUrl: './artifact-import-dialog.component.html',
    styleUrls: ['./artifact-import-dialog.component.css']
})
export class ArtifactImportDialog {
    public policyId = this.fb.control('', [Validators.required]);
    public policies: any = [];

    constructor(
        public dialogRef: MatDialogRef<ArtifactImportDialog>,
        private fb: UntypedFormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        if (data) {
            this.policies = data.policies?.filter((policy: any) => policy.status === PolicyType.DRAFT) || [];
            const current = this.policies.find((policy: any) => policy.id === data.policyId);
            this.policyId.patchValue(current?.id || '');
        }
    }

    importFiles(event: any) {
        if (this.policyId.valid) {
            this.dialogRef.close({
                files: event,
                policyId: this.policyId.value
            });
        }
    }

    onNoClick(): void {
        this.dialogRef.close(false);
    }
}
