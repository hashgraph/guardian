import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Dialog for export/import policy.
 */
@Component({
    selector: 'preview-policy-dialog',
    templateUrl: './preview-policy-dialog.component.html',
    styleUrls: ['./preview-policy-dialog.component.scss'],
})
export class PreviewPolicyDialog {
    public loading = true;
    public policy!: any;
    public schemas!: string;
    public tokens!: string;
    public tools!: string;
    public policyGroups!: string;
    public newVersions: any[] = [];
    public versionOfTopicId: any;
    public policies!: any[];
    public similar!: any[];
    public module!: any;
    public tool!: any;
    public xlsx!: any;
    public errors!: any;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        if (this.config.data.policy) {
            const importFile = this.config.data.policy;

            this.newVersions = importFile.newVersions || [];
            this.policy = importFile.policy;

            this.policyGroups = '';
            if (this.policy.policyRoles) {
                this.policyGroups += this.policy.policyRoles.join(', ');
            }

            const schemas = importFile.schemas || [];
            const tokens = importFile.tokens || [];

            this.schemas = schemas
                .map((s: any) => {
                    if (s.version) {
                        return `${s.name} (${s.version})`;
                    }
                    return s.name;
                })
                .join(', ');
            this.tokens = tokens.map((s: any) => s.tokenName).join(', ');

            const similar = importFile.similar || [];
            this.similar = similar
                .map((s: any) => {
                    if (s.version) {
                        return `${s.name} (${s.version})`;
                    }
                    return s.name;
                })
                .join(', ');
        }

        if (this.config.data.module) {
            this.module = this.config.data.module.module;
        }

        if (this.config.data.tool) {
            this.tool = this.config.data.tool?.tool;
        }

        if (this.config.data.xlsx) {
            this.xlsx = this.config.data.xlsx;
            const schemas = this.xlsx.schemas || [];
            this.schemas = schemas
                .map((s: any) => {
                    if (s.version) {
                        return `${s.name} (${s.version})`;
                    }
                    return s.name;
                })
                .join(', ');

                const tools = this.xlsx.tools || [];
                this.tools = tools
                    .map((s: any) => {
                        return s.name;
                    })
                    .join(', ');

                tools
            this.errors = this.xlsx.errors || [];
            for (const error of this.errors) {
                if (error.cell) {
                    error.__path = `Cell: ${error.cell}`;
                } else if (error.row) {
                    error.__path = `Row: ${error.row}`;
                } else if (error.col) {
                    error.__path = `Col: ${error.col}`;
                }
            }
        }

        this.policies = this.config.data.policies || [];
    }

    ngOnInit() {
        this.loading = false;
    }

    setData(data: any) {
    }

    onClose(): void {
        this.ref.close(false);
    }

    onImport() {
        this.ref.close({
            versionOfTopicId: this.versionOfTopicId,
        });
    }

    onNewVersionClick(messageId: string) {
        this.ref.close({
            messageId,
        });
    }
}
