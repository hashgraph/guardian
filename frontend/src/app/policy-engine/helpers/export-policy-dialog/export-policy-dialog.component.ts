import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ModulesService } from 'src/app/services/modules.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
/**
 * Export schema dialog.
 */
@Component({
    selector: 'export-policy-dialog',
    templateUrl: './export-policy-dialog.component.html',
    styleUrls: ['./export-policy-dialog.component.css']
})
export class ExportPolicyDialog {
    loading = true;

    policy!: any
    module!: any

    constructor(
        public dialogRef: MatDialogRef<ExportPolicyDialog>,
        private policyEngineService: PolicyEngineService,
        private modulesService: ModulesService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.policy = data.policy;
        this.module = data.module;
    }

    ngOnInit() {
        this.loading = false;
    }

    getSchemaTitle(model: any) {
        return `${model.name} (${model.version}): ${model.messageId}`;
    }

    onClose(): void {
        this.dialogRef.close(false);
    }

    saveToFile() {
        this.loading = true;
        this.policyEngineService.exportInFile(this.policy.id)
            .subscribe(fileBuffer => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(new Blob([new Uint8Array(fileBuffer)], {
                    type: 'application/guardian-policy'
                }));
                downloadLink.setAttribute('download', `policy_${Date.now()}.policy`);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, error => {
                this.loading = false;
            });
    }

    moduleToFile() {
        this.loading = true;
        this.modulesService.exportInFile(this.module.uuid)
            .subscribe(fileBuffer => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(new Blob([new Uint8Array(fileBuffer)], {
                    type: 'application/guardian-module'
                }));
                downloadLink.setAttribute('download', `module_${Date.now()}.module`);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, error => {
                this.loading = false;
            });
    }
}
