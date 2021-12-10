import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

/**
 * Dialog for export policy.
 */
@Component({
    selector: 'export-policy-dialog',
    templateUrl: './export-policy-dialog.component.html',
    styleUrls: ['./export-policy-dialog.component.css']
})
export class ExportPolicyDialog {
    loading = true;
    policyId: any;

    policy!: any;
    schemas!: any[];
    tokens!: any[];

    constructor(
        public dialogRef: MatDialogRef<ExportPolicyDialog>,
        private policyEngineService: PolicyEngineService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.policyId = data.policyId || [];
    }

    ngOnInit() {
        this.loading = true;
        this.policyEngineService.exportPolicy(this.policyId).subscribe((data: any) => {
            this.setData(data);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    setData(data: any) {
        this.policy = data.policy;
        this.schemas = data.schemas;
        this.tokens = data.tokens;
        console.log(data);
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        this.dialogRef.close({
            schemas: this.schemas,
            tokens: this.tokens
        });
    }
}