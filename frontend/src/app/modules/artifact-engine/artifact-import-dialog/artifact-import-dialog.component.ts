import { Component, Inject } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { PolicyType } from '@guardian/interfaces';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

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
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
        private fb: UntypedFormBuilder
    ) {
        const data = this.config.data

        if (data) {
            this.policies = data.policies?.filter((policy: any) => policy.status === PolicyType.DRAFT) || [];
            const current = this.policies.find((policy: any) => policy.id === data.policyId);
            this.policyId.patchValue(current ? { label: current.name, value: current.id } : null);
        }
    }

    importFiles(event: any) {
        if (this.policyId.valid) {
            this.dialogRef.close({
                files: event,
                policyId: this.policyId.value?.value
            });
        }
    }

    onNoClick(): void {
        this.dialogRef.close(false);
    }

    getPolicyOptions(): any[] {
        return this.policies.map((policy: any) => ({
            label: policy.name,
            value: policy.id
        }));
    }
}
