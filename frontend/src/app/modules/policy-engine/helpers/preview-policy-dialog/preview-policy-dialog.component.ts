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
    public loading = true;
    public policy!: any;
    public schemas!: string;
    public tokens!: string;
    public policyGroups!: string;
    public newVersions: any[] = [];
    public versionOfTopicId: any;
    public policies!: any[];
    public similar!: any[];
    public module!: any;
    public tool!: any;

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
            this.module = data.module?.module;
        }

        if (data.tool) {
            this.tool = data.tool?.tool;
        }

        this.policies = data.policies || [];
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