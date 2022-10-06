import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
  policyId = this.fb.control('', [Validators.required]);
  policies: any = [];

  constructor(
    public dialogRef: MatDialogRef<ArtifactImportDialog>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any) {
    if (data) {
      this.policyId.patchValue(data.policyId || '');
      this.policies = data.policies?.filter((policy: any) => policy.status === PolicyType.DRAFT) || [];
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
}
