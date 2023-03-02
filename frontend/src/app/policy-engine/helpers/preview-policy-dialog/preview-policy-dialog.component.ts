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
    policy!: any;
    schemas!: string;
    tokens!: string;
    policyGroups!: string;
    newVersions: any[] = [];
    versionOfTopicId: any;
    policies!: any[];

    module!: any;

    public innerWidth: any;
    public innerHeight: any;

    constructor(
        public dialogRef: MatDialogRef<PreviewPolicyDialog>,
        private policyEngineService: PolicyEngineService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        if (data.policy) {
            this.newVersions = data.policy.newVersions || [];
            this.policy = data.policy.policy;

            this.policyGroups = '';
            if (this.policy.policyRoles) {
                this.policyGroups += this.policy.policyRoles.join(', ');
            }

            const schemas = data.policy.schemas || [];
            const tokens = data.policy.tokens || [];

            this.schemas = schemas.map((s: any) => {
                if (s.version) {
                    return `${s.name} (${s.version})`;
                }
                return s.name;
            }).join(', ');
            this.tokens = tokens.map((s: any) => s.tokenName).join(', ');

            this.policies = this.data.policies || [];
        }

        if (data.module) {
            this.module = data.module.module;
        }
    }

    ngOnInit() {
        this.innerWidth = window.innerWidth;
        this.innerHeight = window.innerHeight;
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