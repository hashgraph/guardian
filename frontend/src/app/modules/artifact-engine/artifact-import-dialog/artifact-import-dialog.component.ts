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
    public parentId = this.fb.control('', [Validators.required]);
    public policies: any = [];
    public tools: any = [];
    public currentId: string = '';
    public type: string = 'policy';

    constructor(
        public dialogRef: MatDialogRef<ArtifactImportDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        if (data) {
            this.type = data.type || 'policy';
            this.currentId = data.currentId || '';
            this.policies = data.policies || [];
            this.tools = data.tools || [];
            this.parentId.patchValue(this.currentId);
        }
    }

    importFiles(event: any) {
        if (this.parentId.valid) {
            this.dialogRef.close({
                files: event,
                currentId: this.parentId.value
            });
        }
    }
}
