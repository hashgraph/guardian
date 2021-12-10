import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

/**
 * Dialog for export/import policy.
 */
@Component({
    selector: 'export-import-dialog',
    templateUrl: './export-import-dialog.component.html',
    styleUrls: ['./export-import-dialog.component.css']
})
export class ExportPolicyDialog {
    loading = true;
    policyId!: any;
    policy!: any;
    schemes!: string;
    tokens!: string;

    constructor(
        public dialogRef: MatDialogRef<ExportPolicyDialog>,
        private policyEngineService: PolicyEngineService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.policyId = data.policyId;

        if(data.policy) {
            this.policy = data.policy.policy;
            this.schemes = data.policy.schemas.map((s:any)=>s.name).join(', ');
            this.tokens = data.policy.tokens.map((s:any)=>s.tokenName).join(', ');
        }
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
        this.dialogRef.close(true);
    }
}