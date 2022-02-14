import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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

    constructor(
        public dialogRef: MatDialogRef<ExportPolicyDialog>,
        private policyEngineService: PolicyEngineService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.policy = data.policy;
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
            .subscribe(result => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(result);
                downloadLink.setAttribute('download', `policy_${Date.now()}.zip`);
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
