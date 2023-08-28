import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

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
    similar!: any[];
    module!: any;

    public innerWidth: any;
    public innerHeight: any;

    constructor(
        public dialogRef: MatDialogRef<PreviewPolicyDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        if (data.policy) {
            const importFile = data.policy;

            this.newVersions = importFile.newVersions || [];
            this.policy = importFile.policy;

            this.policyGroups = '';
            if (this.policy.policyRoles) {
                this.policyGroups += this.policy.policyRoles.join(', ');
            }

            const schemas = importFile.schemas || [];
            const tokens = importFile.tokens || [];

            this.schemas = schemas.map((s: any) => {
                if (s.version) {
                    return `${s.name} (${s.version})`;
                }
                return s.name;
            }).join(', ');
            this.tokens = tokens.map((s: any) => s.tokenName).join(', ');

            const similar = importFile.similar || [];
            this.similar = similar.map((s: any) => {
                if (s.version) {
                    return `${s.name} (${s.version})`;
                }
                return s.name;
            }).join(', ');
        }

        if (data.module) {
            this.module = data.module.module;
        }

        this.policies = data.policies || [];
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