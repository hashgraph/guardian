import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

/**
 * Dialog for export/import policy.
 */
@Component({
    selector: 'preview-policy-dialog',
    templateUrl: './preview-policy-dialog.component.html',
    styleUrls: ['./preview-policy-dialog.component.css']
})
export class PreviewPolicyDialog {
    loading = true;
    policyId!: any;
    policy!: any;
    schemas!: string;
    tokens!: string;
    policyGroups!: string;
    newVersions: any[] = [];

    versionOfTopicId: any;
    policies: any[];

    constructor(
        public dialogRef: MatDialogRef<PreviewPolicyDialog>,
        private policyEngineService: PolicyEngineService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.policyId = data.policyId;

        if (data.policy) {
            this.newVersions = data.policy.newVersions || [];
            this.policy = data.policy.policy;

            this.policyGroups = '';
            if (this.policy.policyRoles) {
                this.policyGroups += this.policy.policyRoles.join(', ');
            }
            // if (this.policy.policyGroups) {
            //     if (this.policyGroups) {
            //         this.policyGroups += ', ';
            //     }
            //     this.policyGroups += this.policy.policyGroups.join(', ');
            // }

            const schemas = data.policy.schemas || [];
            const tokens = data.policy.tokens || [];

            this.schemas = schemas.map((s: any) => {
                if (s.version) {
                    return `${s.name} (${s.version})`;
                }
                return s.name;
            }).join(', ');
            this.tokens = tokens.map((s: any) => s.tokenName).join(', ');
        }

        this.policies = this.data.policies || [];
    }

    ngOnInit() {
        this.loading = false;
    }

    setData(data: any) {
    }

    onClose(): void {
        this.dialogRef.close(false);
    }

    onImport() {
        this.dialogRef.close({
            versionOfTopicId: this.versionOfTopicId
        });
    }

    onNewVersionClick(messageId: string) {
        this.dialogRef.close({
            messageId
        });
    }
}